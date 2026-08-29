# Changelog

## [1.8.0] - 2026-08-29

Competitive review, measured rather than recalled: the nearest comparable
project is referenced in 73 files across other people's repositories and this
one in 0 - not from lack of use, but because a config holding our hostname also
holds a password, so nobody commits it. A workflow file is the exception, which
makes the action the one artefact of ours that can travel. It needed a reason to
be in a stranger's pipeline, and checking our host was not one.

### Added
- **The action scans the caller's own repository.** `scan:` takes a path and
  reports which files point at a Microsoft 365 SMTP endpoint that stops
  accepting a username and password at the end of December 2026. It uses the
  same three endpoints `data/blast-radius.json` counts across public GitHub, so
  a caller's number and the number on the site mean the same thing - currently
  25,728 files, up 3.1% in eight days.
- `fail-on-findings:` for pipelines that want the build to stop. Off by
  default: failing a stranger's build on the first run is how an action gets
  removed the same afternoon.

### Changed
- **A moving `v1` tag.** Until now the documentation pinned `@v1.7.0`, so
  everyone told to use it would have stayed on a version without the scan
  unless they read a changelog. `msgwing/send-email-action` already used a
  moving tag; this repository did not, and the inconsistency was an oversight
  rather than a decision.

## [1.7.0] - 2026-08-22

The project's own tool became worth installing, and the one GitHub surface it
was absent from is ready to list it.

### Added
- **A GitHub Action.** `action.yml` at the repository root checks outbound SMTP
  from a runner and **fails the job when the mail server's certificate is
  inside a window you set**. Nobody watches a mail certificate; it expires on a
  Sunday and the first report is somebody saying scanning stopped working.
  `fail-on-error: false` covers the other use, a scheduled canary that should
  not page anyone. No install and no npm - the tool has no dependencies, so the
  action runs the file shipped beside it.
- **`zerosmtp-check --explain`.** Paste the refusal your own client printed - a
  Postfix SASL line, a Python traceback, `1102` off a Kyocera panel, or the
  `curl: (67) Login denied` that shows none of the server's answer. Four
  strings, one cause. It says which case you are in and whether it can still be
  turned back on before the end of December 2026, and exits 1 rather than
  guessing when it has no record of the string.
- **Port 25** is checked by default and goes first, because it is the one a
  provider is most likely to block.
- An issue form for error strings, which is what feeds the pages above.

### Fixed
- AUTH mechanisms are de-duplicated. `poczta.interia.pl` advertises
  `AUTH PLAIN LOGIN PLAIN LOGIN PLAIN LOGIN`; that is genuinely what it sends,
  and printing it back verbatim reads like a fault when it is a duplicated SASL
  config. The repetition now gets its own line.
- Importing the tool no longer opens sockets as a side effect, which is why its
  only piece of pure string handling had never been testable offline.
- The docs claimed port 25 offers no AUTH on "most" servers. Never measured,
  and two of two hosts tried disproved it. The claim is gone; the report says
  what the server said.
- Every error page, the README and the package's own homepage now name the tool
  that answers the question they are about. None of them did.

## [Unreleased]

### Added
- `zerosmtp-check` is on npm. `npx zerosmtp-check` runs the connection test
  with no install and no clone, published from CI with provenance, so the
  tarball can be traced back to the workflow run and commit that built it.

### Fixed
- The status panel on docs.msgwing.com and the generated `BLAST-RADIUS.md`
  both offer `npx zerosmtp-check` again. Both had been carrying a comment
  saying the package 404s, which stopped being true the moment it was
  published; a stale reason in a source file is how a correct decision gets
  reversed by somebody who reads it a month later.

## [1.6.0] - 2026-08-17

The relay's status is now visible where readers actually are, and the
automation around the project stopped lying about its own results.

### Added
- Live relay status in the header of every page on docs.msgwing.com, reading
  the project's own `status.json`. Clicking it fetches the most recent check
  at that moment - both ports, how long ago, a link to the run - and offers
  `Test-NetConnection` and `openssl s_client` for testing from your own
  network. Nothing third-party is loaded, and with JavaScript unavailable it
  still names the host, both ports and the run history.
- A connection card at the top of the docs homepage: server and both ports in
  large monospace with a copy button each, the live status, and one link to
  registration. The 200/day cap and the shared `@msgwing.com` from-address are
  inside the card rather than in a footnote.
- `.github/workflows/listings-radar.yml`: a weekly, draft-only scout for
  curated directories the project could be listed in. It never opens a pull
  request and never comments - it queues an issue with a draft entry and that
  list's own submission rules.
- Queued drafts and outage alerts are assigned to the repository owner, so
  they arrive as an email with a direct link.

