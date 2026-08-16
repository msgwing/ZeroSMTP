<div align="center">

![ZeroSMTP](docs/assets/banner.png)

**Wszystko, co potrzebne przy wyłączeniu SMTP AUTH w Microsoft 365.**<br>
Sprawdź, co się zepsuje w Twoim tenancie, ustal czy Twój sprzęt ma jakieś
wyjście, i utrzymaj wysyłkę — razem z darmowym relayem dla urządzeń, które
nigdy nie będą mówić OAuth.<br>
Relay jest darmowy bez planu płatnego, z limitem **200 wiadomości/dzień**, i
wysyła ze współdzielonego adresu `@msgwing.com`, nie z Twojej domeny
([dlaczego](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)).

[![mx.msgwing.com status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/status.json)](https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml)
[![Odliczanie do wyłączenia Basic auth w Exchange Online](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)
[![Lint examples](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml/badge.svg)](https://github.com/msgwing/ZeroSMTP/actions/workflows/lint.yml)
[![21 gotowych przykładów](https://img.shields.io/badge/przyk%C5%82ady-21%20gotowych-blue)](#przykłady-kodu)
[![Licencja: MIT](https://img.shields.io/badge/licencja-MIT-green.svg)](LICENSE)

[![Odliczanie do wyłączenia Basic auth w Exchange Online (SMTP AUTH)](https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown-card.svg)](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)

[**Załóż darmowe konto →**](https://msgwing.com) · [**Migracja z Exchange Online →**](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Strona dokumentacji](https://docs.msgwing.com/) · [Szybki start](#szybki-start) · [Przykłady kodu](#przykłady-kodu) · [FAQ](docs/FAQ.md) · [English](README.md) · [Deutsch](README.de.md)

</div>

## Co tu jest

| | |
| --- | --- |
| **1. Audyt tenanta** | [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1) — tylko czyta. Raportuje każdą skrzynkę, która nadal może użyć SMTP AUTH, licząc osobno te, które **dziedziczą** ustawienie tenanta — bo typowy jednolinijkowiec `-eq $false` pomija je zupełnie i potrafi pokazać zero na w pełni narażonym tenancie. |
| **2. Sprawdzenie sprzętu** | [Lista zgodności](docs/DEVICE-COMPATIBILITY.md) — maszynowo czytalna, oparta na [`data/devices.json`](data/devices.json). Które modele mają firmware z OAuth, a [które producent skreślił](docs/NO-OAUTH-FIRMWARE.md), z odnośnikiem do każdego oświadczenia. |
| **3. Utrzymanie wysyłki** | Darmowy relay SMTP przyjmujący login i hasło, z [21 przykładami w 19 językach](#przykłady-kodu), [gotowcami dla Ansible i Docker Compose](#gotowce-wdrożeniowe) oraz [konfiguracją drukarek per marka](docs/PRINTERS.md). |

Plus [co dokładnie znaczy każdy komunikat błędu](docs/ERROR-MESSAGES.md) i
[przewodnik migracji](docs/EXCHANGE-ONLINE-SMTP-AUTH.md), który omawia Graph
API, Direct Send i płatne relaye — nie tylko ten jeden.

> **Dostajesz `535 5.7.139 Authentication unsuccessful, basic authentication is disabled`?**
> Microsoft domyślnie wyłącza uwierzytelnianie Basic dla SMTP AUTH z
> **końcem grudnia 2026**. Drukarki, NAS-y, zadania backupu i monitoring,
> które nie potrafią OAuth, przestają wysyłać — a te alarmowe padają
> *po cichu*, więc dowiadujesz się o tym dopiero w trakcie awarii, o której
> miały ostrzec.
>
> **[Przewodnik migracji →](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)** omawia
> wszystkie opcje (Graph API, Direct Send, własny relay, usługi płatne), nie
> tylko tę jedną. **[Co się zepsuje →](docs/AFFECTED-SYSTEMS.md)** to lista
> do audytu, z PowerShellem do znalezienia swojej ekspozycji.

---

```bash
curl --url "smtps://mx.msgwing.com:465" \
  --user "$ZEROSMTP_USERNAME:$ZEROSMTP_PASSWORD" \
  --mail-from "$ZEROSMTP_FROM" --mail-rcpt "$ZEROSMTP_TO" \
  --upload-file <(printf 'Subject: Test\r\n\r\nHello from ZeroSMTP!') --ssl-reqd
```

I to wszystko — żadnego SDK, żadnego klucza API, po prostu dane SMTP, które
działają z czymkolwiek, co już obsługuje SMTP.

| | |
| --- | --- |
| **Serwer** | `mx.msgwing.com` |
| **Port** | `587` (STARTTLS) lub `465` (SSL/TLS) |
| **Login** | Twój losowo wygenerowany adres `@msgwing.com` |
| **Koszt** | za darmo — do 200 maili dziennie ([limity](docs/TROUBLESHOOTING.md#sending-limits-rate-limiting)) |
| **Haczyk** | maile wychodzą *z* `@msgwing.com`, nie z Twojej domeny ([dlaczego](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) |

## Szybki start

1. Zarejestruj i aktywuj darmowe konto na [msgwing.com](https://msgwing.com), a następnie skopiuj wygenerowany losowo login `@msgwing.com` i hasło.
2. Skopiuj [`.env.example`](.env.example) do `.env` i uzupełnij swoimi danymi.
3. Uruchom powyższy snippet curl (najpierw `export $(grep -v '^#' .env | xargs)`), albo wybierz swój język z tabeli [Przykłady kodu](#przykłady-kodu) — każdy przykład korzysta z tych samych zmiennych w `.env`.
4. Coś nie działa? Zobacz [Komunikaty błędów](docs/ERROR-MESSAGES.md) · [Rozwiązywanie problemów](docs/TROUBLESHOOTING.md) — najczęstszą przyczyną nieudanego pierwszego uruchomienia jest blokowanie wychodzących portów SMTP przez dostawcę chmury, a nie błąd w konfiguracji.

> Wolisz nie instalować niczego lokalnie? Każde środowisko używane poniżej
> (Python, PHP, Node, Ruby, Go, Java, Kotlin/Gradle, .NET, Rust) jest już
> zainstalowane w dołączonym [Dev Container / Codespace](.devcontainer/devcontainer.json).
> [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/msgwing/ZeroSMTP)

![Sprawdzenie połączenia z mx.msgwing.com](docs/assets/connection-check.png)

## Dlaczego ZeroSMTP?

- **Nic nie trzeba utrzymywać i nic nie trzeba płacić.** Bez serwera
  pocztowego, bez klucza API, bez karty, bez progów cenowych za wolumen.
- **Działa ze wszystkim, co już obsługuje SMTP** — aplikacje, skrypty,
  drukarki sieciowe, NAS-y, sprzęt IoT. Jeśli ma pole „serwer SMTP", zadziała.
- **Zwykłe SMTP AUTH nadal akceptowane.** Żadnego OAuth2 do wdrożenia — a to
  właśnie sedno problemu dla starych urządzeń bez aktualizacji firmware'u.
- **Zarządzana reputacja.** Konta są generowane losowo w domenie aktywnie
  monitorowanej pod kątem nadużyć, więc nie rozgrzewasz własnego IP.
- **21 gotowych przykładów** w 19 językach, korzystających z tych samych zmiennych
  środowiskowych, plus gotowce dla Ansible i Docker Compose oraz przewodniki
  dla Windows Server, Linuksa i drukarek.
- **Sprawdzalnie działa** — odznaka statusu powyżej to realny test wykonywany
  na `mx.msgwing.com` co 6 godzin, a nie statyczny obrazek.

Dobre do: formularzy kontaktowych · resetów haseł · alertów z CI/CD i
monitoringu · skan-do-mail · powiadomień IoT · homelabów.

> ### ⚠️ Tracisz SMTP AUTH w Exchange Online / Microsoft 365?
> Microsoft domyślnie wyłącza uwierzytelnianie Basic dla SMTP AUTH z
> **końcem grudnia 2026**, co zepsuje drukarki i starsze aplikacje bez
> obsługi OAuth. **[Przeczytaj przewodnik migracji →](docs/EXCHANGE-ONLINE-SMTP-AUTH.md)**
> — omawia wszystkie opcje (Graph API, Direct Send, własny relay, usługi
> płatne), nie tylko tę jedną.
>
> **Uruchom [`Find-SmtpAuthExposure.ps1`](Find-SmtpAuthExposure.ps1)**, żeby
> dostać odpowiedź dla własnego tenanta. Skrypt tylko czyta i liczy osobno
> skrzynki dziedziczące ustawienie tenanta — te, które typowy jednolinijkowiec
> pomija.

Przewodniki konfiguracji: [Drukarki sieciowe](docs/PRINTERS.md) · [Popularne aplikacje](docs/APPS.md) · [Linux (Debian/Ubuntu/Rocky/Fedora/openSUSE)](docs/LINUX.md) · [Systemowy relay pocztowy (Postfix/msmtp/Exim4)](docs/SYSTEM-MTA.md) · [Windows Server](docs/WINDOWS-SERVER.md) · [Migracja z Exchange Online SMTP AUTH](docs/EXCHANGE-ONLINE-SMTP-AUTH.md) · [Alerty monitoringu](docs/MONITORING.md) · [Lista zgodności OAuth](docs/DEVICE-COMPATIBILITY.md) · [Urządzenia bez firmware z OAuth](docs/NO-OAUTH-FIRMWARE.md) · [Przypadki konkretnych urządzeń](docs/DEVICE-CASE-STUDIES.md) · [Rozwiązywanie problemów](docs/TROUBLESHOOTING.md) · [Niezawodność (ponawianie prób)](docs/RELIABILITY.md) · [FAQ](docs/FAQ.md)

## Jak to wypada na tle innych opcji?

|  | ZeroSMTP | Gmail SMTP relay | Amazon SES | Mailgun / SendGrid / Brevo (typowy darmowy plan) |
| --- | --- | --- | --- | --- |
| Koszt | Darmowe, bez karty | Darmowe (osobiste konto Google) | Płatność za email (limitowana darmowa pula tylko z AWS EC2, pierwsze 12 miesięcy) | Darmowy plan, zwykle mocno ograniczony i wymagający rejestracji + weryfikacji domeny |
| Konfiguracja | Rejestracja, kopiujesz dane SMTP, gotowe | Wymaga konta Google; regulamin Google odradza automatyczną/masową wysyłkę tą drogą | Wymaga konta AWS oraz wniosku o "production access" przed wysyłką do niezweryfikowanych adresów | Rejestracja + weryfikacja domeny dla pełnej funkcjonalności |
| Własna domena w "From" | Nie — zawsze `@msgwing.com` (zobacz [FAQ](docs/FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)) | Tak, Twój adres Gmail/Workspace | Tak | Tak, po zweryfikowaniu domeny |
| Najlepsze do | Formularzy kontaktowych, resetów haseł, powiadomień, drukarek/IoT — wszędzie tam, gdzie adres nadawcy nie musi być Twoją domeną | Skryptów osobistych o niskim wolumenie | Aplikacji produkcyjnych, które tego potrzebują i udźwigną konfigurację AWS | Firm potrzebujących brandowanej wysyłki, które udźwigną konfigurację |

Warunki darmowych planów powyżej zmieniają się w czasie — przed wyborem
sprawdź aktualny cennik danego dostawcy.

### A co z samodzielnym hostowaniem własnego serwera pocztowego?

Popularne, samodzielnie hostowane rozwiązania jak [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver),
[Mailu](https://github.com/Mailu/Mailu) czy [mailcow](https://github.com/mailcow/mailcow-dockerized)
dają skrzynkę na własnej domenie i pełną kontrolę — ale to Ty utrzymujesz
Postfix, DKIM/SPF/DMARC, filtrowanie spamu i reputację IP/domeny, co jest
realną, ciągłą pracą, a nie jednorazową konfiguracją. ZeroSMTP to drugi
biegun tego kompromisu: zero konfiguracji i zero utrzymania, w zamian za
wysyłkę ze wspólnego adresu `@msgwing.com` zamiast własnej domeny. Jeśli
już prowadzisz jedno z tych rozwiązań i działa — nie ma powodu, żeby
zmieniać. Jeśli nie jesteś pewien, czy ten wysiłek się opłaca dla skryptu,
formularza kontaktowego czy projektu pobocznego — ZeroSMTP nic nie
kosztuje, żeby spróbować najpierw.

## GitHub Actions

Używasz ZeroSMTP z poziomu workflow (alerty o błędach CI, powiadomienia o
wdrożeniu, raporty cykliczne)? [`msgwing/send-email-action`](https://github.com/msgwing/send-email-action)
z [GitHub Marketplace](https://github.com/marketplace/actions/zerosmtp-send-email)
zamyka poniższą konfigurację w jednym kroku:

```yaml
- uses: msgwing/send-email-action@v1
  with:
    username: ${{ secrets.ZEROSMTP_USERNAME }}
    password: ${{ secrets.ZEROSMTP_PASSWORD }}
    from: ${{ secrets.ZEROSMTP_USERNAME }}
    to: you@example.com
    subject: "Build nieudany"
    body: "Zobacz przebieg: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

## Przykłady kodu

Gotowe do użycia przykłady dla `mx.msgwing.com:465` (SSL/TLS) lub `:587`
(STARTTLS), po jednym pliku na język:

| Język | Plik |
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

Każdy przykład pobiera dane logowania ze zmiennych środowiskowych
`ZEROSMTP_*` (`ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`,
`ZEROSMTP_TO`, `ZEROSMTP_SUBJECT`) — nigdy nie wpisuj prawdziwych danych na
sztywno w skrypcie.

### Gotowce wdrożeniowe

Nie każda migracja to zmiana w kodzie. Dwa miejsca, w których ustawienia
SMTP faktycznie siedzą:

| Gotowiec | Plik | Co robi |
| --- | --- | --- |
| Ansible | [ansible-zerosmtp.yml](ansible-zerosmtp.yml) | Przestawia systemową pocztę na flocie maszyn (cron, unattended-upgrades, `systemd OnFailure=`) na relay przez msmtp. Idempotentny; hasło podajesz przez `-e` albo ansible-vault, nigdy w pliku. |
| Docker Compose | [docker-compose-zerosmtp.yml](docker-compose-zerosmtp.yml) | Wysyła jedną wiadomość z kontenera, czytając `.env`. Przydatne, żeby sprawdzić dane logowania z wnętrza tej samej sieci, w której działa właściwa aplikacja. |

### Instalacja zależności

Każdy przykład wymagający zewnętrznej biblioteki ma odpowiadający mu manifest
w katalogu głównym repo, więc instalujesz standardową komendą danego
ekosystemu, zamiast ręcznie szukać nazw i wersji bibliotek:

| Język(i) | Instalacja |
| --- | --- |
| Node.js / TypeScript | `npm install` |
| PHP | `composer install` |
| Rust | `cargo build` (zależności pobierają się automatycznie) |
| C# | `dotnet build cs-zerosmtp.csproj` |
| Java | `mvn compile` |
| Kotlin | `gradle build` |
| Swift | `swift build` |
| Zig | `zig build-exe zig-zerosmtp.zig -lc -lcurl` (wymaga nagłówków libcurl) |
| Python, Ruby, Go, Bash, PowerShell | brak — tylko biblioteka standardowa |

Dane do konfiguracji:
- Login: losowo wygenerowany adres @msgwing.com
- Serwer SMTP: mx.msgwing.com
- Port: 587 (STARTTLS) lub 465 (SSL/TLS)
- Szyfrowanie: SSL/TLS - wymagane

Dbamy o Twoją prywatność - Twoje dane nie są przetwarzane w żadnych celach marketingowych ani handlowych.

## Bezpieczeństwo i Dostarczalność

**✓ Poprawa Reputacji Domeny**: Reputacja domeny msgwing.com została znacznie poprawiona, a wszystkie konta spamowe zostały zablokowane i usunięte. Gwarantujemy optymalną dostarczalność dla wszystkich legytymnych użytkowników.

### Sprawdź Reputację Domeny Samodzielnie

Chcesz zweryfikować reputację msgwing.com? Możesz to zrobić samodzielnie za pomocą [mail-tester.com](https://mail-tester.com/):

1. Utwórz darmowe konto SMTP na stronie [msgwing.com](https://msgwing.com)
2. Użyj naszego skryptu PowerShell: [SendEmailTest_mail-tester.com.ps1](SendEmailTest_mail-tester.com.ps1)
3. Wygeneruj losowy email na mail-tester.com i wyślij wiadomość testową z Twojego adresu @msgwing.com
4. Sprawdź wynik reputacji i szczegółową analizę

**✓ Poprawki Bezpieczeństwa**: Wdrożyliśmy kompleksowe ulepszeń bezpieczeństwa usługi msgwing.com, w tym ulepszony protokół autoryzacji, wzmocnione monitorowanie nadużyć i ulepszony bezpieczeństwo infrastruktury.

---

Jeśli masz pytania, napisz do nas: abuse@msgwing.com

Dobra dostarczalność • Losowa reputacja konta • Zero kosztów • Pełna prywatność • Działa z wszystkim

Zacznij wysyłać maile już dziś - całkowicie za darmo i bez żadnych ukrytych zasad!

Rejestracja odbywa się na stronie: https://msgwing.com

## Historia gwiazdek

[![GitHub stars](https://img.shields.io/github/stars/msgwing/ZeroSMTP?style=social)](https://star-history.com/#msgwing/ZeroSMTP&Date)
