# Code Examples

Ready-to-run, production-ready examples for `mx.msgwing.com:465` (SSL/TLS) or
`:587` (STARTTLS), one file per language — all in the
[GitHub repository](https://github.com/msgwing/ZeroSMTP):

| Language | File |
| --- | --- |
| Python | [python-zerosmtp.py](https://github.com/msgwing/ZeroSMTP/blob/main/python-zerosmtp.py) |
| PHP (PHPMailer) | [php-zerosmtp.php](https://github.com/msgwing/ZeroSMTP/blob/main/php-zerosmtp.php) |
| PHP (Symfony Mailer) | [php-symfony-mailer-zerosmtp.php](https://github.com/msgwing/ZeroSMTP/blob/main/php-symfony-mailer-zerosmtp.php) |
| Node.js | [node-zerosmtp.mjs](https://github.com/msgwing/ZeroSMTP/blob/main/node-zerosmtp.mjs) |
| TypeScript | [ts-zerosmtp.ts](https://github.com/msgwing/ZeroSMTP/blob/main/ts-zerosmtp.ts) |
| Bash (curl) | [bash-curl-zerosmtp.sh](https://github.com/msgwing/ZeroSMTP/blob/main/bash-curl-zerosmtp.sh) |
| Bash (swaks) | [bash-swaks-zerosmtp.sh](https://github.com/msgwing/ZeroSMTP/blob/main/bash-swaks-zerosmtp.sh) |
| Java | [java-zerosmtp.java](https://github.com/msgwing/ZeroSMTP/blob/main/java-zerosmtp.java) |
| C# (.NET / MailKit) | [cs-zerosmtp.cs](https://github.com/msgwing/ZeroSMTP/blob/main/cs-zerosmtp.cs) |
| Go | [go-zerosmtp.go](https://github.com/msgwing/ZeroSMTP/blob/main/go-zerosmtp.go) |
| Ruby | [ruby-zerosmtp.rb](https://github.com/msgwing/ZeroSMTP/blob/main/ruby-zerosmtp.rb) |
| Rust | [rust-zerosmtp.rs](https://github.com/msgwing/ZeroSMTP/blob/main/rust-zerosmtp.rs) |
| Kotlin | [kotlin-zerosmtp.kt](https://github.com/msgwing/ZeroSMTP/blob/main/kotlin-zerosmtp.kt) |
| Elixir | [elixir-zerosmtp.exs](https://github.com/msgwing/ZeroSMTP/blob/main/elixir-zerosmtp.exs) |
| Lua | [lua-zerosmtp.lua](https://github.com/msgwing/ZeroSMTP/blob/main/lua-zerosmtp.lua) |
| Perl | [perl-zerosmtp.pl](https://github.com/msgwing/ZeroSMTP/blob/main/perl-zerosmtp.pl) |
| C (libcurl) | [c-zerosmtp.c](https://github.com/msgwing/ZeroSMTP/blob/main/c-zerosmtp.c) |
| Dart | [dart-zerosmtp.dart](https://github.com/msgwing/ZeroSMTP/blob/main/dart-zerosmtp.dart) |
| Zig (libcurl) | [zig-zerosmtp.zig](https://github.com/msgwing/ZeroSMTP/blob/main/zig-zerosmtp.zig) |
| Swift | [swift-zerosmtp.swift](https://github.com/msgwing/ZeroSMTP/blob/main/swift-zerosmtp.swift) |
| PowerShell | [pwsh-zerosmtp.ps1](https://github.com/msgwing/ZeroSMTP/blob/main/pwsh-zerosmtp.ps1) |

## Deployment recipes

Not every migration is a code change — often the SMTP settings live in a
configuration management tool or a container definition instead:

| Recipe | File | What it does |
| --- | --- | --- |
| Ansible | [ansible-zerosmtp.yml](https://github.com/msgwing/ZeroSMTP/blob/main/ansible-zerosmtp.yml) | Points a fleet's system mailer (cron, unattended-upgrades, `systemd OnFailure=`) at the relay via msmtp. See [Linux setup](LINUX.md) for the manual equivalent. |
| Docker Compose | [docker-compose-zerosmtp.yml](https://github.com/msgwing/ZeroSMTP/blob/main/docker-compose-zerosmtp.yml) | Sends one message from a container, reading credentials from `.env`. |

Each example reads credentials from `ZEROSMTP_*` environment variables
(`ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`, `ZEROSMTP_TO`,
`ZEROSMTP_SUBJECT`) — never hardcode real credentials into a script.

See the [Quickstart](index.md#get-started) for how to get `@msgwing.com`
credentials, and [Troubleshooting](TROUBLESHOOTING.md) if a send hangs or
fails.
