# Linux Setup Guide (Debian, Ubuntu, Rocky Linux, Fedora, openSUSE)

Every example in this repo runs on any of these distributions — the SMTP
connection itself (port 587/465, TLS) is identical everywhere. What differs
is how you install the prerequisites. This page is a quick reference so you
don't have to guess package names per distro.

> Don't want to install anything locally at all? Open this repo in the
> included [Dev Container](https://github.com/msgwing/ZeroSMTP/blob/main/.devcontainer/devcontainer.json) (or as a
> GitHub Codespace via the badge in the [README](https://github.com/msgwing/ZeroSMTP#readme)) — every
> runtime in the tables below comes preinstalled.

## Base tools (curl, openssl)

Needed for [`check-connection.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.sh) and
[`bash-curl-zerosmtp.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/bash-curl-zerosmtp.sh).

| Distro | Command |
| --- | --- |
| Debian / Ubuntu | `sudo apt update && sudo apt install -y curl openssl` |
| Rocky Linux | `sudo dnf install -y curl openssl` |
| Fedora | `sudo dnf install -y curl openssl` |
| openSUSE | `sudo zypper install -y curl openssl` |

curl and openssl ship preinstalled on most of these distros already —
this is only needed for minimal/container base images.

## swaks (for [`bash-swaks-zerosmtp.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/bash-swaks-zerosmtp.sh))

`swaks` isn't in every distro's default repos the same way:

| Distro | Command |
| --- | --- |
| Debian / Ubuntu | `sudo apt install -y swaks` |
| Fedora | `sudo dnf install -y swaks` (in Fedora's own repos) |
| Rocky Linux | `sudo dnf install -y epel-release && sudo dnf install -y swaks` (needs [EPEL](https://docs.fedoraproject.org/en-US/epel/)) |
| openSUSE | `sudo zypper addrepo https://download.opensuse.org/repositories/server:mail/openSUSE_Tumbleweed/server:mail.repo && sudo zypper refresh && sudo zypper install -y swaks` (adjust the repo URL for your openSUSE version) |

## Language runtimes

Only install what you need for the example(s) you're using — see the
[Code Examples table](https://github.com/msgwing/ZeroSMTP#code-examples) for which file needs which.

| Language | Debian/Ubuntu (`apt`) | Rocky/Fedora (`dnf`) | openSUSE (`zypper`) |
| --- | --- | --- | --- |
| Python | `python3` | `python3` | `python3` |
| PHP + Composer | `php-cli composer` | `php-cli composer` | `php composer` |
| Node.js / TypeScript | `nodejs npm` | `nodejs npm` | `nodejs npm` |
| Ruby | `ruby` | `ruby` | `ruby` |
| Lua | `lua5.4 lua-socket lua-sec` | `lua lua-socket lua-sec` | `lua54 lua-socket lua-sec` |
| Perl | `libio-socket-ssl-perl libauthen-sasl-perl` | `perl-IO-Socket-SSL perl-Authen-SASL` | `perl-IO-Socket-SSL perl-Authen-SASL` |
| C (libcurl) | `gcc libcurl4-openssl-dev` | `gcc libcurl-devel` | `gcc libcurl-devel` |
| Dart | see [Dart's install docs](https://dart.dev/get-dart) — package names vary by distro | same | same |
| Go | `golang-go` | `golang` | `go` |
| Java | `default-jdk` | `java-21-openjdk-devel` | `java-21-openjdk-devel` |
| Kotlin | install [Gradle](https://gradle.org/install/) manually (no build needed — `gradle build` fetches Kotlin itself) | same | same |
| .NET / C# | see [Microsoft's install docs](https://learn.microsoft.com/dotnet/core/install/linux) — package names vary by exact distro version | same | same |
| Rust | `curl https://sh.rustup.rs -sSf \| sh` (via [rustup](https://rustup.rs/), same on every distro) | same | same |
| Maven (for the Java example) | `maven` | `maven` | `maven` |

## Want the whole system to relay through ZeroSMTP?

If you want cron jobs, `mail`/`sendmail`, or monitoring tools to send
through ZeroSMTP instead of a specific script, see
[SYSTEM-MTA.md](SYSTEM-MTA.md) for Postfix (satellite/smarthost mode),
msmtp, and Exim4 configuration.

### More than one machine

Doing the msmtp setup by hand is fine once. For a fleet, use
[`ansible-zerosmtp.yml`](https://github.com/msgwing/ZeroSMTP/blob/main/ansible-zerosmtp.yml),
which does the same thing — installs msmtp and the sendmail shim, writes
`/etc/msmtprc` at mode 0600, redirects root's mail to a real address, and
verifies the result with `msmtp --pretend`:

```bash
ansible-playbook -i inventory.ini ansible-zerosmtp.yml -e zerosmtp_username=you@msgwing.com -e zerosmtp_password=... -e zerosmtp_from=you@msgwing.com -e zerosmtp_to=alerts@example.com
```

Keep the password out of your shell history by putting these variables in
an `ansible-vault` file instead and running with `--ask-vault-pass`.

## Connectivity

Everything else — firewall rules, ports, TLS — behaves the same across all
five distros; there's nothing distro-specific to configure for outbound
SMTP. If a send hangs or times out, it's almost always the network (cloud
provider or ISP blocking outbound SMTP), not the OS — run
[`check-connection.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.sh) first and see
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).
