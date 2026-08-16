# Troubleshooting

## "It just hangs / times out" — your cloud provider is probably blocking the port

This is, by far, the most common reason a first attempt fails, and it has
nothing to do with ZeroSMTP configuration. Many cloud and hosting providers
block outbound SMTP ports by default on new accounts, specifically to fight
spam:

| Provider | Default outbound SMTP behavior |
| --- | --- |
| AWS EC2 / Lightsail | Port 25 blocked by default on all accounts; a support ticket ("EC2 email sending limit removal") is required to lift it. Ports 587/465 are generally not blocked. |
| Google Cloud (GCE) | Port 25 blocked; 587/465 generally allowed. |
| Microsoft Azure | Port 25 blocked on most subscription types; 587/465 generally allowed. |
| DigitalOcean | Port 25 blocked by default for new accounts; can be requested to be lifted via support. 587/465 generally allowed. |
| Hetzner | Similar default restrictions on port 25; open a support ticket if outbound mail is core to your use case. |
| Home / office network (ISP) | Residential ISPs very commonly block outbound 25, and sometimes 587, to stop compromised machines from spamming. Check your ISP's Acceptable Use Policy. |

**This is why every example in this repository defaults to port `465`
(implicit SSL/TLS) or `587` (STARTTLS), never port `25`.** If a script hangs
until it times out rather than failing immediately, this is the first thing
to check. Run the connectivity-only healthcheck (no credentials needed, no
email sent):

```bash
npx zerosmtp-check
```

Nothing to install and nothing to clone. It resolves the host, connects on
587 and 465, does the STARTTLS or implicit-TLS handshake, checks whether
*this machine's* trust store accepts the certificate, and lists the `AUTH`
mechanisms the server offers. No credentials are sent and no mail is
delivered — the conversation stops after `EHLO`.

It works against any SMTP host, which is the point when you are trying to
establish whether the problem is the server or your network:

```bash
npx zerosmtp-check smtp.office365.com
npx zerosmtp-check mail.example.com --port 25
npx zerosmtp-check --json          # exit 0 = fine, 1 = a problem, 2 = DNS
```

If Node is not available, the repository has the same checks as scripts:

```bash
./check-connection.sh
```

```powershell
./check-connection.ps1
```

Or check manually:

```bash
# Bash/Linux/macOS — quick manual connectivity check
curl -v --connect-timeout 10 telnet://mx.msgwing.com:587
curl -v --connect-timeout 10 telnet://mx.msgwing.com:465
```

```powershell
# Windows PowerShell
Test-NetConnection -ComputerName mx.msgwing.com -Port 587
Test-NetConnection -ComputerName mx.msgwing.com -Port 465
```

If both time out from a cloud VM but work from your home network, contact
your provider's support to unblock outbound SMTP for your account/instance.

## Authentication failed

- Confirm you copied the login/password from [msgwing.com](https://msgwing.com)
  exactly — the password is shown once, right after activation.
- Confirm your account is activated (registration alone is not enough).
- Confirm the environment variables are actually set: a typo like `USERNAME`
  instead of `ZEROSMTP_USERNAME` will silently fall back to a placeholder
  value or (on Windows) your OS login name — see the note in
  [`.env.example`](https://github.com/msgwing/ZeroSMTP/blob/main/.env.example).

## Certificate / TLS verification failed

- Do not disable certificate verification to "fix" this (no code example in
  this repo does, and none should) — a cert error almost always means an
  intercepting proxy, an outdated system CA bundle, or a wrong hostname, not
  a problem with `mx.msgwing.com` itself.
- Make sure you're connecting to `mx.msgwing.com` (not an IP address) so
  hostname verification succeeds.
- Update your system's CA certificate bundle if it's very old — this is
  especially common on embedded devices (printers, scanners) whose firmware
  has a fixed, non-updatable root CA store that predates Let's Encrypt's
  `ISRG Root X1` root. One confirmed case is documented in
  [PRINTERS.md](PRINTERS.md#known-exception-canon-maxify-mb2755)
  (Canon Maxify MB2755) — treat disabling verification as a last resort for
  that specific class of device, not a general fix.

## Which port should I use?

- **587 (STARTTLS)** — the safest default; supported by nearly every SMTP
  client, library, and printer.
- **465 (Implicit SSL/TLS)** — use this if your client/device offers an
  explicit "SSL" mode separate from "STARTTLS"/"TLS", or if your network
  blocks STARTTLS negotiation on 587 but allows 465. Treat 465 as a
  fallback, not a first choice, once 587 has been confirmed to work.
  (An earlier version of this note cited the Canon Maxify MB2755 as a case
  where 587 avoided a certificate issue that 465 had — that turned out to
  depend on which certificate chain the server happened to be presenting at
  the time, not the port. See the
  [current MB2755 write-up](PRINTERS.md#known-exception-canon-maxify-mb2755).)
- **25** — not supported by ZeroSMTP for client submission, and blocked by
  most providers anyway (see above).

## Sending limits (rate limiting)

Each ZeroSMTP account is rate-limited to keep the shared `msgwing.com`
domain reputation high for everyone. Current limits (subject to change):

| Window | Sustained rate | Short burst allowance |
| --- | --- | --- |
| Per minute | 5 messages/minute | up to 20 |
| Per hour | 50 messages/hour | up to 100 |
| Per day | 200 messages/day | 200 (hard cap, no extra burst) |

Additionally, a single message can address **at most 15 recipients**
(To + Cc + Bcc combined).

If you hit a limit, the server will reject or temp-fail the send — treat
that the same as any other transient SMTP error: back off and retry later
rather than looping immediately (see [RELIABILITY.md](RELIABILITY.md)).
These limits are sized for typical transactional use (notifications,
password resets, contact forms, scan-to-email); if your application needs
sustained volume above them, contact abuse@msgwing.com before you build
around it.

**We do not offer a paid tier for high-volume or bulk sending** (e.g.
tens/hundreds of thousands of messages per day) — ZeroSMTP, including any
future paid option, stays scoped to transactional email on the shared
`msgwing.com` domain. For that kind of volume, use a dedicated bulk-sending
platform instead; for example, [EmailLabs](https://emaillabs.io/) is a
Polish provider suited to that use case — a proven solution we can
personally vouch for, having used it while supporting a large
banking-sector company, primarily for marketing and sales email
campaigns.

## This project cannot receive email

ZeroSMTP is outgoing-only: there is no inbox, IMAP, or POP3 access tied to a
`@msgwing.com` account. If a test message doesn't "come back", that's
expected — send it to a mailbox you actually control (e.g. your personal
email, or a service like [mail-tester.com](https://mail-tester.com)) to
verify delivery, as shown in
[`SendEmailTest_mail-tester.com.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/SendEmailTest_mail-tester.com.ps1).

## Still stuck?

Contact abuse@msgwing.com, or open an issue on this repository with:
the language/example you're using, the exact error message, and which port
you tried.
