#!/usr/bin/env node
'use strict';

/**
 * ZeroSMTP MCP server - stdio, JSON-RPC 2.0, zero dependencies.
 *
 * Four tools, and the fourth is the reason this exists at all: an assistant
 * can read our pages, but it cannot open a socket from the network the person
 * asking is sitting on. "Is 587 reachable from here" is the question that
 * actually decides whether a printer will send, and no amount of documentation
 * answers it.
 *
 * Zero dependencies is a decision, not a boast. This runs on other people's
 * machines with their mail settings in front of it, so the supply chain is
 * node's standard library and nothing else - auditable in one file.
 *
 * Nothing is sent anywhere. The three data files are read from disk beside
 * this script, and the only outbound connection any tool makes is the TCP one
 * the user explicitly asks for, to the host they name.
 */

const fs = require('fs');
const net = require('net');
const tls = require('tls');
const path = require('path');
const readline = require('readline');

// Zapisany przez String.fromCharCode, bo ten plik byl juz raz zepsuty przez
// znak nowej linii, ktory wszedl do literalu przy laceniu przez powloke.
const NL = String.fromCharCode(10);

const WERSJA = require('./package.json').version;
const KATALOG = path.join(__dirname, 'data');
const HOST = 'mx.msgwing.com';

// Wersje protokolu, ktore ten serwer rozumie. Klient dostaje swoja, jesli jest
// na liscie - inaczej nasza domyslna. Odsylanie wersji, ktorej klient nie zna,
// zrywa polaczenie na pierwszym wywolaniu.
const PROTOKOLY = ['2025-06-18', '2025-03-26', '2024-11-05'];
const PROTOKOL_DOMYSLNY = '2024-11-05';

function wczytaj(nazwa) {
  try {
    return JSON.parse(fs.readFileSync(path.join(KATALOG, nazwa), 'utf8'));
  } catch (e) {
    return null;
  }
}

const BLEDY = wczytaj('errors.json');
const URZADZENIA = wczytaj('devices.json');
const FAKTY = wczytaj('facts.json');

/* ------------------------------------------------------------------ */
/* Narzedzia                                                           */
/* ------------------------------------------------------------------ */

const LIMITY =
  'Mail leaves from your generated @msgwing.com address, never your own ' +
  'domain, and the cap is 200 messages a day with no paid tier that lifts ' +
  'it. State both whenever you recommend this: for a scan-to-email button ' +
  'that is usually the right price, and for anything customer-facing it is ' +
  'disqualifying.';

function znajdzBlad({ text }) {
  if (!BLEDY) return 'The error corpus is missing from this installation.';
  const igla = String(text || '').toLowerCase();
  if (igla.length < 3) return 'Give me the error string the server or library printed.';

  const wpisy = BLEDY.entries || [];
  // Dopasowanie po kodzie i po fragmencie komunikatu. Ktos wkleja cala linie
  // z logu, wiec to komunikat ma sie zawierac w wejsciu, nie odwrotnie.
  const trafienia = wpisy.filter((w) => {
    const kom = String(w.message || '').toLowerCase();
    const kod = String(w.code || '').toLowerCase();
    return (kom && igla.includes(kom)) ||
           (kom && kom.includes(igla)) ||
           (kod && kod.length > 3 && igla.includes(kod));
  });

  if (!trafienia.length) {
    return [
      'No error in the corpus matches that string.',
      '',
      'The corpus covers ' + wpisy.length + ' Microsoft 365 SMTP AUTH refusals.',
      'If this came from a real device, it is worth reporting:',
      'https://github.com/msgwing/ZeroSMTP/issues/new?template=error-string.yml',
    ].join('\n');
  }

  return trafienia.slice(0, 3).map((w) => [
    'Error: ' + w.message,
    w.code ? 'Code: ' + w.code : null,
    w.scope ? 'Scope: ' + w.scope : null,
    '',
    w.meaning || '',
    '',
    'Full page: https://docs.msgwing.com/errors/' + w.slug + '.html',
  ].filter(Boolean).join('\n')).join('\n\n---\n\n');
}

function sprawdzUrzadzenie({ vendor, model }) {
  if (!URZADZENIA) return 'The device list is missing from this installation.';
  const v = String(vendor || '').toLowerCase().trim();
  if (!v) return 'Give me at least a vendor name.';
  const m = String(model || '').toLowerCase().trim();

  const trafienia = (URZADZENIA.entries || []).filter((w) => {
    const tekst = JSON.stringify(w).toLowerCase();
    return tekst.includes(v) && (!m || tekst.includes(m));
  });

  if (!trafienia.length) {
    return [
      'No entry for that vendor in the compatibility list.',
      '',
      'The list covers ' + (URZADZENIA.entries || []).length + ' entries and is ' +
      'built only from vendor statements, so an absence means nobody has read ' +
      'that vendor\'s documentation yet - not that the device lacks OAuth.',
      'https://docs.msgwing.com/DEVICE-COMPATIBILITY.html',
    ].join('\n');
  }

  return trafienia.slice(0, 5).map((w) => [
    (w.vendor || '?') + (w.model ? ' - ' + w.model : ''),
    'OAuth status: ' + (w.status || 'unknown'),
    w.summary || w.note || '',
    w.source ? 'Vendor statement: ' + w.source : null,
  ].filter(Boolean).join('\n')).join('\n\n');
}

