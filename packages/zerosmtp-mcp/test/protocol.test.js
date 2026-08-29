'use strict';

/**
 * Talks to the server the way a client does: spawn it, write newline-delimited
 * JSON-RPC to stdin, read from stdout.
 *
 * Calling the handlers directly proves the data lookups. It does not prove a
 * client can connect, and that is the part that fails silently - a response to
 * a notification, or a protocol version the client does not recognise, drops
 * the session with no error the user ever sees.
 */

const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const SERWER = path.join(__dirname, '..', 'index.js');

function rozmowa(wiadomosci, { timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [SERWER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const odpowiedzi = [];
    let bufor = '';
    let bledy = '';

    const stoper = setTimeout(() => {
      p.kill();
      reject(new Error('timed out; stderr: ' + bledy));
    }, timeout);

    p.stdout.on('data', (d) => {
      bufor += d.toString('utf8');
      let i;
      while ((i = bufor.indexOf('\n')) !== -1) {
        const linia = bufor.slice(0, i).trim();
        bufor = bufor.slice(i + 1);
        if (linia) odpowiedzi.push(JSON.parse(linia));
      }
      // Liczymy tylko wiadomosci z id - powiadomienia nie maja odpowiedzi.
      const oczekiwane = wiadomosci.filter((m) => m.id !== undefined).length;
      if (odpowiedzi.length >= oczekiwane) {
        clearTimeout(stoper);
        p.kill();
        resolve(odpowiedzi);
      }
    });

    p.stderr.on('data', (d) => { bledy += d.toString('utf8'); });
    p.on('error', reject);

    for (const m of wiadomosci) p.stdin.write(JSON.stringify(m) + '\n');
  });
}

test('initialize zwraca wersje protokolu, ktora poprosil klient', async () => {
  const [o] = await rozmowa([
    { jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } },
  ]);
  assert.equal(o.id, 1);
  assert.equal(o.result.protocolVersion, '2024-11-05');
  assert.equal(o.result.serverInfo.name, 'zerosmtp');
  assert.ok(o.result.capabilities.tools, 'musi ogloszic zdolnosc tools');
});

test('nieznana wersja protokolu dostaje nasza domyslna, nie echo', async () => {
  const [o] = await rozmowa([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
  ]);
  assert.equal(o.result.protocolVersion, '2024-11-05');
});

test('powiadomienie nie dostaje odpowiedzi', async () => {
  const odp = await rozmowa([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 7, method: 'ping' },
  ]);
  assert.equal(odp.length, 1, 'tylko ping ma odpowiedziec');
  assert.equal(odp[0].id, 7);
});

test('tools/list wymienia cztery narzedzia ze schematami', async () => {
  const [o] = await rozmowa([{ jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
  const nazwy = o.result.tools.map((t) => t.name).sort();
  assert.deepEqual(nazwy, [
    'check_device_oauth', 'check_relay_reachable', 'lookup_smtp_error', 'relay_settings',
  ]);
  for (const t of o.result.tools) {
    assert.equal(t.inputSchema.type, 'object', t.name + ' potrzebuje schematu wejscia');
    assert.ok(t.description.length > 40, t.name + ' potrzebuje opisu, po ktorym model wybierze');
  }
});

test('lookup_smtp_error rozpoznaje prawdziwy ciag i podaje strone', async () => {
  const [o] = await rozmowa([{
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'lookup_smtp_error',
              params: undefined,
              arguments: { text: 'SMTP error 535 5.7.139 Authentication unsuccessful, basic authentication is disabled' } },
  }]);
  const t = o.result.content[0].text;
  assert.match(t, /5\.7\.139/);
  assert.match(t, /docs\.msgwing\.com\/errors\//);
});

test('nieznany ciag mowi ze nie wie, zamiast zmyslac', async () => {
  const [o] = await rozmowa([{
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'lookup_smtp_error', arguments: { text: 'zzz nie ma takiego bledu zzz' } },
  }]);
  const t = o.result.content[0].text;
  assert.match(t, /No error in the corpus matches/);
  assert.doesNotMatch(t, /docs\.msgwing\.com\/errors\//,
    'brak dopasowania nie moze linkowac do konkretnej strony bledu');
});

test('relay_settings zawsze podaje oba limity', async () => {
  const [o] = await rozmowa([{
    jsonrpc: '2.0', id: 5, method: 'tools/call',
    params: { name: 'relay_settings', arguments: {} },
  }]);
  const t = o.result.content[0].text;
  assert.match(t, /200 messages a day/);
  // Alternatywa "never your own domain|not your own domain" przechodzila,
  // gdy wiersz o adresie nadawcy zostal zepsuty - bo ta sama frazy jest tez
  // w akapicie o limitach. Asercja celuje teraz w konkretny wiersz tabeli.
  assert.match(t, /From address\s+the same generated login/,
    'wiersz "From address" musi wskazywac wygenerowany login, nie wlasna domene');
  assert.match(t, /mx\.msgwing\.com/);
});

test('nieznane narzedzie zwraca blad protokolu, nie wywraca serwera', async () => {
  const [o] = await rozmowa([{
    jsonrpc: '2.0', id: 6, method: 'tools/call',
    params: { name: 'nie_ma_takiego', arguments: {} },
  }]);
  assert.equal(o.error.code, -32602);
});

test('niepoprawny JSON nie konczy sesji', async () => {
  const odp = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [SERWER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const zebrane = [];
    let bufor = '';
    const stoper = setTimeout(() => { p.kill(); reject(new Error('timeout')); }, 15000);
    p.stdout.on('data', (d) => {
      bufor += d.toString('utf8');
      let i;
      while ((i = bufor.indexOf('\n')) !== -1) {
        const l = bufor.slice(0, i).trim();
        bufor = bufor.slice(i + 1);
        if (l) zebrane.push(JSON.parse(l));
      }
      if (zebrane.length >= 2) { clearTimeout(stoper); p.kill(); resolve(zebrane); }
    });
    p.stdin.write('{to nie jest json\n');
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'ping' }) + '\n');
  });
  assert.equal(odp[0].error.code, -32700);
  assert.equal(odp[1].id, 9, 'serwer musi odpowiadac dalej po smieciach na wejsciu');
});
