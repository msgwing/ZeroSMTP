<div align="center">

![ZeroSMTP](docs/assets/banner.png)

**Everything you need for the Microsoft 365 SMTP AUTH shutdown.**<br>
Find out what breaks in your tenant, check whether your hardware has a way
out, and keep it sending — including a free relay for the devices that will
never speak OAuth.<br>
The relay is free with no paid tier, capped at **200 messages/day**, and sends
from a shared `@msgwing.com` address rather than your own
([why](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)).

[![mx.msgwing.com status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/status.json)](https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml)
[![Exchange Online Basic auth countdown](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)
[![Lint examples](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml/badge.svg)](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml)
[![21 ready-to-run examples](https://img.shields.io/badge/examples-21%20ready--to--run-blue)](#code-examples)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Exchange Online Basic auth (SMTP AUTH) countdown](https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown-card.svg)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)

[**Get a free account →**](https://msgwing.com) · [**Exchange Online migration →**](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Documentation site](https://docs.msgwing.com/) · [Quickstart](#quickstart) · [Code examples](#code-examples) · [FAQ](docs/FAQ.md) · [Polski](README.pl.md)

</div>

## What's in here

| | |
| --- | --- |
| **1. Audit your tenant** | [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1) — read-only. Reports every mailbox that can still use SMTP AUTH, counting the ones that *inherit* the tenant setting separately, because the usual `-eq $false` one-liner misses those entirely and can report zero on a fully exposed tenant. |
| **2. Check your hardware** | [Compatibility list](docs/DEVICE-COMPATIBILITY.md) — machine-readable, backed by [`data/devices.json`](data/devices.json). Which models have OAuth firmware, and [which ones the vendor has ruled out](docs/NO-OAUTH-FIRMWARE.md) with a link to every vendor statement. |
| **3. Keep it sending** | A free SMTP relay that still accepts a username and password, with [21 code examples across 19 languages](#code-examples), [Ansible and Docker Compose recipes](#deployment-recipes), and [printer setup by brand](docs/PRINTERS.md). |

Plus [what every error message actually means](docs/ERROR-MESSAGES.md), and a
[migration guide](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) that covers Graph API,
Direct Send and paid relays — not just this one.

> **Getting `535 5.7.139 Authentication unsuccessful, basic authentication is disabled`?**
> That's Microsoft switching off Basic auth for SMTP AUTH — [start
> here](docs/ERROR-MESSAGES.md). Three of the four causes are still reversible
> until the end of December 2026.

---

```bash
curl --url "smtps://mx.msgwing.com:465" \
  --user "$ZEROSMTP_USERNAME:$ZEROSMTP_PASSWORD" \
  --mail-from "$ZEROSMTP_FROM" --mail-rcpt "$ZEROSMTP_TO" \
  --upload-file <(printf 'Subject: Test\r\n\r\nHello from ZeroSMTP!') --ssl-reqd
```

That's the whole thing — no SDK, no API key, just SMTP credentials that work
with anything that already speaks SMTP.

| | |
| --- | --- |
| **Server** | `mx.msgwing.com` |
| **Port** | `587` (STARTTLS) or `465` (SSL/TLS) |
| **Login** | your randomly generated `@msgwing.com` address |
| **Cost** | free — up to 200 emails/day ([limits](docs/TROUBLESHOOTING.md#sending-limits-rate-limiting)) |
| **Catch** | mail is sent *from* `@msgwing.com`, not your own domain ([why](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) |

## Quickstart

1. Register and activate a free account at [msgwing.com](https://msgwing.com), then copy your randomly generated `@msgwing.com` login and password.
2. Copy [`.env.example`](.env.example) to `.env` and fill in your credentials.
3. Run the curl snippet above (`export $(grep -v '^#' .env | xargs)` first), or pick your language from the [Code Examples](#code-examples) table — every example reads the same `.env` variables.
4. Having trouble? See [Error messages](docs/ERROR-MESSAGES.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) — most first-run failures are a cloud provider blocking outbound SMTP ports, not a misconfiguration.

> Prefer not to install anything locally? Every runtime used below (Python, PHP,
> Node, Ruby, Go, Java, Kotlin/Gradle, .NET, Rust) is preinstalled in the
> included [Dev Container / Codespace](.devcontainer/devcontainer.json).
> [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/msgwing/ZeroSMTP)

![Connectivity check against mx.msgwing.com](docs/assets/connection-check.png)

## Why ZeroSMTP?

- **Nothing to run and nothing to pay for.** No mail server, no API key, no
  credit card, no per-email pricing tier to graduate into.
- **Works with anything that already speaks SMTP** — apps, scripts, network
  printers, NAS boxes, IoT hardware. If it has a "SMTP server" field, it works.
- **Plain SMTP AUTH still accepted.** No OAuth2 flow to implement, which is
  the whole point for old devices that will never get a firmware update.
- **Managed reputation.** Accounts are randomly generated on a domain that's
  actively monitored for abuse, so you're not warming up an IP yourself.
- **21 copy-paste examples** across 19 languages, all reading the same
  environment variables, plus Ansible and Docker Compose recipes and setup
  guides for Windows Server, Linux, and printers by brand.
- **Verifiably up** — the status badge above is a real check that runs against
  `mx.msgwing.com` every 6 hours, not a static image.

Good for: contact forms · password resets · CI/CD and monitoring alerts ·
scan-to-email · IoT and device notifications · homelabs.

> ### ⚠️ Losing SMTP AUTH on Exchange Online / Microsoft 365?
> Microsoft disables Basic authentication for SMTP AUTH by default at the
> **end of December 2026**. Printers, NAS boxes, backup jobs and monitoring
> tools that can't do OAuth stop sending — and the alerting ones fail
> *silently*, so you find out during the incident they should have warned
> you about.
>
> **[Migration guide →](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)** covers every
> option (Graph API, Direct Send, on-prem relay, paid services), not just
> this one. **[What breaks →](docs/AFFECTED-SYSTEMS.md)** is the audit list,
> including models whose vendor has said no OAuth firmware is coming.
>
> **Run [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1)** to get the
> answer for your own tenant. Read-only, and it counts the mailboxes that
> inherit the tenant setting — the ones the usual one-liner misses.

Setup guides: [Network printers](docs/PRINTERS.md) · [Popular applications](docs/APPS.md) · [Linux (Debian/Ubuntu/Rocky/Fedora/openSUSE)](docs/LINUX.md) · [System-wide mail relay (Postfix/msmtp/Exim4)](docs/SYSTEM-MTA.md) · [Windows Server](docs/WINDOWS-SERVER.md) · [Exchange Online SMTP AUTH migration](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Monitoring alerts](docs/MONITORING.md) · [OAuth compatibility list](docs/DEVICE-COMPATIBILITY.md) · [No OAuth firmware coming](docs/NO-OAUTH-FIRMWARE.md) · [Device case studies](docs/DEVICE-CASE-STUDIES.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Reliability (retries)](docs/RELIABILITY.md) · [vs. other free relays](docs/ALTERNATIVES.md) · [FAQ](docs/FAQ.md)

## How does this compare to other options?

|  | ZeroSMTP | Gmail SMTP relay | Amazon SES | Mailgun / SendGrid / Brevo (typical free tier) |
| --- | --- | --- | --- | --- |
| Cost | Free, no card required | Free (personal Google account) | Pay-per-email (a limited free allowance only applies from AWS EC2, first 12 months) | Free tier, usually capped low and gated behind signup + domain verification |
| Setup | Register, copy SMTP credentials, done | Needs a Google account; Google's terms discourage automated/bulk sending over it | Needs an AWS account, plus a "production access" request before sending to unverified addresses | Signup + domain verification for full features |
| Custom "From" domain | No — always `@msgwing.com` (see [FAQ](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) | Yes, your Gmail/Workspace address | Yes | Yes, once your domain is verified |
| Best fit | Contact forms, password resets, notifications, printers/IoT — anywhere the from-address doesn't need to be your own domain | Low-volume personal scripts | Production apps that need it and can handle the AWS setup | Businesses that need branded sending and can handle the setup |

Free-tier terms above change over time — check each provider's current
pricing page before committing to one.

### What about self-hosting my own mail server?

Popular self-hosted options like [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver),
[Mailu](https://github.com/Mailu/Mailu), or [mailcow](https://github.com/mailcow/mailcow-dockerized)
give you a mailbox on your own domain and full control — but you're the one
running Postfix, DKIM/SPF/DMARC, spam filtering, and IP/domain reputation,
which is real ongoing maintenance, not a one-time setup. ZeroSMTP is the
other end of that trade-off: zero setup and zero maintenance, in exchange
for sending from the shared `@msgwing.com` address instead of your own
domain. If you already run one of those and it's working, there's no reason
to switch. If you're not sure the effort is worth it yet for a script,
contact form, or side project, ZeroSMTP costs nothing to try first.

## GitHub Actions

Using ZeroSMTP from a workflow (CI failure alerts, deploy notifications,
scheduled reports)? [`msgwing/send-email-action`](https://github.com/msgwing/send-email-action)
on the [GitHub Marketplace](https://github.com/marketplace/actions/zerosmtp-send-email)
wraps the setup below into one step:

```yaml
- uses: msgwing/send-email-action@v1
  with:
    username: ${{ secrets.ZEROSMTP_USERNAME }}
    password: ${{ secrets.ZEROSMTP_PASSWORD }}
    from: ${{ secrets.ZEROSMTP_USERNAME }}
    to: you@example.com
    subject: "Build failed"
    body: "See the run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

## Code Examples

Ready-to-run, production-ready examples for `mx.msgwing.com:465` (SSL/TLS) or
`:587` (STARTTLS), one file per language:

| Language | File |
| --- | --- |
| Python | [python-zerosmtp.py](python-zerosmtp.py) |
| PHP (PHPMailer) | [php-zerosmtp.php](php-zerosmtp.php) |
| PHP (Symfony Mailer) | [php-symfony-mailer-zerosmtp.php](php-symfony-mailer-zerosmtp.php) |
| Node.js | [node-zerosmtp.mjs](node-zerosmtp.mjs) |
| TypeScript | [ts-zerosmtp.ts](ts-zerosmtp.ts) |
| Bash (curl) | [bash-curl-zerosmtp.sh](bash-curl-zerosmtp.sh) |
| Bash (swaks) | [bash-swaks-zerosmtp.sh](bash-swaks-zerosmtp.sh) |
| Java | [java-zerosmtp.java](java-zerosmtp.java) |
| C# (.NET / MailKit) | [cs-zerosmtp.cs](cs-zerosmtp.cs) |
| Go | [go-zerosmtp.go](go-zerosmtp.go) |
| Ruby | [ruby-zerosmtp.rb](ruby-zerosmtp.rb) |
| Rust | [rust-zerosmtp.rs](rust-zerosmtp.rs) |
| Kotlin | [kotlin-zerosmtp.kt](kotlin-zerosmtp.kt) |
| Elixir | [elixir-zerosmtp.exs](elixir-zerosmtp.exs) |
| Lua | [lua-zerosmtp.lua](lua-zerosmtp.lua) |
| Perl | [perl-zerosmtp.pl](perl-zerosmtp.pl) |
| C (libcurl) | [c-zerosmtp.c](c-zerosmtp.c) |
| Dart | [dart-zerosmtp.dart](dart-zerosmtp.dart) |
| Zig (libcurl) | [zig-zerosmtp.zig](zig-zerosmtp.zig) |
| Swift | [swift-zerosmtp.swift](swift-zerosmtp.swift) |
| PowerShell | [pwsh-zerosmtp.ps1](pwsh-zerosmtp.ps1) |

Each example reads credentials from `ZEROSMTP_*` environment variables
(`ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`, `ZEROSMTP_TO`,
`ZEROSMTP_SUBJECT`) — never hardcode real credentials into a script.

### Deployment recipes

Not every migration is a code change. Two of the places SMTP settings
actually live:

| Recipe | File | What it does |
| --- | --- | --- |
| Ansible | [ansible-zerosmtp.yml](ansible-zerosmtp.yml) | Points a fleet's system mailer (cron, unattended-upgrades, `systemd OnFailure=`) at the relay via msmtp. Idempotent; credentials come from `-e` or ansible-vault, never from the file. |
| Docker Compose | [docker-compose-zerosmtp.yml](docker-compose-zerosmtp.yml) | Runs one send from a container, reading `.env`. Useful for testing the credentials from inside the network the real app runs in. |

### Installing dependencies

Every example that needs a third-party library has a matching manifest at
the repo root, so you can install with each ecosystem's normal command
instead of hunting down library names/versions yourself:

| Language(s) | Install with |
| --- | --- |
| Node.js / TypeScript | `npm install` |
| PHP | `composer install` |
| Rust | `cargo build` (fetches deps automatically) |
| C# | `dotnet build cs-zerosmtp.csproj` |
| Java | `mvn compile` |
| Kotlin | `gradle build` |
| Swift | `swift build` |
| Zig | `zig build-exe zig-zerosmtp.zig -lc -lcurl` (needs libcurl headers) |
| Python, Ruby, Go, Bash, PowerShell | none — standard library only |

Easy Configuration:
- Login: randomly generated address @msgwing.com
- SMTP Server: mx.msgwing.com
- Port: 587 (STARTTLS) or 465 (SSL/TLS)
- Encryption: SSL/TLS - required

We respect your privacy - your data is not processed for any marketing or commercial purposes.

## Security & Deliverability

**✓ Domain Reputation Enhanced**: The msgwing.com domain reputation has been improved, with strict anti-spam measures enforced. All spam accounts have been blocked and removed to ensure optimal email deliverability for legitimate users.

### Verify Your Domain Reputation

Interested in checking the reputation of msgwing.com? You can test this yourself using [mail-tester.com](https://mail-tester.com/):

1. Create a free SMTP account at [msgwing.com](https://msgwing.com)
2. Use our PowerShell test script: [SendEmailTest_mail-tester.com.ps1](SendEmailTest_mail-tester.com.ps1)
3. Generate a random email at mail-tester.com and send a test message from your @msgwing.com address
4. Check the reputation score and detailed analysis

**✓ Security Improvements**: We have implemented comprehensive security enhancements to the msgwing.com service, including improved authentication protocols, enhanced abuse monitoring, and strengthened infrastructure security measures.

---

If you have any questions, feel free to contact us: abuse@msgwing.com

Great deliverability • Random high-reputation account • No costs • Full privacy • Works with everything

Start sending emails today - completely free and with no hidden rules!

Registration is available at: https://msgwing.com

## Star History

[![GitHub stars](https://img.shields.io/github/stars/msgwing/ZeroSMTP?style=social)](https://star-history.com/#msgwing/ZeroSMTP&Date)