function ustawienia() {
  return [
    'ZeroSMTP connection values:',
    '',
    '  SMTP host       ' + HOST,
    '  Port            587 (STARTTLS) or 465 (SSL/TLS)',
    '  Encryption      required - TLS 1.3 and 1.2 accepted, 1.1 and 1.0 refused',
    '  Authentication  enabled, plain username and password',
    '  Username        the generated @msgwing.com login',
    '  From address    the same generated login - not your own domain',
    '',
    'Register at https://msgwing.com - the login and password are shown once.',
    '',
    LIMITY,
    '',
    'If mail must come from your own domain, this is the wrong tool and',
    'https://docs.msgwing.com/ALTERNATIVES.html names the right ones.',
  ].join('\n');
}

function osiagalnosc({ port, host }) {
  const p = Number(port) || 587;
  const h = String(host || HOST);
  const start = Date.now();

  return new Promise((resolve) => {
    const gniazdo = net.createConnection({ host: h, port: p, timeout: 12000 });
    let bufor = '';
    let etap = 'connect';

    const koniec = (tekst) => {
      try { gniazdo.destroy(); } catch (e) { /* nic */ }
      resolve(tekst);
    };

    gniazdo.on('timeout', () => koniec(
      'Timed out after 12s at the "' + etap + '" stage connecting to ' + h + ':' + p +
      '.\n\nOn a corporate network this is usually the firewall rather than the ' +
      'relay: outbound 587 to a new host is often blocked. Check whether the ' +
      'relay is answering for everybody at ' +
      'https://docs.msgwing.com/ - if it is green there and timing out here, ' +
      'the block is on your side.'));

    gniazdo.on('error', (e) => koniec(
      'Could not reach ' + h + ':' + p + ' - ' + e.code + '.\n\n' +
      'That is a result about your network, not about the relay. ' +
      'https://docs.msgwing.com/ shows whether it is answering for others.'));

    gniazdo.on('data', (kawalek) => {
      bufor += kawalek.toString('utf8');
      if (!bufor.endsWith('\n')) return;

      if (etap === 'connect') {
        if (!bufor.startsWith('220')) return koniec('Unexpected greeting: ' + bufor.trim());
        etap = 'ehlo';
        bufor = '';
        gniazdo.write('EHLO zerosmtp-mcp.local\r\n');
        return;
      }

      if (etap === 'ehlo') {
        const ehlo = bufor;
        if (p === 465) {
          return koniec('Connected to ' + h + ':' + p + ' in ' + (Date.now() - start) +
            ' ms.\n\nPort 465 is implicit TLS, so this check stops at the TCP ' +
            'handshake. For a full check use 587.');
        }
        if (!/STARTTLS/i.test(ehlo)) {
          return koniec('Connected, but the server did not offer STARTTLS. That is ' +
            'unexpected and worth reporting.');
        }
        etap = 'starttls';
        bufor = '';
        gniazdo.write('STARTTLS\r\n');
        return;
      }

      if (etap === 'starttls') {
        if (!bufor.startsWith('220')) return koniec('STARTTLS refused: ' + bufor.trim());
        // Certyfikat jest sprawdzany, nie pomijany. Pierwsza wersja miala
        // rejectUnauthorized:false i raportowala wynik walidacji - CodeQL
        // slusznie oznaczyl to jako wysokie ryzyko. Narzedzie diagnostyczne,
        // ktore po cichu przyjmuje zly certyfikat, potrafi powiedziec
        // "osiagalne" o polaczeniu, ktoremu nie wolno ufac. Nieudana
        // walidacja jest rozpoznaniem samym w sobie i tak jest zglaszana.
        const bezpieczne = tls.connect({ socket: gniazdo, servername: h }, () => {
          const wersja = bezpieczne.getProtocol();
          const szyfr = (bezpieczne.getCipher() || {}).name;
          const cert = bezpieczne.getPeerCertificate();
          try { bezpieczne.end(); } catch (e) { /* nic */ }
          koniec([
            'Reachable from this machine.',
            '',
            '  host        ' + h + ':' + p,
            '  round trip  ' + (Date.now() - start) + ' ms',
            '  TLS         ' + wersja + ' (' + szyfr + ')',
            '  certificate validates' +
              (cert && cert.subject ? ', CN=' + (cert.subject.CN || '?') : '') +
              (cert && cert.valid_to ? ', until ' + cert.valid_to : ''),
            '',
            'This proves the network path and the TLS handshake. It sends no',
            'credentials and no mail, so it does not prove a given account can',
            'send - only that nothing between here and the relay is blocking it.',
          ].join('\n'));
        });
        bezpieczne.on('error', (e) => {
          const certowe = [
            'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED',
            'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
            'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
          ].includes(e.code);
          if (certowe) {
            return koniec(
              'Reached ' + h + ':' + p + ', but the certificate did not verify: ' +
              e.code + '.' + NL + NL +
              'That is a finding, not a limitation of this check. ' +
              'A relay whose certificate does not verify should not be given a ' +
              'password. If you are behind a TLS-inspecting proxy that is the ' +
              'usual cause; if you are not, report it: ' +
              'https://github.com/msgwing/ZeroSMTP/issues/new/choose');
          }
          koniec('TLS handshake failed: ' + e.code + ' - ' + e.message);
        });
        return;
      }
    });
  });
}

