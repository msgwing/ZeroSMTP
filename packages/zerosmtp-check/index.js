#!/usr/bin/env node
// zerosmtp-check - does outbound SMTP actually work from here?
//
// The single most common reason a first send fails is not the credentials
// and not the server: it is the network refusing to let port 587 or 465 out.
// Cloud providers block those by default, and the symptom - a hang, then a
// timeout - looks identical to a server being down. This tells the two apart.
//
// Zero dependencies, deliberately. A diagnostic that needs `npm install` to
// work is useless on the machine where things are already broken, and a tool
// people run against their own mail infrastructure should not be pulling in
// a dependency tree they have to audit.

import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { pathToFileURL } from 'node:url';
import { ERRORS, DEVICE_CODES } from './errors.js';

const DEFAULT_HOST = 'mx.msgwing.com';
// 25 first, because it is the one most likely to be blocked and therefore
// the fastest answer to "is it the network or is it me".
//
// Whether 25 can be sent by depends entirely on the server, and the first
// wording here generalised without measuring: this relay offers no AUTH on
// 25, but mx.hsomail.pl and poczta.interia.pl both do. So the report claims
// nothing - it says "no AUTH offered" only when that is what the server
// actually said, and only then points at 587 and 465 instead.
const DEFAULT_PORTS = [25, 587, 465];
const TIMEOUT_MS = 10_000;

const HELP = `
zerosmtp-check - check whether outbound SMTP works from this machine

  npx zerosmtp-check [host] [options]

  host              SMTP host to test (default: ${DEFAULT_HOST})

  --explain [text]  say what an SMTP error actually means. Paste whatever
                    your log, library or device panel printed - reading
                    from a pipe if no text is given
  --port <n>        test one port only (default: ${DEFAULT_PORTS.join(', ')})
  --timeout <ms>    per-step timeout (default: ${TIMEOUT_MS})
  --insecure        continue past certificate errors and report them
  --json            machine-readable output
  -h, --help        this

Examples

  npx zerosmtp-check                          the ZeroSMTP relay
  npx zerosmtp-check smtp.office365.com       your own provider
  npx zerosmtp-check mail.example.com --port 25
  npx zerosmtp-check --explain "535 5.7.139 Authentication unsuccessful"
  npx zerosmtp-check --explain 1102          a code off a printer panel
  grep -i sasl /var/log/mail.log | npx zerosmtp-check --explain

No credentials are sent and no mail is delivered. The check stops after
EHLO.

Exit codes: 0 every tested port reachable with a valid certificate,
1 at least one problem found, 2 the host could not be resolved.
`.trim();

// --- argument parsing -------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    host: DEFAULT_HOST,
    ports: DEFAULT_PORTS,
    timeout: TIMEOUT_MS,
    insecure: false,
    json: false,
  };
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') return { help: true };
    // --explain swallows the rest of the line on purpose. People paste error
    // text straight off a terminal and it is full of quotes, colons and
    // parentheses; demanding they quote it correctly while their mail is down
    // is the wrong thing to insist on.
    else if (a === '--explain') {
      return { explain: argv.slice(i + 1).join(' ').trim(), json: argv.includes('--json') };
    }
    else if (a === '--insecure') opts.insecure = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--port') opts.ports = [Number(argv[++i])];
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (a.startsWith('-')) return { error: `Unknown option: ${a}` };
    else rest.push(a);
  }

  if (rest.length > 1) return { error: `Expected one host, got ${rest.length}` };
  if (rest.length === 1) opts.host = rest[0];

  if (opts.ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535)) {
    return { error: 'Port must be an integer between 1 and 65535' };
  }
  if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) {
    return { error: 'Timeout must be a positive number of milliseconds' };
  }
  return opts;
}

// --- SMTP conversation helpers ----------------------------------------------

/** Read until a line of the form "250 text" - a code followed by a space
 *  rather than a hyphen, which is how SMTP marks the end of a reply. */
function readReply(socket, timeout) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const done = (fn, arg) => {
      clearTimeout(timer);
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      fn(arg);
    };
    const timer = setTimeout(
      () => done(reject, new Error('timed out waiting for a reply')), timeout);
    const onData = chunk => {
      buf += chunk.toString('utf8');
      const lines = buf.split(/\r?\n/);
      for (const line of lines) {
        if (/^\d{3} /.test(line)) return done(resolve, buf);
      }
    };
    const onError = err => done(reject, err);
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

