# zerosmtp-check

Does outbound SMTP actually work from this machine?

```bash
npx zerosmtp-check smtp.office365.com
```

No install, no credentials, no mail sent, **no dependencies**.

## Why this exists

When a send fails, the symptom is almost always the same: it hangs, then it
times out. That looks identical whether the server is down, the certificate
is untrusted, or — by far the most common — the network simply will not let
port 587 or 465 out.

Cloud providers block outbound SMTP by default. So do a lot of corporate
firewalls. You can spend an afternoon rotating credentials on a problem that
was never authentication.

This tells the cases apart in about two seconds.

## What it checks

For each port (587 and 465 by default):

- DNS resolution
- TCP connect, with a real timeout rather than hanging
- `STARTTLS` offered (587) or implicit TLS (465)
- TLS handshake, protocol version
- **Certificate validation** — subject, issuer, expiry, and whether this
  machine's trust store actually accepts it
- The `AUTH` mechanisms the server advertises, and whether plain
  username-and-password is among them

The conversation stops after `EHLO`. Nothing is authenticated and nothing is
delivered.

## Usage

```
npx zerosmtp-check [host] [options]

  host              SMTP host to test (default: mx.msgwing.com)

  --port <n>        test one port only
  --timeout <ms>    per-step timeout (default: 10000)
  --insecure        continue past certificate errors and report them
  --json            machine-readable output
  -h, --help
```

```bash
npx zerosmtp-check                            # the ZeroSMTP relay
npx zerosmtp-check smtp.office365.com         # your own provider
npx zerosmtp-check mail.example.com --port 25
npx zerosmtp-check --json                     # for a monitoring job
```

`--insecure` does **not** turn verification off. It lets the check continue
past a certificate failure so the report can tell you *why* it failed — which
is the point of a diagnostic. Old printer firmware failing on a Let's Encrypt
chain is a different problem from a hostname mismatch, and you cannot tell
which without looking.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | every tested port reachable, TLS fine, certificate valid |
| `1` | at least one problem found |
| `2` | the host could not be resolved |

Suitable for a monitoring check: `zerosmtp-check --json` plus the exit code.

## Zero dependencies, on purpose

A diagnostic that needs `npm install` to work is useless on the machine where
things are already broken. And a tool you point at your own mail
infrastructure should not be dragging in a dependency tree you have to audit
first. Node's `net`, `tls` and `dns` are enough.

## Related

Written alongside [ZeroSMTP](https://github.com/msgwing/ZeroSMTP), a free SMTP
relay for devices that cannot do OAuth 2.0 — built for the Microsoft 365 Basic
authentication shutdown at the end of December 2026. This tool is useful
regardless of whether you use that relay: point it at whatever host you send
through.

- [What each SMTP error message means](https://docs.msgwing.com/ERROR-MESSAGES.html)
- [Troubleshooting a send that hangs](https://docs.msgwing.com/TROUBLESHOOTING.html)
- [Which printers and MFPs have OAuth firmware](https://docs.msgwing.com/DEVICE-COMPATIBILITY.html)

MIT.