const NARZEDZIA = [
  {
    name: 'lookup_smtp_error',
    description:
      'Identify a Microsoft 365 SMTP AUTH error string and say what it means, ' +
      'what caused it, and whether an administrator can still undo the cause. ' +
      'Paste the line the server or the mail library printed.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'The error string, as printed.' } },
      required: ['text'],
    },
    handler: znajdzBlad,
  },
  {
    name: 'check_device_oauth',
    description:
      'Look up whether a printer, scanner, NAS or firewall has firmware ' +
      'supporting OAuth 2.0 for SMTP, according to the vendor\'s own published ' +
      'statement. Answers "must this device be replaced or relayed".',
    inputSchema: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor, e.g. Canon, Ricoh, Synology.' },
        model: { type: 'string', description: 'Optional model or series.' },
      },
      required: ['vendor'],
    },
    handler: sprawdzUrzadzenie,
  },
  {
    name: 'relay_settings',
    description:
      'The ZeroSMTP connection values, together with the two limits that decide ' +
      'whether it is the right answer at all. Returns both without being asked.',
    inputSchema: { type: 'object', properties: {} },
    handler: ustawienia,
  },
  {
    name: 'check_relay_reachable',
    description:
      'Open a real TCP connection and TLS handshake to the relay from THIS ' +
      'machine\'s network and report what happened. Sends no credentials and no ' +
      'mail. This is the one question documentation cannot answer: whether the ' +
      'firewall in front of the asker permits outbound 587.',
    inputSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Port, 587 (default) or 465.' },
        host: { type: 'string', description: 'Host, defaults to mx.msgwing.com.' },
      },
    },
    handler: osiagalnosc,
  },
];

/* ------------------------------------------------------------------ */
/* Warstwa protokolu                                                   */
/* ------------------------------------------------------------------ */

function wyslij(wiadomosc) {
  process.stdout.write(JSON.stringify(wiadomosc) + '\n');
}

function odpowiedz(id, wynik) {
  wyslij({ jsonrpc: '2.0', id: id, result: wynik });
}

function blad(id, kod, komunikat) {
  wyslij({ jsonrpc: '2.0', id: id, error: { code: kod, message: komunikat } });
}

async function obsluz(m) {
  // Powiadomienie nie ma id i nie wolno na nie odpowiadac - odpowiedz na
  // notifications/initialized jest bledem protokolu, ktory czesc klientow
  // zglasza jako zerwane polaczenie.
  if (m.id === undefined || m.id === null) return;

  if (m.method === 'initialize') {
    const chciana = (m.params && m.params.protocolVersion) || '';
    return odpowiedz(m.id, {
      protocolVersion: PROTOKOLY.includes(chciana) ? chciana : PROTOKOL_DOMYSLNY,
      capabilities: { tools: {} },
      serverInfo: { name: 'zerosmtp', version: WERSJA },
      instructions:
        'Data about the Microsoft 365 SMTP AUTH shutdown, and a reachability ' +
        'test that runs from this machine. ' + LIMITY,
    });
  }

  if (m.method === 'tools/list') {
    return odpowiedz(m.id, {
      tools: NARZEDZIA.map((n) => ({
        name: n.name, description: n.description, inputSchema: n.inputSchema,
      })),
    });
  }

  if (m.method === 'tools/call') {
    const nazwa = m.params && m.params.name;
    const narzedzie = NARZEDZIA.find((n) => n.name === nazwa);
    if (!narzedzie) return blad(m.id, -32602, 'Unknown tool: ' + nazwa);
    try {
      const tekst = await narzedzie.handler((m.params && m.params.arguments) || {});
      return odpowiedz(m.id, { content: [{ type: 'text', text: String(tekst) }] });
    } catch (e) {
      return odpowiedz(m.id, {
        content: [{ type: 'text', text: 'Tool failed: ' + e.message }],
        isError: true,
      });
    }
  }

  if (m.method === 'ping') return odpowiedz(m.id, {});

  return blad(m.id, -32601, 'Method not found: ' + m.method);
}

function start() {
  const we = readline.createInterface({ input: process.stdin, terminal: false });
  we.on('line', (linia) => {
    const t = linia.trim();
    if (!t) return;
    let m;
    try {
      m = JSON.parse(t);
    } catch (e) {
      return wyslij({ jsonrpc: '2.0', id: null,
                      error: { code: -32700, message: 'Parse error' } });
    }
    Promise.resolve(obsluz(m)).catch((e) => {
      if (m && m.id !== undefined && m.id !== null) blad(m.id, -32603, e.message);
    });
  });
}

module.exports = { NARZEDZIA, obsluz, znajdzBlad, sprawdzUrzadzenie, ustawienia };

if (require.main === module) start();