function send(socket, line) {
  socket.write(line + '\r\n');
}

function connectTcp(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(timeout);
    socket.once('connect', () => { socket.setTimeout(0); resolve(socket); });
    socket.once('timeout', () => {
      socket.destroy();
      reject(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }));
    });
    socket.once('error', err => { socket.destroy(); reject(err); });
  });
}

function upgradeTls(socket, host, timeout, insecure) {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({
      socket,
      servername: host,
      // Verification stays on. --insecure does not disable it; it lets the
      // check continue so the report can say *why* it failed, which is the
      // whole point of a diagnostic.
      rejectUnauthorized: !insecure,
    });
    secure.setTimeout(timeout);
    secure.once('secureConnect', () => { secure.setTimeout(0); resolve(secure); });
    secure.once('timeout', () => {
      secure.destroy();
      reject(Object.assign(new Error('TLS handshake timed out'), { code: 'ETIMEDOUT' }));
    });
    secure.once('error', err => { secure.destroy(); reject(err); });
  });
}

function connectTlsDirect(host, port, timeout, insecure) {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({
      host, port, servername: host, rejectUnauthorized: !insecure,
    });
    secure.setTimeout(timeout);
    secure.once('secureConnect', () => { secure.setTimeout(0); resolve(secure); });
    secure.once('timeout', () => {
      secure.destroy();
      reject(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }));
    });
    secure.once('error', err => { secure.destroy(); reject(err); });
  });
}

function describeCert(secure) {
  const cert = secure.getPeerCertificate();
  if (!cert || !cert.subject) return null;
  return {
    subject: cert.subject.CN || null,
    issuer: cert.issuer ? cert.issuer.CN || cert.issuer.O || null : null,
    validTo: cert.valid_to || null,
    authorized: secure.authorized,
    authorizationError: secure.authorizationError
      ? String(secure.authorizationError) : null,
    protocol: secure.getProtocol(),
  };
}

