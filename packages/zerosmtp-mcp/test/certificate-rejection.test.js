'use strict';

/**
 * Exercises the certificate-rejection branch of `check_relay_reachable`.
 *
 * The tool opens a real TCP connection, completes the SMTP greeting, EHLO and
 * STARTTLS dance, and only then upgrades to TLS. When the certificate does not
 * verify, the tool must report that as a finding ("certificate did not verify")
 * rather than as a generic TLS or network error. That branch is the reason the
 * tool refuses to disable certificate validation, so it deserves coverage.
 *
 * A local SMTP server advertises STARTTLS and then presents a self-signed
 * certificate. No network access is involved.
 */

const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const net = require('node:net');
const tls = require('node:tls');
const path = require('node:path');

const SERVER = path.join(__dirname, '..', 'index.js');

// A self-signed certificate generated for this test. It is valid and has the
// right subjectAltName, so the only reason the tool may reject it is the
// missing trust anchor - which is exactly the path under test.
const KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDw/ZPbglnWJFrW
Gvm2KJTiQd539qf/rysDSZ+NY/tnXI53HgL0IKiIRDrxMpdmBd7XI5rUMG8urF29
9ZW8yUWzTUWBYhVEnELkOoaB2qAjxryCIlgSQQDxneW5jmWaOLOm4PDXFMDA6l84
v1e8PjOipxVLoybgmv+IjjsxLaNZgZiKknUqOrz8+sryMvGnTp2u0Eq4FnzzMbjP
ylE9EcO7gg/e0iOp/bV4NGuYVYGze4/RBFAp3q4dr9pXOFTFg7Zql4FqKLjquH/M
Iqyh0ichXmiTgkNiSFycREARtnerY4rwn9Bp9EPUp4KShiOEkg8Tf9lfZ98urJuH
jsUlyi+pAgMBAAECggEAAc+F7hJIQBzWnRRnmxmQjmdvfatAW+I710x7gs5x5x1O
gx3NaK3BVmf2bjV/gBuIyK9sMsfvLer+aunB2qdDrmZlBuUIj9/OSNsZUGraGF3r
FxDQl8jq2H99NSwZHocdvAhyOf6rH0fwUZ07OLjaHnciG9PGYppt7RK65lJ93Bni
ontvMa8w1q7jOWTVUaZQ1nzCkbb/xpfzd4UW+5K1sR1NQfb8+8BvcCWuR4DACZg/
5i6revQBVjlqK7BMV+0+qqfo+a+kptqtOUD19q6bNOCiu4BFrjXS3tt61RdxZ5uh
LLKOVEZWDIunDNGWJbHkcFL/Uf0Ovdzq2INxAkwTYQKBgQD/HfTxNA+U+IaJP4q0
f0Tj5RvMA0BxYzRC4Cq5b55J46B7cQZ0eE7wqlf4S+258yYwpJICAphtUeNg5lsg
HoGs6n+UwwIM7sT5ZJEElEzJ2ofkCalmZp13CBbOfvnkuVVXVv3T0hEaPNppll0S
fpYTibfPPTH9vArf6sX6/ci5jQKBgQDx0xqrGbzfgSpFS3qIZSkVFMezspCkoCUm
WqRSn3GSDuPhwXng7ZDT4/J7AGFdTc5AljX2zD89WXIDk8QGk3c6AcTuhs2yYV6V
nzTllkVeyvmocdNCAl9CzqPvTO0v010HImc5TUyjammxzJ9PXo4cE1Quo12jNGu1
4KNlo5gxjQKBgE3krab/yEop35oERqt5uGUEzQnrbD+ylIBexWy9Ac15rMRD7D6f
hSrCN/3d4QXHkb+EX/gxJq0qNYyeiPAzoFBVgQLAz913AblL1WNajF+NU7RypsBX
UHjJhX0jE9WcKMx0CSglmYczUVSvzlcZQ2VPxUmHW74nLgLUQgKyfhj5AoGBAI3x
X8H2xYpbgrhR6YaN+mNJYz7zHTvEVIoCwllNBZi57MDik+uXBl+ZeQcB3iSqOtpm
UR6gHK6iBe5bmcBSZrVBvJpVvf9qb95bKO1qGyXc9lYNGfew9MF+EXOxL7fW1NAP
PY/A868oEwouFYS896U7IzqM4bWeW2rShJZwRDExAoGAXi81JdCXggEjEsomIhOK
/0D3ARM2N7qMvhNK2LnbvFeo79DSA+76Q30TqPD4K8MXfaMwD7g1KAdbidT/DL8J
ONKVu9Dj1gqyLufsMxWzwElqxVDg7JhWMoystZXALA9z0qqs34hd9huLCVkcofKh
GwRgI9V9Uy0cnVx+P00cNgk=
-----END PRIVATE KEY-----`;

const CERT = `-----BEGIN CERTIFICATE-----
MIIDJTCCAg2gAwIBAgIUYvgu3SpwzaavVzIKjRL7q3eq0owwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI2MDgzMDEwMzg1NVoXDTM2MDgy
NzEwMzg1NVowFDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEA8P2T24JZ1iRa1hr5tiiU4kHed/an/68rA0mfjWP7Z1yO
dx4C9CCoiEQ68TKXZgXe1yOa1DBvLqxdvfWVvMlFs01FgWIVRJxC5DqGgdqgI8a8
giJYEkEA8Z3luY5lmjizpuDw1xTAwOpfOL9XvD4zoqcVS6Mm4Jr/iI47MS2jWYGY
ipJ1Kjq8/PrK8jLxp06drtBKuBZ88zG4z8pRPRHDu4IP3tIjqf21eDRrmFWBs3uP
0QRQKd6uHa/aVzhUxYO2apeBaii46rh/zCKsodInIV5ok4JDYkhcnERAEbZ3q2OK
8J/QafRD1KeCkoYjhJIPE3/ZX2ffLqybh47FJcovqQIDAQABo28wbTAdBgNVHQ4E
FgQUBv4TpXkpwcDxM6YjuWfxUkrRwTIwHwYDVR0jBBgwFoAUBv4TpXkpwcDxM6Yj
uWfxUkrRwTIwDwYDVR0TAQH/BAUwAwEB/zAaBgNVHREEEzARgglsb2NhbGhvc3SH
BH8AAAEwDQYJKoZIhvcNAQELBQADggEBAC9sJ74FVt7URH3bYa0QuWZjYIg4LZ0s
p9hvqq3U0udojGTArOc2/2CK6+BpsyGqL5PhlW0YVOqZIdVK2jpbQCwqrXnq3erF
RdnavcXrS9y8igLDfmrzFKgNrqgI93nxeXSDg+2hzQeY1xgAgSsAWd1wXXgY5w4e
qyzs6cWM80mc8eIS2U8zv5dTI7t4ZmQ26iF34zh76e3QZF//x9psluLacT+gmyJr
FcnairRxS9bnf/d/XKNiTvThLe39fTzl8cxjIxnR2Us1bFo2FYS2QQdSeikUua9S
mwiLZkJN2lGbBC9fgOpZElN/B0ZlsXrWbd1qX+mKeTWLBXhX8QHpeYw=
-----END CERTIFICATE-----`;

/**
 * Spawns the MCP server and exchanges newline-delimited JSON-RPC with it, the
 * same way protocol.test.js does. Resolves once every message with an id has a
 * response.
 */
function call(messages, { timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const responses = [];
    let buffer = '';
    let stderr = '';

    const timer = setTimeout(() => {
      p.kill();
      reject(new Error('timed out; stderr: ' + stderr));
    }, timeout);

    p.stdout.on('data', (d) => {
      buffer += d.toString('utf8');
      let i;
      while ((i = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (line) responses.push(JSON.parse(line));
      }
      const expected = messages.filter((m) => m.id !== undefined).length;
      if (responses.length >= expected) {
        clearTimeout(timer);
        p.kill();
        resolve(responses);
      }
    });

    p.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    p.on('error', reject);

    for (const m of messages) p.stdin.write(JSON.stringify(m) + '\n');
  });
}

/**
 * A local SMTP server that answers the greeting, EHLO and STARTTLS, then wraps
 * the socket in TLS with a self-signed certificate. The client is expected to
 * reject that certificate.
 */
function startSmtpServer() {
  const secureContext = tls.createSecureContext({ key: KEY, cert: CERT });

  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let stage = 'greeting';
      socket.write('220 localhost ESMTP\r\n');

      socket.on('data', (d) => {
        const text = d.toString('utf8');
        if (stage === 'greeting') {
          if (!/EHLO/i.test(text)) return;
          stage = 'ehlo';
          socket.write('250-localhost\r\n250-STARTTLS\r\n250 OK\r\n');
        } else if (stage === 'ehlo') {
          if (!/STARTTLS/i.test(text)) return;
          stage = 'tls';
          socket.write('220 Ready to start TLS\r\n');
          const secure = new tls.TLSSocket(socket, { isServer: true, secureContext });
          secure.on('error', () => { /* the client rejects the certificate; expected */ });
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

test('check_relay_reachable reports a certificate rejection as a finding, not a generic error', async () => {
  const { server, port } = await startSmtpServer();
  try {
    const [o] = await call([{
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'check_relay_reachable', arguments: { host: '127.0.0.1', port } },
    }]);

    assert.equal(o.result.isError, undefined, 'must not be a tool error');
    const text = o.result.content[0].text;

    assert.match(text, /certificate did not verify/,
      'must name the certificate as the finding');
    assert.match(text, /DEPTH_ZERO_SELF_SIGNED_CERT/,
      'must name the specific rejection code');
    assert.doesNotMatch(text, /TLS handshake failed/,
      'must not collapse into the generic TLS error');
    assert.doesNotMatch(text, /Could not reach/,
      'must not report the certificate problem as a network error');
  } finally {
    server.close();
  }
});