### Changed
- The healthcheck runs every 15 minutes instead of every 6 hours, and a run
  that starts while an alert is open stays and re-probes every 30 seconds
  until the relay returns. Recovery is published within about half a minute
  rather than up to six hours. A first failure is confirmed twice before any
  alert is raised.
- `lint.yml` cancels superseded pull-request runs. Three pushes in a minute
  used to start three full matrices while the first two held runners.
- `blast-radius.yml` publishes its weekly sample to the `status` branch
  instead of pushing to the protected `main` branch.

### Fixed
- The status badge could sit on "degraded" for hours after the relay came
  back, and a single transient timeout was enough to put it there.
- `blast-radius.yml` had failed on every run it ever had: it measured the
  number correctly and then threw it away. Three separate faults - a push to a
  protected branch, a checkout that could not switch branches, and a retry
  budget too short to outlast the code-search rate limit. Its first successful
  measurement published on 2026-08-17: 24,960 public files containing
  `smtp.office365.com`.
- The outreach queue was half noise. `basic authentication` alone is not a
  mail signal, so an OpenStreetMap API change, an Azure FTP setting and an
  F5OS plugin were all queued as leads. A candidate now has to name both a
  mail problem and an authentication problem, and threads that are closed,
  long dead, already answered by us, or belong to abuse tooling are skipped.
- The status panel offered `npx zerosmtp-check`, a package that returns 404
  because it has never been published.

## [1.5.0] - 2026-08-16

### Added
- `.github/workflows/draft-release.yml`: automatic Draft release notes from the
  CHANGELOG whenever a `v*` tag is pushed. Draft, never published without a
  click — releases are the project's public face and stay owner-controlled.

## [1.3.0] - 2026-07-26

All 12 CI jobs (one per language/script surface) are green as of this
release — confirmed by actually running the workflow, not just by reading
the code.

### Changed
- Replaced the unmaintained Kitura/Swift-SMTP dependency in
  `swift-zerosmtp.swift` with `sersoft-gmbh/swift-smtp` (SwiftNIO-based,
  actively maintained, async/await-native). Kitura's dependency chain
  failed to compile against the OpenSSL version on current Linux — not
  fixable from this repo.
- `.github/workflows/lint.yml`: the `swift` job no longer needs
  `continue-on-error`.