export function authMechanisms(ehlo) {
  // Only the `250-AUTH MECH MECH` form. The `250-AUTH=` line some servers also
  // send is a workaround for very old Outlook clients and repeats the same
  // mechanisms, so counting it would double everything.
  const line = ehlo.split(/\r?\n/).find(l => /^250[ -]AUTH /i.test(l));
  if (!line) return [];
  const raw = line.replace(/^250[ -]AUTH /i, '').trim().split(/\s+/).filter(Boolean);

  // Servers do repeat themselves here. poczta.interia.pl advertises
  // `AUTH PLAIN LOGIN PLAIN LOGIN PLAIN LOGIN` - three copies of the same two
  // mechanisms, which is a duplicated SASL configuration rather than three
  // different ways in. Printed verbatim it reads like a finding. The set is
  // what the reader needs; that it was repeated is worth a line to a mail
  // admin and nothing to anybody else, so it travels separately.
  const seen = new Set();
  const unique = raw.filter(m => {
    const k = m.toUpperCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.duplicated = unique.length !== raw.length;
  return unique;
}

// --- the check itself ---------------------------------------------------------

async function checkPort(host, port, opts) {
  const result = {
    port, tcp: false, tls: false, starttls: null,
    cert: null, auth: [], authDuplicated: false, error: null,
  };

  let socket;
  try {
    socket = await connectTcp(host, port, opts.timeout);
  } catch (err) {
    result.error = err.code === 'ETIMEDOUT'
      ? 'TCP connect timed out'
      : `TCP connect failed: ${err.code || err.message}`;
    return result;
  }
  result.tcp = true;

  try {
    let secure;
    if (port === 465) {
      // Implicit TLS: the socket is encrypted before any SMTP is spoken, so
      // the plain socket we just opened is thrown away and reopened as TLS.
      socket.destroy();
      secure = await connectTlsDirect(host, port, opts.timeout, opts.insecure);
      result.starttls = false;
      await readReply(secure, opts.timeout);       // greeting
    } else {
      await readReply(socket, opts.timeout);       // greeting
      send(socket, 'EHLO zerosmtp-check');
      const ehlo = await readReply(socket, opts.timeout);

      if (!/STARTTLS/i.test(ehlo)) {
        result.starttls = false;
        result.auth = authMechanisms(ehlo);
        result.error = 'Server did not offer STARTTLS - the session would be '
          + 'in cleartext';
        socket.destroy();
        return result;
      }
      result.starttls = true;
      send(socket, 'STARTTLS');
      await readReply(socket, opts.timeout);
      secure = await upgradeTls(socket, host, opts.timeout, opts.insecure);
    }

    result.tls = true;
    result.cert = describeCert(secure);

    send(secure, 'EHLO zerosmtp-check');
    const ehlo = await readReply(secure, opts.timeout);
    result.auth = authMechanisms(ehlo);
    result.authDuplicated = Boolean(result.auth.duplicated);

    send(secure, 'QUIT');
    secure.destroy();
  } catch (err) {
    const code = err.code || '';
    if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ALT_NAME/i.test(code)) {
      result.error = `Certificate could not be verified: ${code}. Re-run with `
        + `--insecure to see the certificate anyway.`;
    } else {
      result.error = `TLS/SMTP step failed: ${code || err.message}`;
    }
    try { socket.destroy(); } catch { /* already gone */ }
  }

  return result;
}

// --- explaining an error somebody pasted --------------------------------------
//
// The string a person is looking at is almost never the one the server sent.
// Postfix wraps it in a SASL line, Python turns it into a bytes literal, a
// Kyocera panel shows 1102, and curl throws the server's text away entirely
// and prints `curl: (67) Login denied`. Three different people, three
// different strings, one cause. Nothing else joins those up, which is the
// only reason this mode is worth having.

const DOCS = 'https://docs.msgwing.com/errors';

/** The enhanced status code (5.7.139) is the reliable part: clients reword the
 *  human text but pass this through untouched. Deliberately not matching the
 *  reply code (535) - that one is shared by unrelated failures. */
function enhancedCode(text) {
  const m = text.match(/\b(\d\.\d\.\d{1,3})\b/);
  return m ? m[1] : null;
}

/** The reply code (530, 553, ...) right before the enhanced code. Every entry
 *  in the corpus is Microsoft's, so a reply code the corpus does not record
 *  for this enhanced code means the pasted line came from somewhere else -
 *  our own relay's 553 shares 5.7.1 with Microsoft's 530, and looks like a
 *  match right up until this is checked. Refusing beats guessing: see #423. */
function replyCode(text) {
  const m = text.match(/\b([2-5]\d{2})\s+\d\.\d\.\d{1,3}\b/);
  return m ? m[1] : null;
}

function contradictsCorpus(matches, text) {
  const reply = replyCode(text);
  return reply !== null && !matches.some(e => e.code.startsWith(reply + ' '));
}

/** Several entries share 5.7.139 and differ only in whether the block sits on
 *  the tenant or the mailbox. If the pasted text says which, use it. */
function narrowByScope(matches, lower) {
  if (matches.length < 2) return matches;
  const said = matches.filter(e => {
    const s = e.scope.toLowerCase();
    if (s === 'tenant') return /\btenant\b/.test(lower);
    if (s === 'mailbox') return /\bmailbox\b/.test(lower);
    return false;
  });
  return said.length ? said : matches;
}

const REVERSIBLE = {
  'auth-refused':
    'Yes, until the end of December 2026. The server is refusing the password '
    + 'because SMTP AUTH is switched off for this tenant or mailbox, not '
    + 'because the password is wrong. An administrator can switch it back on, '
    + 'and after that date they cannot.',
  'no-credentials':
    'Yes, and it has no deadline. The client never authenticated at all, so '
    + 'this is a setting on the device or in the code rather than anything '
    + 'Microsoft is turning off.',
  'throttled':
    'Yes, and it has nothing to do with December 2026. Authentication worked '
    + 'and the message was refused on volume - the tenant has sent more in the '
    + 'last 24 hours than its limit allows. Find what is sending before '
    + 'changing any mail settings; a device in a retry loop can spend a '
    + "tenant's daily allowance overnight.",
  'wrong-sender':
    'Yes, and it has no deadline. The credentials are not what is being '
    + 'refused - either the From address is not one this account may send as, '
    + 'or the message could not be matched to a route permitted to relay it. '
    + 'Both are permissions questions rather than anything Microsoft is '
    + 'switching off.',
};

function explainMatch(e) {
  const out = [];
  out.push(`${e.code} - ${e.message}`);
  out.push('');
  out.push(e.meaning);
  out.push('');
  out.push('Can it still be fixed?');
  out.push(`  ${REVERSIBLE[e.kind] || 'Unknown - this entry has no recorded kind.'}`);
  out.push('');
  out.push(`  Full page: ${DOCS}/${e.slug}.html`);
  return out.join('\n');
}

/** Clients that swallow the server's text. Nothing can be diagnosed from these
 *  alone, and saying so beats guessing - but the way to reveal the real error
 *  is worth more here than any guess would be. */
const BLIND = [
  {
    test: /curl:\s*\(67\)|login denied/i,
    name: 'curl',
    advice:
      'curl prints only `curl: (67) Login denied` and discards what the server '
      + 'actually said, which is why this gets mistaken for a wrong password.\n'
      + '  Run the same command again with -v and look for the line beginning '
      + '535 or 550. Paste that here instead.',
  },
];

export function explain(text) {
  const lower = text.toLowerCase();
  const out = [];

  if (!text) {
    return 'Nothing to explain. Paste the error text, or pipe a log into it:\n'
      + '  npx zerosmtp-check --explain "535 5.7.139 ..."\n'
      + '  grep -i sasl /var/log/mail.log | npx zerosmtp-check --explain';
  }

  const code = enhancedCode(text);
  if (code) {
    const byCode = ERRORS.filter(e => e.enhanced === code);
    const matches = contradictsCorpus(byCode, text) ? [] : narrowByScope(byCode, lower);
    if (matches.length === 1) return explainMatch(matches[0]);
    if (matches.length > 1) {
      out.push(`${code} covers more than one case and the text you pasted does `
        + `not say which. Both are below; the scope is the difference.`);
      out.push('');
      out.push(matches.map(m => `[${m.scope}]\n${explainMatch(m)}`).join('\n\n'));
      return out.join('\n');
    }
  }

  for (const [panel, d] of Object.entries(DEVICE_CODES)) {
    // String.raw, because inside a plain template literal `\b` is the
    // backspace character rather than a word boundary. The regex then
    // matches nothing at all and says so politely, which is how a printer
    // technician pasting 1102 got told there was no record of it.
    if (new RegExp(String.raw`\b(0x)?${panel}\b`).test(lower)) {
      out.push(`${panel} - ${d.vendor} device code`);
      out.push('');
      out.push(d.note);
      out.push('');
      out.push('Can it still be fixed?');
      out.push(`  ${REVERSIBLE[d.kind]}`);
      out.push('');
      out.push('  The device is not broken and does not need replacing before '
        + 'the deadline. Check the mail server setting first.');
      return out.join('\n');
    }
  }

  for (const b of BLIND) {
    if (b.test.test(text)) {
      return `This is ${b.name} hiding the error rather than reporting it.\n\n  `
        + b.advice;
    }
  }

  return 'No match for that one.\n\n'
    + `  ${ERRORS.length} error strings are recorded here, all of them from the\n`
    + '  Microsoft 365 SMTP AUTH shutdown. If yours belongs with them, adding it\n'
    + '  gives it a page of its own - which is how somebody else finds it next\n'
    + '  time:\n'
    + '  https://github.com/msgwing/ZeroSMTP/issues/new?template=error-string.yml\n\n'
    + '  If the send is timing out rather than being refused, the problem is\n'
    + '  usually the network, not the credentials. Run the check with no\n'
    + '  arguments: npx zerosmtp-check';
}

export function explainJson(text) {
  const code = enhancedCode(text);
  const byCode = code ? ERRORS.filter(e => e.enhanced === code) : [];
  const matches = code && !contradictsCorpus(byCode, text)
    ? narrowByScope(byCode, text.toLowerCase())
    : [];
  return {
    input: text,
    enhancedCode: code,
    matched: matches.length > 0,
    matches: matches.map(m => ({ ...m, reversible: REVERSIBLE[m.kind] || null })),
  };
}

// --- output ---------------------------------------------------------------------

const tick = ok => (ok ? '  ok  ' : ' FAIL ');

function report(host, addresses, results) {
  const out = [];
  out.push(`SMTP connectivity check - ${host}`);
  out.push('');
  out.push(`DNS      ${addresses.length ? 'ok' : 'FAILED'}   `
    + (addresses.join(', ') || 'no addresses'));

  for (const r of results) {
    out.push('');
    out.push(`Port ${r.port}`);
    out.push(`  [${tick(r.tcp)}] TCP connect`);
    if (r.starttls !== null) {
      out.push(r.port === 465
        ? '  [  ok  ] implicit TLS (SMTPS)'
        : `  [${tick(r.starttls)}] STARTTLS offered`);
    }
    out.push(`  [${tick(r.tls)}] TLS handshake`);

    if (r.cert) {
      out.push(`  [${tick(r.cert.authorized)}] certificate verified`
        + (r.cert.authorizationError ? ` - ${r.cert.authorizationError}` : ''));
      out.push(`           ${r.cert.protocol}, `
        + `CN=${r.cert.subject || '?'}, issuer=${r.cert.issuer || '?'}`);
      out.push(`           expires ${r.cert.validTo || 'unknown'}`);
    }
    if (r.auth.length) {
      out.push(`           AUTH ${r.auth.join(' ')}`);
      if (r.auth.some(m => /^(LOGIN|PLAIN)$/i.test(m))) {
        out.push('           accepts a username and password');
      }
      if (r.authDuplicated) {
        out.push('           (the server listed these more than once - a '
          + 'duplicated SASL config, harmless to you)');
      }
    } else if (r.tls) {
      // Reachable and encrypted is not the same as usable. Port 25 commonly
      // gets here: it is the server-to-server port and offers no AUTH, so a
      // device configured to use it will connect, look healthy, and then fail
      // to log in. Saying "ok" and stopping would cause that.
      out.push('           no AUTH offered - this port will not take a '
        + 'username and password');
      if (r.port === 25) {
        out.push('           use 587 (STARTTLS) or 465 (implicit TLS) to send');
      }
    }
    if (r.error) out.push(`  ->       ${r.error}`);
  }

  const blocked = results.filter(r => !r.tcp);
  if (blocked.length) {
    out.push('');
    out.push('Every connection attempt timed out or was refused'
      + (blocked.length === results.length ? '.' : ` on port ${blocked.map(r => r.port).join(', ')}.`));
    out.push('That is almost always the network rather than the server:');
    out.push('  - most cloud providers block outbound 25, and many block 587');
    out.push('    and 465 too, until you ask them to open it');
    out.push('  - corporate firewalls commonly allow SMTP only from a');
    out.push('    designated relay host');
    out.push('Try the same command from a different network. If it works');
    out.push('there, the host is fine and the block is local.');
  }

  return out.join('\n');
}

// --- main ------------------------------------------------------------------------

// Everything below runs only when this file is the program. Without the
// guard, `import { authMechanisms }` opens sockets to the relay as a side
// effect of being imported - which is how the parser ended up untestable
// without a network, and how a duplicated AUTH list shipped unnoticed.
const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) { console.log(HELP); process.exit(0); }
  if (opts.error) { console.error(`${opts.error}\n\n${HELP}`); process.exit(1); }

  if (opts.explain !== undefined) {
    let text = opts.explain.replace(/\s*--json\s*/g, ' ').trim();

    // No text after the flag and something is piped in: read the log. That is
    // the shape the problem actually arrives in for anyone with shell access -
    // the error is sitting in a file, not on their clipboard.
    if (!text && !process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      text = Buffer.concat(chunks).toString('utf8').trim();
    }

    if (opts.json) {
      const payload = explainJson(text);
      console.log(JSON.stringify(payload, null, 2));
      process.exit(payload.matched ? 0 : 1);
    }

    const answer = explain(text);
    console.log(answer);
    // Exit 1 when nothing matched, so a script can tell the two apart.
    process.exit(/^No match for that one\.|^Nothing to explain\./.test(answer) ? 1 : 0);
  }


  let addresses = [];
  try {
    addresses = (await dns.lookup(opts.host, { all: true })).map(a => a.address);
  } catch (err) {
    const msg = `Could not resolve ${opts.host}: ${err.code || err.message}`;
    if (opts.json) console.log(JSON.stringify({ host: opts.host, dns: false, error: msg }, null, 2));
    else console.error(msg);
    process.exit(2);
  }

  const results = [];
  for (const port of opts.ports) {
    results.push(await checkPort(opts.host, port, opts));
  }

  const ok = results.every(r => r.tcp && r.tls && (!r.cert || r.cert.authorized) && !r.error);

  if (opts.json) {
    console.log(JSON.stringify(
      { host: opts.host, addresses, ports: results, ok }, null, 2));
  } else {
    console.log(report(opts.host, addresses, results));
  }

  process.exit(ok ? 0 : 1);

}
