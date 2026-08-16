# ZeroSMTP example specifications

Reference specifications for the single-file code examples in this repository.
Each section lists the runtime, the SMTP library, and the exact requirements
the example must satisfy.

Server: `mx.msgwing.com`, port `465` (implicit SSL/TLS) or `587` (STARTTLS).
Certificate: Let's Encrypt R3 — full verification required, no bypasses.

---

## PHP 8.3+ (PHPMailer 7.1.1)

- `PHPMailer\PHPMailer\PHPMailer`, `SMTP` classes
- `isSMTP()`, `Host = 'mx.msgwing.com'`, `Port = 465`, `SMTPSecure = PHPMailer::ENCRYPTION_SMTPS`
- `SMTPAuth = true`, credentials from `$username`, `$password`
- HTML + plain multipart (`isHTML(true)`, `AltBody`)
- `SMTPDebug = 0`, exceptions on (`$mail->Exception = true`)
- Environment placeholders: `ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`, `ZEROSMTP_TO`, `ZEROSMTP_SUBJECT`
- Single-file executable, no `mail()`, no verification bypass

## Python 3.13+ (smtplib)

- `smtplib.SMTP_SSL('mx.msgwing.com', 465, context=ssl.create_default_context(), timeout=10)`
- `EmailMessage` with HTML + plain alternative
- `match/case` error handling, `SMTPAuthenticationError` / `SMTPException`
- Context manager (`contextlib`) for connection lifecycle
- Prefixed env vars (`ZEROSMTP_*`) to avoid collisions on Windows
- No `starttls()` on port 465

## Node.js 22+ (nodemailer 9.0.5)

- ESM, `import nodemailer from 'nodemailer'`
- `createTransport({ host: 'mx.msgwing.com', port: 465, secure: true, auth, tls: { rejectUnauthorized: true } })`
- HTML + text, `async/await`, structured console error handling
- Prefixed env vars, single-file executable

## TypeScript 5.6+ (nodemailer 9.0.5)

- Same as Node.js, plus full type safety (`Transporter` type, branded types where applicable, `satisfies` operator)
- `npm run typecheck` must pass with `tsc --noEmit`

## Bash (curl 8.10+)

- `curl smtps://mx.msgwing.com:465 --ssl-reqd --url-query ...`
- Default CA trust store (no `--insecure`, no hardcoded `--cacert`)
- Heredoc message body, POSIX-compliant error handling with `trap`
- Prefixed env vars, single-file executable

## Bash (swaks 20240101+)

- `swaks --server mx.msgwing.com --port 465 --tlsc --auth LOGIN`
- `--header`, `--body` from env vars, full certificate verification
- Error handling, POSIX shebang, single-file executable

## Java 21+ (Jakarta Mail 2.0.1)

- `mail.smtp.host=mx.msgwing.com`, `mail.smtp.port=465`, `mail.smtp.ssl.enable=true`
- `Session.getInstance(props, authenticator)`, `MimeMessage`, `MimeMultipart` with HTML + plain
- Virtual threads, records, pattern matching where applicable
- Default JVM trust store, no `TrustAllCerts`
- Prefixed env vars, single-file executable

## C# 13 (.NET 10, MailKit 4.17.0 / MimeKit 4.17.0)

- `MailKit.Net.Smtp.SmtpClient`, `ConnectAsync("mx.msgwing.com", 465, SecureSocketOptions.SslOnConnect)`
- `AuthenticateAsync` with credentials, `MimeMessage` with `TextPart` + `MultipartAlternative`
- Primary constructors, required members, `async/await`
- No `System.Net.Mail.SmtpClient`
- Prefixed env vars, single-file executable

## Go 1.23+ (net/smtp)

- `net/smtp` + `crypto/tls.Dial("tcp", "mx.msgwing.com:465")`
- Single recipient via direct `client.Rcpt()` call
- Random per-message MIME boundary via `crypto/rand`
- System CA pool (`InsecureSkipVerify=false`)
- Prefixed env vars, single-file executable

## Ruby 3.4+ (Net::SMTP)

- `Net::SMTP.new('mx.msgwing.com', 465).tap { enable_tls(context: OpenSSL::SSL::VERIFY_PEER) }`
- `# frozen_string_literal: true` as the first line
- HTML + plain MIME, rescue `Net::SMTPAuthenticationError` and `OpenSSL::SSL::SSLError`
- Prefixed env vars, single-file executable

## Rust 1.85+ (lettre 0.11.23)

- `SmtpTransport::relay("mx.msgwing.com")?.port(465)`
- Default native-tls backend (not `boring-tls` — known hostname-verification bug, RUSTSEC-2026-0141)
- Explicit `.timeout(Some(Duration::from_secs(30)))`
- `anyhow::Result`, HTML + plain `MultiPart`
- No `dangerous_accept_invalid_certs()`
- Prefixed env vars, single-file executable

## PowerShell 7.5+ (Send-MailKitMessage 3.2.0)

- `Send-MailKitMessage -Server mx.msgwing.com -Port 587 -StartTLS`
- `PSCredential`, default certificate validation, `param()` block
- HTML body supported
- No `Send-MailMessage`
- Single-file executable

## Kotlin 2.0+ (Jakarta Mail 2.0.1)

- Same session/transport setup as Java, with sealed interfaces and `Result<>`
- Avoid experimental/preview language features (e.g. context receivers) — plain functions with explicit `Session` parameters
- Default JVM trust, HTML + plain `MimeMultipart`
- Prefixed env vars, single-file executable

## Swift 6.2+ (swift-smtp 2.18.0)

- `sersoft-gmbh/swift-smtp`, SwiftNIO-based (not the unmaintained Kitura/Swift-SMTP)
- `Configuration.Server` with `.ssl` encryption, `Configuration.Credentials`
- `Email` / `Email.Contact` / `Email.Body.universal`
- `async/await Mailer.send()`
- Prefixed env vars, single-file executable

---

## Server reference

| Host | Port | Protocol | Cert |
| :-- | :-- | :-- | :-- |
| `mx.msgwing.com` | `465` | Implicit SSL/TLS | Let's Encrypt R3 |
| `mx.msgwing.com` | `587` | STARTTLS | Let's Encrypt R3 |

## Requirements checklist

- Latest stable library versions (verified against package registries)
- Full certificate verification
- Production error handling
- Single-file executables
- Env var placeholders prefixed with `ZEROSMTP_`
- Modern language features
- No deprecated APIs
- No insecure bypasses
- Cross-platform