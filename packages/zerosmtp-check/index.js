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

const DEFAULT_HOST = 'mx.msgwing.com';
const DEFAULT_PORTS = [587, 465];
const TIMEOUT_MS = 10_000;

const HELP = `
zerosmtp-check - check whether outbound SMTP works from this machine

  npx zerosmtp-check [host] [options]

  host              SMTP host to test (default: ${DEFAULT_HOST})

  --port <n>        test one port only (default: ${DEFAULT_PORTS.join(', ')})
  --timeout <ms>    per-step timeout (default: ${TIMEOUT_MS})
  --insecure        continue past certificate errors and report them
  --json            machine-readable output
  -h, --help        this

Examples

  npx zerosmtp-check                          the ZeroSMTP relay
  npx zerosmtp-check smtp.office365.com       your own provider
  npx zerosmtp-check mail.example.com --port 25

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

function authMechanisms(ehlo) {
  const line = ehlo.split(/\r?\n/).find(l => /^250[ -]AUTH /i.test(l));
  if (!line) return [];
  return line.replace(/^250[ -]AUTH /i, '').trim().split(/\s+/);
}

// --- the check itself ---------------------------------------------------------

async function checkPort(host, port, opts) {
  const result = {
    port, tcp: false, tls: false, starttls: null,
    cert: null, auth: [], error: null,
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

const opts = parseArgs(process.argv.slice(2));

if (opts.help) { console.log(HELP); process.exit(0); }
if (opts.error) { console.error(`${opts.error}\n\n${HELP}`); process.exit(1); }

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
