# Printer Scan-to-Email SMTP setup — Ricoh, Canon, Xerox, HP, Kyocera, Konica Minolta, Sharp, Brother, Epson, Lexmark

How to configure scan-to-email on a network printer or multifunction device
(MFP) using an SMTP relay that still accepts a plain username and password —
including what to do when Microsoft 365 stops accepting yours.

**Scan-to-email stopped working?** Jump to
[Error messages](#error-messages-and-what-they-mean) or
[Why it broke](#why-scan-to-email-is-breaking-in-2026-2027).

---

## Contents

- [Why scan-to-email is breaking in 2026–2027](#why-scan-to-email-is-breaking-in-2026-2027)
- [Error messages and what they mean](#error-messages-and-what-they-mean)
- [Your options](#your-options)
- [Settings to enter (all brands)](#settings-to-enter-all-brands)
- [Where the settings live, by brand](#where-the-settings-live-by-brand)
  — [HP](#hp) · [Canon](#canon) · [Ricoh](#ricoh) · [Xerox](#xerox) ·
  [Kyocera](#kyocera) · [Konica Minolta](#konica-minolta) ·
  [Sharp](#sharp) · [Brother](#brother) · [Epson](#epson) ·
  [Lexmark](#lexmark)
- [Known exception: Canon Maxify MB2755](#known-exception-canon-maxify-mb2755)
- [Testing and troubleshooting](#testing-and-troubleshooting)
- [Limitations](#limitations)

---

## Why scan-to-email is breaking in 2026-2027

For years, MFPs sent scans through `smtp.office365.com` with a mailbox
username and password (Basic authentication). Microsoft is ending that.

Per Microsoft's
[updated deprecation timeline](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835),
Basic auth for SMTP AUTH is **disabled by default on existing tenants at the
end of December 2026**, unavailable by default for tenants created after
that, with a final removal date to be announced in the second half of 2027.
An admin can still re-enable it until then — that's breathing room, not a fix.

> **Note on conflicting dates.** Print dealers and vendor blogs quote various
> dates (March 2026, September 2025, and others) because Microsoft has
> revised this timeline more than once. Treat
> [Microsoft's own announcement](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835)
> as authoritative and re-check it before planning around a specific date.

Manufacturers have published their own advisories:

- **Ricoh** — [response to the Basic auth phase-out](https://www.ricoh-ap.com/news/2025/05/20/ricohs-response-to-basic-authentication-phase-out-in-microsoft-exchange-online-smtp-authentication)
  and [how to configure OAuth 2.0 for O365 SMTP](https://kb.gsd.ricoh.com/app/answers/detail/a_id/296301/~/configure-oauth-2.0-for-sending-email-when-using-o365-smtp)
- **Xerox** — [Exchange Online authentication changes](https://www.xerox.com/en-us/office/insights/exchange-online-authentication)
  and [support article KB0431233](https://www.support.xerox.com/en-us/article/KB0431233);
  Xerox is shipping firmware that adds OAuth 2.0 across much of its range
- **Kyocera** — offers the *Exchange Online Connector (EOC)* utility for
  supported devices
- **Canon, Konica Minolta, Sharp, HP, Brother, Epson, Lexmark** — check your
  model's support page for an OAuth 2.0 firmware update before assuming one
  exists; on older hardware it usually doesn't

### It's not just scan-to-email

Scan-to-email is what users notice, but every mail-sending function on an MFP
uses the same SMTP credentials. Per
[Ricoh's advisory](https://kb.gsd.ricoh.com/app/answers/detail/a_id/296301/~/configure-oauth-2.0-for-sending-email-when-using-o365-smtp),
these all break together:

- Scan to Email
- Internet Fax (send)
- Fax-to-Email forwarding
- On-demand email notification (checking device status by email)
- **Automatic email notification — error and toner reports to the administrator**
- Error notifications from Mail to Print

The wording is Ricoh's, but the pattern applies to any brand: the device's
**own alerting stops too**. Nobody notices that until a fault goes
unreported. For the same problem across NAS units, backup jobs, monitoring
and line-of-business apps, see [AFFECTED-SYSTEMS.md](AFFECTED-SYSTEMS.md).

## Error messages and what they mean

If you searched an error and landed here, find it below. None of these are
exclusive to the December 2026 default change — the identical error appears
whenever Basic auth for SMTP AUTH is rejected, whether that's from an admin
disabling it earlier, **Security Defaults** (on by default for newer
tenants), a **Conditional Access** policy blocking legacy authentication, or
the upcoming default flip. The client-side message is the same either way.

| Error | What it means |
| --- | --- |
| `535 5.7.139 Authentication unsuccessful, basic authentication is disabled` | Microsoft 365 rejected username/password auth. Your credentials are fine; the method is switched off — see above for which of the four causes it might be. |
| `535 5.7.139 ... SmtpClientAuthentication is disabled for the Tenant` | Same cause, reported at tenant level. |
| `535 5.7.3 Authentication unsuccessful` | Generic auth rejection — same set of possible causes as above. |
| Kyocera **send error 1102** / `0x1102` | Kyocera's code for an SMTP authentication failure — same root cause when pointing at Microsoft 365. |
| `Authentication failed` / `Login failed` on the panel | Vendor-specific wording for the above. |
| Connection times out, no auth error at all | Not authentication — the network is blocking outbound SMTP. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md). |

## Your options

1. **OAuth 2.0 on the device** — the official route. Requires firmware that
   supports it. Check your vendor advisory above; newer Xerox, Ricoh, Canon
   and Kyocera models have a path, most older hardware does not and never will.
2. **Direct Send or an SMTP relay connector in Microsoft 365** —
   authenticates by static public IP instead of a password, so devices need
   no changes. Only delivers to your own tenant's domains.
   [Microsoft's guide](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365).
3. **Your own internal relay** (Postfix etc.) that handles modern auth
   upstream — see [SYSTEM-MTA.md](SYSTEM-MTA.md).
4. **A paid SMTP service** with your own verified domain.
5. **ZeroSMTP** — free, still accepts plain username/password, so the device
   only needs three fields changed. **Mail goes out from an `@msgwing.com`
   address, not your company domain** ([why](FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)),
   and there's a [200 emails/day limit](TROUBLESHOOTING.md#sending-limits-rate-limiting).
   Good for scans that just need to reach someone internally, homelabs,
   schools and small offices. Not appropriate where the sender must be your
   own domain — use option 1, 2 or 4 for that.

Full comparison in [EXCHANGE-ONLINE-SMTP-AUTH.md](EXCHANGE-ONLINE-SMTP-AUTH.md).

---

## Settings to enter (all brands)

First, get credentials: register a free account at
[msgwing.com](https://msgwing.com) and activate it, then copy the randomly
generated `@msgwing.com` username and password. They're shown once — store
them in the printer's own credential store, not a shared document.

| Setting | Value |
| --- | --- |
| SMTP server / outgoing server | `mx.msgwing.com` |
| Port | `587` (STARTTLS) — recommended, or `465` (SSL/TLS) |
| Encryption | STARTTLS on 587, or SSL/TLS on 465 — **required**, never "None" |
| Authentication | Enabled, method `LOGIN` or `PLAIN` |
| Username | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |
| From / sender address | your `@msgwing.com` login (many printers require From == Username) |

![Generic SMTP settings fields](assets/smtp-settings-fields.svg)

![Connection flow: printer to mx.msgwing.com to recipient](assets/smtp-connection-flow.svg)

> **Which port?** Use `587` if the printer's menu offers a single port field
> and one "use SSL/encryption" toggle — the most widely supported combination
> across printer firmware. Use `465` only if the device explicitly offers an
> "SSL" (implicit TLS) mode separate from "STARTTLS"/"TLS".

---

## Where the settings live, by brand

Menu wording shifts between firmware versions, but locations are stable
enough to be a reliable starting point. Each entry links to the vendor's own
current documentation — check there if the wording has moved on your model.

**Pick your brand for just that menu path**, or scroll down for all ten at once.

<div id="zc-brand-picker-mount"></div>

### HP
Embedded Web Server (browser → printer's IP) → `Networking` or `Scan` tab →
`TCP/IP Settings` → `Outgoing Email` / `Scan to Email` →
`Outgoing Email Profiles` → add a profile using the values above.
(Find the printer's IP from the panel: `Settings → Networking → TCP/IP Settings`.)

### Canon
Remote UI (browser → printer's IP) → `Settings/Registration` →
`TX Settings` → `E-Mail/I-Fax Settings` → `SMTP Server Settings`.
Covers imageRUNNER, imageCLASS, Maxify and PIXMA business models.
On the **Maxify MB2755** this menu also holds a certificate-verification
toggle — see [the exception below](#known-exception-canon-maxify-mb2755).

### Ricoh
Web Image Monitor (browser → printer's IP, log in as administrator) →
`Device Management` → `Configuration` → `Email` (under Device Settings) →
set `SMTP Server Name`, `SMTP Port No.`, and enable `SMTP Authentication`.
Field names stay consistent across most Ricoh models even when the
surrounding layout differs.
→ [Ricoh: configure OAuth 2.0 for O365 SMTP](https://kb.gsd.ricoh.com/app/answers/detail/a_id/296301/~/configure-oauth-2.0-for-sending-email-when-using-o365-smtp)
(same knowledge base — search it for "SMTP authentication" for the
Basic-auth equivalent on your model)

### Xerox
Embedded Web Server → `Properties` → `Connectivity` → `Protocols` →
`SMTP Server` → `General`. Newer app-based models use
`Properties → Apps → Email → Setup` instead.
→ [Xerox: configure SMTP server settings](https://www.support.xerox.com/en-us/article/en/2119372)
· [Xerox: Exchange Online authentication changes](https://www.support.xerox.com/en-us/article/KB0431233)

### Kyocera
Command Center RX (browser → printer's IP, admin login) → `Advanced` →
`E-mail` → `SMTP` → `General`. Set `SMTP Security` to match your chosen port,
and confirm `SMTP (E-mail TX)` is `On` under `Network Settings → Protocol`.
→ [Kyocera Command Center RX e-mail settings](https://sites.google.com/view/howtoguidesforkyoceraprinters/the-command-center-rx/function-settings/e-mail)

### Konica Minolta
Touch panel: `Utility` → `Administrator Settings` → `Network Settings` →
`E-Mail Settings` → `E-Mail TX (SMTP)`.
Web Connection: `Network` → `E-mail Setting` → `E-mail TX (SMTP)`.
→ [Konica Minolta: configuring the Scan to E-mail environment](https://manuals.konicaminolta.eu/bizhub-C554-C454-C364-C284-C224/EN/contents/id08-0072.html)

### Sharp
`Settings (Administrator)` → `System Settings` → `Network Settings` →
`Service Settings` → `SMTP` tab. Some models expose this on the web page as
`Settings → E-mail`. Set `Primary Server`, `Port Number`, `Sender Address`,
and enable SMTP authentication and `SSL/TLS`.
→ [Sharp: network settings manual](https://global.sharp/restricted/products/copier/downloads/manuals/bpb550wd/en/contents_09-07_018.html)

### Brother
Web Based Management (browser → printer's IP) → `Network` → `Protocol` →
`SMTP Client`. Set `SSL/TLS` to `STARTTLS` for port 587, or `SSL` for 465.

### Epson
Printer's web configuration page → `Network Scan` or `Basic` →
`Email Server` → enter server, port and authentication values.
Applies to WorkForce and EcoTank Pro models with Scan-to-Email.

### Lexmark
Embedded Web Server → `Settings` → `E-mail/FTP Settings` → `SMTP Setup`.
Server goes in `Primary SMTP Gateway`, port in `Primary SMTP Gateway Port`,
and set `Use SSL/TLS` to `Required`.
→ [Lexmark Embedded Web Server Administrator's Guide (PDF)](https://publications.lexmark.com/publications/Embedded_Web_Server/AG/pdf/Lexmark_EmbeddedWebServer_AdminGuide_en.pdf)

> **Confirmed this on real hardware?** The Canon section below exists because
> a contributor ([`@kevinbytnar`](https://github.com/msgwing/ZeroSMTP/discussions/6))
> tested that exact model and reported what worked, including a firmware quirk
> no manual mentions. If you verify — or need to correct — any path above on
> your own device, please
> [open an issue](https://github.com/msgwing/ZeroSMTP/issues/new/choose) or a
> PR with a screenshot. Hardware-confirmed reports are worth far more here
> than anything written from a manual.

---

## Known exception: Canon Maxify MB2755

*One entry in the growing [device case studies](DEVICE-CASE-STUDIES.md) list
— hit something similar on your own hardware? See that page for how to
report it.*

Most printers validate `mx.msgwing.com`'s certificate correctly and should
keep certificate verification **enabled** — the safe default recommended in
[TROUBLESHOOTING.md](TROUBLESHOOTING.md). One confirmed exception is the
**Canon Maxify MB2755** (2016-era SOHO inkjet MFP):

- The MB2755's firmware ships a **fixed, non-updatable root CA store** that
  predates modern Let's Encrypt root certificates. There's no way to import a
  root certificate, and — confirmed by re-testing after a firmware update —
  no firmware update adds one either.
- Which exact Let's Encrypt chain `mx.msgwing.com` presents can change over
  time (certificate authorities rotate intermediates and occasionally change
  which root a chain is built on). An `openssl s_client -connect
  mx.msgwing.com:587 -starttls smtp` on **2026-08-03** showed a chain built
  entirely on elliptic-curve (ECDSA) certificates — leaf → `Let's Encrypt
  YE1` → `ISRG, Root YE` → `ISRG Root X2` — rather than the classic RSA chain
  through `ISRG Root X1` seen in earlier testing. Modern OS trust stores
  accept this fine; the MB2755's frozen CA store, already missing the more
  common `ISRG Root X1`, has no path to trust this newer chain either.
- **On both `465` and `587`, this model currently requires disabling *"Nie
  weryfikuj certyfikat" / "Don't verify certificate"***. An earlier version
  of this page reported `587` working without that workaround — that was
  accurate for the chain being served at the time, but isn't a setting on
  the printer; it depends on which chain the server happens to present at
  connection time, which can change. Treat "disable verification on this
  model" as the durable answer rather than tying it to a specific port.

![Canon Maxify MB2755 mail server settings with certificate verification disabled — the setting that actually matters here, regardless of port number, sender address redacted](assets/canon-maxify-mb2755-mail-settings.png)

*A screenshot previously shown here for port `587` had "Nie weryfikuj
certyfikat" unchecked — that reflected the chain the server was presenting
at the time, not a setting specific to that port. It's been removed rather
than left up as a now-inaccurate example; use the screenshot above (verify
certificate: off) for either port.*

> **Security note:** disabling certificate verification means the printer no
> longer confirms it's talking to `mx.msgwing.com` rather than an on-path
> attacker on the same network — the session is still encrypted, but the
> server's identity is unverified. Only do this if your device is genuinely
> affected by the root-CA gap above. For anything that isn't an old Canon
> Maxify (or a similarly outdated embedded device), keep verification enabled
> per [TROUBLESHOOTING.md](TROUBLESHOOTING.md#certificate--tls-verification-failed).

---

## Testing and troubleshooting

1. **Check the network path first.** Run
   [`check-connection.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.sh) or
   [`check-connection.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.ps1) from a machine on the
   same network. A firewall blocking outbound 587/465 looks identical to an
   authentication problem from the printer's panel.
2. **Send a test scan** to your own inbox.
3. **If it fails**, read the printer's event/job log rather than the panel
   message — it usually contains the actual SMTP response. Then re-check:
   - encryption is not set to "None"
   - the From address matches the username (many firmwares require this)
   - the password was retyped, not pasted with a trailing space
4. **Deliverability testing** (SPF/DKIM/DMARC): see
   [`SendEmailTest_mail-tester.com.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/SendEmailTest_mail-tester.com.ps1)
   and the reputation section in the [README](https://github.com/msgwing/ZeroSMTP#readme).

More causes and fixes in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Limitations

- **Send-only.** No IMAP/POP3, no inbox — a printer configured this way sends
  scans out but cannot receive. There's no "receive" test to run.
- **One account = one From address.** Printers that need a different sender
  per user should use a shared queue or an app-level relay
  (see [APPS.md](APPS.md)) rather than dozens of individual accounts.
- **200 emails/day** per account — see
  [sending limits](TROUBLESHOOTING.md#sending-limits-rate-limiting).
- **Sender is `@msgwing.com`**, never your own domain
  ([why](FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)).

{% raw %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Configure scan-to-email on a network printer using an SMTP relay",
  "description": "How to configure scan-to-email on a network printer or multifunction device (MFP) using an SMTP relay that still accepts a plain username and password.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Get credentials",
      "text": "Register a free account at msgwing.com and activate it, then copy the randomly generated @msgwing.com username and password. They're shown once, so store them in the printer's own credential store rather than a shared document."
    },
    {
      "@type": "HowToStep",
      "name": "Enter the connection settings",
      "text": "Enter server mx.msgwing.com, port 587 with STARTTLS (or 465 with SSL/TLS), enable authentication with method LOGIN or PLAIN, and set both the username and the From/sender address to the @msgwing.com login."
    },
    {
      "@type": "HowToStep",
      "name": "Find the setting in your printer's menu",
      "text": "Menu wording and location vary by brand and firmware version. See the per-brand menu paths for HP, Canon, Ricoh, Xerox, Kyocera, Konica Minolta, Sharp, Brother, Epson, and Lexmark."
    },
    {
      "@type": "HowToStep",
      "name": "Send a test scan-to-email",
      "text": "Send a test scan to your own inbox. If it fails, check the printer's event or job log for the actual SMTP response rather than the panel's summary message."
    }
  ]
}
</script>
{% endraw %}