### Fixed
Found only by actually running each build in CI, not by review:
- `java-zerosmtp.java`: two unreported checked exceptions
  (`Thread.join()`'s `InterruptedException`, and the two-argument
  `InternetAddress` constructor's `UnsupportedEncodingException`) — a
  real compile error present since the file was first written.
- `kotlin-zerosmtp.kt`: `createMultipartMessage` returned the base
  `Message` type instead of `MimeMessage`, but the caller read
  `.messageID`, which only `MimeMessage` exposes.
- `.github/workflows/lint.yml`: the Kotlin job's pinned Gradle version
  (8.10) was too old for the Kotlin Gradle plugin (2.4.x needs Gradle
  9.6+); bumped to 9.6.1.
- `swift-zerosmtp.swift`: two Swift 6 strict-concurrency errors —
  `EventLoopGroup.syncShutdownGracefully()` called from an async
  context, and touching the non-Sendable C `stderr` global via
  `fputs`. Replaced with the async shutdown API and
  `FileHandle.standardError`.
- `Package.swift`: swift-smtp 2.17.0+ requires Swift tools-version 6.3,
  which `swift-actions/setup-swift@v2` cannot install yet (max 6.2);
  pinned to the exact last release built against 6.2 (`2.16.0`).

## [1.2.0] - 2026-07-26

### Added
- Dependency manifests for every example that needs a third-party
  library: `package.json`/`tsconfig.json` (Node.js/TypeScript),
  `composer.json` (PHP), `Cargo.toml` (Rust), `Package.swift` (Swift),
  `cs-zerosmtp.csproj` (C#), `pom.xml` (Java), `build.gradle.kts` +
  `settings.gradle.kts` (Kotlin) — install with each ecosystem's normal
  command instead of hunting down library names/versions
- `check-connection.sh` / `check-connection.ps1`: connectivity-only
  healthcheck (DNS, TCP, TLS handshake) against `mx.msgwing.com` that
  sends no email and needs no credentials
- `docs/RELIABILITY.md`: retry-with-backoff pattern for transient (4xx)
  SMTP failures, with a Python reference implementation
- `docs/TROUBLESHOOTING.md` "Sending limits" section documenting the
  actual per-minute/hour/day rate limits and the 15-recipients-per-message
  cap
- `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/lint.yml` now really builds the C#, Java, Kotlin,
  and Rust examples (previously skipped for lack of a manifest); Swift
  is included as best-effort (`continue-on-error`)

### Fixed
- `cs-zerosmtp.cs`: `required` is not valid on positional record
  constructor parameters — removed (positional parameters are already
  mandatory) after a real `dotnet build` failed on it
- `cs-zerosmtp.csproj` initially pinned `MailKit` 4.8.0, which has a
  known moderate-severity vulnerability
  ([GHSA-9j88-vvj5-vhgr](https://github.com/advisories/GHSA-9j88-vvj5-vhgr)/CVE-2026-41319,
  STARTTLS response injection / SASL downgrade); bumped to 4.16.0+
- `rust-zerosmtp.rs` / `Cargo.toml` header comments referenced `lettre
  0.12`, which does not exist on crates.io; corrected to the real
  current `0.11.x` line
- `node-zerosmtp.mjs` / `ts-zerosmtp.ts` / `package.json` header
  comments referenced `nodemailer 6.9.15`; corrected to the real
  current major (`nodemailer` 9.x, `typescript` 7.x) after checking the
  npm registry
- `java-zerosmtp.java` / `kotlin-zerosmtp.kt` header comments claimed
  "Jakarta Mail 3.0", which doesn't exist; corrected to the real latest
  spec version (2.1) after checking Maven Central

## [1.1.0] - 2026-07-26

### Added
- `docs/PRINTERS.md` and `docs/APPS.md`: SMTP relay setup guides for
  popular network printers (HP, Canon, Epson, Brother, Xerox/Konica
  Minolta) and applications (WordPress, Home Assistant, Grafana,
  Zabbix), with original illustrative diagrams
- Language index table in `README.md` / `README.pl.md` linking to all
  15 code examples
- `.github/workflows/lint.yml`: CI syntax-check for the Bash,
  PowerShell, Python, Ruby, PHP, Go, Node.js, and TypeScript examples
- `.gitattributes` enforcing LF line endings on scripts, so a Windows
  checkout can't accidentally introduce CRLF and break a shebang line
  on Linux/macOS

### Fixed
- Ruby example had an invalid `frozen_string_literal: true` magic
  comment (missing `#`), which raised a `SyntaxError` and prevented
  the script from running at all
- All examples read credentials from a plain `USERNAME` environment
  variable, which collides with the OS-reserved `USERNAME` variable on
  Windows; renamed to `ZEROSMTP_USERNAME` (and `ZEROSMTP_PASSWORD`,
  `ZEROSMTP_FROM`, `ZEROSMTP_TO`, `ZEROSMTP_SUBJECT`, `ZEROSMTP_BODY`)
  across every example and the example-specs file
- `php-zerosmtp.php` referenced a non-functional placeholder path
  (`/path/to/vendor/autoload.php`) instead of `__DIR__`
- `bash-curl-zerosmtp.sh` hardcoded a Debian/Ubuntu-specific CA bundle
  path that doesn't exist on RHEL/Fedora/macOS
- `SendEmailTest_mail-tester.com.ps1` was saved as UTF-8 without a BOM
  with Unicode status symbols (✓/✗), which corrupted parsing under
  Windows PowerShell 5.1; replaced with plain ASCII markers

### Changed
- Replaced `php-swiftmailer-zerosmtp.php` (SwiftMailer reached
  end-of-life in December 2021) with
  `php-symfony-mailer-zerosmtp.php`, using the actively maintained
  Symfony Mailer
- Replaced the deprecated `Send-MailMessage` cmdlet with
  `Send-MailKitMessage` in both PowerShell scripts
- Simplified `go-zerosmtp.go` (direct `Rcpt` call instead of
  range-over-func for a single recipient; randomized MIME boundary)
  and `kotlin-zerosmtp.kt` (removed experimental context receivers)
- Added a connection timeout to the `SmtpTransport` in
  `rust-zerosmtp.rs`

## [1.0.1] - 2026-04-02

### Added
- PowerShell test script for domain reputation verification via mail-tester.com
- Comprehensive documentation for testing email deliverability
- Enhanced security examples and best practices

### Fixed
- Improved domain reputation status
- Spam account blocking and removal
- Enhanced email authentication infrastructure

### Security
- Implemented comprehensive security enhancements to msgwing.com service
- Improved authentication protocols and procedures
- Enhanced abuse monitoring and prevention systems
- Strengthened infrastructure security measures
- Updated contact email from general address to dedicated abuse@msgwing.com for security reports

## [1.0.0] - 2026-03-30

### Added
- Multi-language support for:
  - PHP
  - Python
  - Node.js
  - TypeScript
  - Bash
  - Java
  - C#
  - Go
  - Ruby
  - Rust
  - PowerShell
  - Kotlin
  - Swift

### Changed
- Improved configuration for SSL/TLS support.

### Fixed
- Enhanced email format support for better compatibility across different email clients.
