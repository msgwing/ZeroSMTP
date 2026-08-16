<div align="center">

![ZeroSMTP](docs/assets/banner.png)

**Alles für die Abschaltung von SMTP AUTH in Microsoft 365.**<br>
Finden Sie heraus, was in Ihrem Tenant ausfällt, prüfen Sie, ob es für Ihre
Hardware einen Ausweg gibt, und halten Sie den Mailversand am Laufen — inklusive
eines kostenlosen Relays für Geräte, die niemals OAuth sprechen werden.<br>
Das Relay ist kostenlos ohne Bezahlvariante, auf **200 Nachrichten/Tag** begrenzt
und versendet von einer gemeinsam genutzten `@msgwing.com`-Adresse statt von Ihrer
eigenen ([warum](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)).

[![mx.msgwing.com Status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/status.json)](https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml)
[![Countdown Exchange Online Basic Auth](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)
[![Lint examples](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml/badge.svg)](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml)
[![21 einsatzfertige Beispiele](https://img.shields.io/badge/Beispiele-21%20einsatzfertig-blue)](#codebeispiele)
[![Lizenz: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Countdown Exchange Online Basic Auth (SMTP AUTH)](https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown-card.svg)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)

[**Kostenloses Konto anlegen →**](https://msgwing.com) · [**Migration von Exchange Online →**](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Dokumentation](https://docs.msgwing.com/) · [Schnellstart](#schnellstart) · [Codebeispiele](#codebeispiele) · [FAQ](docs/FAQ.md) · [English](README.md) · [Polski](README.pl.md)

</div>

## Was hier drin ist

| | |
| --- | --- |
| **1. Tenant prüfen** | [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1) — nur lesend. Meldet jedes Postfach, das noch SMTP AUTH nutzen kann, und zählt dabei diejenigen gesondert, die die Tenant-Einstellung *erben*. Der übliche Einzeiler mit `-eq $false` übersieht genau diese und kann null melden, obwohl der gesamte Tenant offen steht. |
| **2. Hardware prüfen** | [Kompatibilitätsliste](docs/DEVICE-COMPATIBILITY.md) — maschinenlesbar, gestützt auf [`data/devices.json`](data/devices.json). Welche Modelle OAuth-Firmware bekommen und [welche der Hersteller ausgeschlossen hat](docs/NO-OAUTH-FIRMWARE.md), jeweils mit Link auf die Herstellermitteilung. |
| **3. Versand am Laufen halten** | Ein kostenloses SMTP-Relay, das weiterhin Benutzername und Passwort akzeptiert — mit [21 Codebeispielen in 19 Sprachen](#codebeispiele), [Rezepten für Ansible und Docker Compose](#rezepte-für-das-ausrollen) und [Druckereinrichtung nach Hersteller](docs/PRINTERS.md). |

Dazu [was die einzelnen Fehlermeldungen tatsächlich bedeuten](docs/ERROR-MESSAGES.md)
und ein [Migrationsleitfaden](docs/EXCHANGE-ONLINE-SMTP-AUTH.md), der Graph API,
Direct Send und kostenpflichtige Relays behandelt — nicht nur dieses hier.

> **Bekommen Sie `535 5.7.139 Authentication unsuccessful, basic authentication is disabled`?**
> Das ist Microsoft, das Basic Auth für SMTP AUTH abschaltet — [fangen Sie hier
> an](docs/ERROR-MESSAGES.md). Drei der vier Ursachen lassen sich bis Ende
> Dezember 2026 noch rückgängig machen.

---

```bash
curl --url "smtps://mx.msgwing.com:465" \
  --user "$ZEROSMTP_USERNAME:$ZEROSMTP_PASSWORD" \
  --mail-from "$ZEROSMTP_FROM" --mail-rcpt "$ZEROSMTP_TO" \
  --upload-file <(printf 'Subject: Test\r\n\r\nHello from ZeroSMTP!') --ssl-reqd
```

Mehr ist es nicht — kein SDK, kein API-Schlüssel, nur SMTP-Zugangsdaten, die mit
allem funktionieren, was bereits SMTP spricht.

| | |
| --- | --- |
| **Server** | `mx.msgwing.com` |
| **Port** | `587` (STARTTLS) oder `465` (SSL/TLS) |
| **Login** | Ihre zufällig erzeugte `@msgwing.com`-Adresse |
| **Kosten** | kostenlos — bis zu 200 E-Mails/Tag ([Limits](docs/TROUBLESHOOTING.md#sending-limits-rate-limiting)) |
| **Haken** | Der Versand erfolgt *von* `@msgwing.com`, nicht von Ihrer eigenen Domain ([warum](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) |

## Schnellstart

1. Legen Sie auf [msgwing.com](https://msgwing.com) ein kostenloses Konto an, aktivieren Sie es und kopieren Sie den zufällig erzeugten `@msgwing.com`-Login samt Passwort.
2. Kopieren Sie [`.env.example`](.env.example) nach `.env` und tragen Sie Ihre Zugangsdaten ein.
3. Führen Sie den curl-Befehl von oben aus (vorher `export $(grep -v '^#' .env | xargs)`) oder wählen Sie Ihre Sprache aus der Tabelle [Codebeispiele](#codebeispiele) — jedes Beispiel liest dieselben `.env`-Variablen.
4. Klappt etwas nicht? Siehe [Fehlermeldungen](docs/ERROR-MESSAGES.md) · [Fehlersuche](docs/TROUBLESHOOTING.md) — die meisten Fehlschläge beim ersten Versuch sind ein Cloud-Anbieter, der ausgehende SMTP-Ports blockiert, keine falsche Konfiguration.

> Sie möchten lokal nichts installieren? Jede unten verwendete Laufzeitumgebung
> (Python, PHP, Node, Ruby, Go, Java, Kotlin/Gradle, .NET, Rust) ist im
> mitgelieferten [Dev Container / Codespace](.devcontainer/devcontainer.json)
> bereits vorinstalliert.
> [![In GitHub Codespaces öffnen](https://github.com/codespaces/badge.svg)](https://codespaces.new/msgwing/ZeroSMTP)

![Verbindungsprüfung gegen mx.msgwing.com](docs/assets/connection-check.png)

## Warum ZeroSMTP?

- **Nichts zu betreiben und nichts zu bezahlen.** Kein Mailserver, kein
  API-Schlüssel, keine Kreditkarte, keine Preisstufe, in die man
  hineinwächst.
- **Funktioniert mit allem, was bereits SMTP spricht** — Anwendungen, Skripte,
  Netzwerkdrucker, NAS-Geräte, IoT-Hardware. Wenn es ein Feld „SMTP-Server"
  gibt, funktioniert es.
- **Einfaches SMTP AUTH wird weiterhin akzeptiert.** Kein OAuth2-Flow zu
  implementieren — genau darum geht es bei alten Geräten, die nie ein
  Firmware-Update bekommen werden.
- **Verwaltete Reputation.** Konten werden zufällig auf einer Domain erzeugt,
  die aktiv auf Missbrauch überwacht wird; Sie müssen also keine eigene IP
  „warmlaufen" lassen.
- **21 Beispiele zum Kopieren** in 19 Sprachen, die alle dieselben
  Umgebungsvariablen lesen, dazu Rezepte für Ansible und Docker Compose sowie
  Anleitungen für Windows Server, Linux und Drucker nach Hersteller.
- **Nachprüfbar erreichbar** — das Status-Badge oben ist eine echte Prüfung,
  die alle 6 Stunden gegen `mx.msgwing.com` läuft, kein statisches Bild.

Geeignet für: Kontaktformulare · Passwort-Zurücksetzungen · Meldungen aus CI/CD
und Monitoring · Scan-to-E-Mail · Benachrichtigungen von IoT und Geräten ·
Homelabs.

> ### ⚠️ Verlieren Sie SMTP AUTH in Exchange Online / Microsoft 365?
> Microsoft deaktiviert die Basisauthentifizierung für SMTP AUTH standardmäßig
> **Ende Dezember 2026**. Drucker, NAS-Geräte, Sicherungsaufträge und
> Monitoring-Werkzeuge, die kein OAuth beherrschen, stellen den Versand ein —
> und ausgerechnet die alarmierenden Systeme scheitern *lautlos*. Sie merken es
> also während des Vorfalls, vor dem sie hätten warnen sollen.
>
> **[Migrationsleitfaden →](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)** behandelt alle
> Optionen (Graph API, Direct Send, Relay im eigenen Netz, kostenpflichtige
> Dienste), nicht nur diese. **[Was ausfällt →](docs/AFFECTED-SYSTEMS.md)** ist
> die Prüfliste, einschließlich der Modelle, für die der Hersteller bereits
> erklärt hat, dass keine OAuth-Firmware kommt.
>
> **Führen Sie [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1) aus**,
> um die Antwort für Ihren eigenen Tenant zu bekommen. Nur lesend — und es
> zählt die Postfächer mit, die die Tenant-Einstellung erben, also genau die,
> die der übliche Einzeiler übersieht.

Einrichtungsanleitungen: [Netzwerkdrucker](docs/PRINTERS.md) · [Verbreitete Anwendungen](docs/APPS.md) · [Linux (Debian/Ubuntu/Rocky/Fedora/openSUSE)](docs/LINUX.md) · [Systemweites Mail-Relay (Postfix/msmtp/Exim4)](docs/SYSTEM-MTA.md) · [Windows Server](docs/WINDOWS-SERVER.md) · [Migration von Exchange Online SMTP AUTH](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Monitoring-Meldungen](docs/MONITORING.md) · [OAuth-Kompatibilitätsliste](docs/DEVICE-COMPATIBILITY.md) · [Keine OAuth-Firmware geplant](docs/NO-OAUTH-FIRMWARE.md) · [Fallbeispiele zu Geräten](docs/DEVICE-CASE-STUDIES.md) · [Fehlersuche](docs/TROUBLESHOOTING.md) · [Zuverlässigkeit (Wiederholversuche)](docs/RELIABILITY.md) · [im Vergleich zu anderen kostenlosen Relays](docs/ALTERNATIVES.md) · [FAQ](docs/FAQ.md)

## Wie schneidet das gegenüber anderen Optionen ab?

|  | ZeroSMTP | Gmail SMTP-Relay | Amazon SES | Mailgun / SendGrid / Brevo (typischer kostenloser Tarif) |
| --- | --- | --- | --- | --- |
| Kosten | Kostenlos, keine Karte nötig | Kostenlos (privates Google-Konto) | Abrechnung pro E-Mail (ein begrenztes Freikontingent gilt nur von AWS EC2 aus, in den ersten 12 Monaten) | Kostenloser Tarif, meist niedrig gedeckelt und an Registrierung + Domainprüfung gebunden |
| Einrichtung | Registrieren, SMTP-Zugangsdaten kopieren, fertig | Erfordert ein Google-Konto; Googles Nutzungsbedingungen raten von automatisiertem Massenversand darüber ab | Erfordert ein AWS-Konto und einen Antrag auf „Production Access", bevor an ungeprüfte Adressen versendet werden darf | Registrierung + Domainprüfung für den vollen Funktionsumfang |
| Eigene Absenderdomain | Nein — immer `@msgwing.com` (siehe [FAQ](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) | Ja, Ihre Gmail-/Workspace-Adresse | Ja | Ja, sobald Ihre Domain geprüft ist |
| Passt am besten zu | Kontaktformulare, Passwort-Zurücksetzungen, Benachrichtigungen, Drucker/IoT — überall dort, wo die Absenderadresse nicht Ihre eigene Domain sein muss | Skripte mit geringem Volumen im privaten Umfeld | Produktivanwendungen, die es brauchen und den AWS-Aufwand tragen können | Unternehmen, die markengebundenen Versand brauchen und den Aufwand tragen können |

Die Bedingungen der kostenlosen Tarife ändern sich mit der Zeit — prüfen Sie die
aktuelle Preisseite des jeweiligen Anbieters, bevor Sie sich festlegen.

### Was ist mit einem eigenen Mailserver?

Verbreitete selbst gehostete Lösungen wie [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver),
[Mailu](https://github.com/Mailu/Mailu) oder [mailcow](https://github.com/mailcow/mailcow-dockerized)
geben Ihnen ein Postfach auf der eigenen Domain und volle Kontrolle — aber Sie
sind derjenige, der Postfix, DKIM/SPF/DMARC, Spamfilterung sowie IP- und
Domain-Reputation betreibt. Das ist laufender Aufwand, keine einmalige
Einrichtung. ZeroSMTP steht am anderen Ende dieses Kompromisses: null
Einrichtung und null Wartung, dafür Versand von der gemeinsam genutzten Adresse
`@msgwing.com` statt von Ihrer eigenen Domain. Wenn Sie eine dieser Lösungen
bereits betreiben und sie funktioniert, gibt es keinen Grund zu wechseln. Wenn
Sie für ein Skript, ein Kontaktformular oder ein Nebenprojekt noch nicht sicher
sind, ob sich der Aufwand lohnt, kostet ZeroSMTP nichts, um es zuerst
auszuprobieren.

## GitHub Actions

Sie nutzen ZeroSMTP aus einem Workflow heraus (Meldungen über fehlgeschlagene
Builds, Deploy-Benachrichtigungen, geplante Berichte)?
[`msgwing/send-email-action`](https://github.com/msgwing/send-email-action)
auf dem [GitHub Marketplace](https://github.com/marketplace/actions/zerosmtp-send-email)
fasst die untenstehende Einrichtung in einem Schritt zusammen:

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

## Codebeispiele

Einsatzfertige, produktionstaugliche Beispiele für `mx.msgwing.com:465`
(SSL/TLS) oder `:587` (STARTTLS), eine Datei je Sprache:

| Sprache | Datei |
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

Jedes Beispiel liest die Zugangsdaten aus den Umgebungsvariablen `ZEROSMTP_*`
(`ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`, `ZEROSMTP_TO`,
`ZEROSMTP_SUBJECT`) — schreiben Sie echte Zugangsdaten niemals fest in ein
Skript.

### Rezepte für das Ausrollen

Nicht jede Migration ist eine Codeänderung. Zwei der Orte, an denen
SMTP-Einstellungen tatsächlich liegen:

| Rezept | Datei | Was es tut |
| --- | --- | --- |
| Ansible | [ansible-zerosmtp.yml](ansible-zerosmtp.yml) | Richtet den Systemmailer einer ganzen Maschinenflotte (cron, unattended-upgrades, `systemd OnFailure=`) über msmtp auf das Relay aus. Idempotent; die Zugangsdaten kommen über `-e` oder ansible-vault, nie aus der Datei selbst. |
| Docker Compose | [docker-compose-zerosmtp.yml](docker-compose-zerosmtp.yml) | Versendet eine Nachricht aus einem Container und liest dafür `.env`. Nützlich, um die Zugangsdaten aus genau dem Netz heraus zu prüfen, in dem die echte Anwendung läuft. |

### Abhängigkeiten installieren

Zu jedem Beispiel, das eine Fremdbibliothek braucht, liegt im Wurzelverzeichnis
eine passende Manifestdatei. Sie installieren also mit dem üblichen Befehl des
jeweiligen Ökosystems, statt Bibliotheksnamen und Versionen selbst
zusammenzusuchen:

| Sprache(n) | Installation mit |
| --- | --- |
| Node.js / TypeScript | `npm install` |
| PHP | `composer install` |
| Rust | `cargo build` (lädt Abhängigkeiten automatisch) |
| C# | `dotnet build cs-zerosmtp.csproj` |
| Java | `mvn compile` |
| Kotlin | `gradle build` |
| Swift | `swift build` |
| Zig | `zig build-exe zig-zerosmtp.zig -lc -lcurl` (benötigt die libcurl-Header) |
| Python, Ruby, Go, Bash, PowerShell | keine — nur Standardbibliothek |

Konfigurationsdaten:
- Login: zufällig erzeugte Adresse @msgwing.com
- SMTP-Server: mx.msgwing.com
- Port: 587 (STARTTLS) oder 465 (SSL/TLS)
- Verschlüsselung: SSL/TLS — erforderlich

Wir respektieren Ihre Privatsphäre — Ihre Daten werden nicht für Marketing- oder
sonstige kommerzielle Zwecke verarbeitet.

## Sicherheit und Zustellbarkeit

**✓ Verbesserte Domain-Reputation**: Die Reputation der Domain msgwing.com wurde
verbessert, strenge Anti-Spam-Maßnahmen sind in Kraft. Alle Spam-Konten wurden
gesperrt und entfernt, damit die Zustellbarkeit für rechtmäßige Nutzer optimal
bleibt.

### Domain-Reputation selbst prüfen

Sie möchten die Reputation von msgwing.com nachprüfen? Das können Sie selbst
über [mail-tester.com](https://mail-tester.com/) tun:

1. Legen Sie auf [msgwing.com](https://msgwing.com) ein kostenloses SMTP-Konto an
2. Verwenden Sie unser PowerShell-Testskript: [SendEmailTest_mail-tester.com.ps1](SendEmailTest_mail-tester.com.ps1)
3. Lassen Sie sich auf mail-tester.com eine zufällige Adresse erzeugen und senden Sie eine Testnachricht von Ihrer @msgwing.com-Adresse
4. Sehen Sie sich die Bewertung und die ausführliche Analyse an

**✓ Sicherheitsverbesserungen**: Wir haben den Dienst msgwing.com umfassend
abgesichert — darunter verbesserte Authentifizierungsverfahren, erweiterte
Missbrauchsüberwachung und gehärtete Infrastruktur.

---

Bei Fragen erreichen Sie uns unter: abuse@msgwing.com

Gute Zustellbarkeit • Zufälliges Konto mit guter Reputation • Keine Kosten •
Volle Privatsphäre • Funktioniert mit allem

Fangen Sie noch heute an zu versenden — vollständig kostenlos und ohne
versteckte Regeln!

Die Registrierung finden Sie unter: https://msgwing.com

## Star History

[![GitHub stars](https://img.shields.io/github/stars/msgwing/ZeroSMTP?style=social)](https://star-history.com/#msgwing/ZeroSMTP&Date)
