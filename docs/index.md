<picture>
  <source srcset="assets/banner.webp" type="image/webp">
  <img src="assets/banner.png" width="1280" height="340" fetchpriority="high" alt="ZeroSMTP — a free SMTP relay that still accepts basic auth. mx.msgwing.com, port 587 STARTTLS or 465 SSL/TLS.">
</picture>

# ZeroSMTP — a free SMTP relay that still accepts basic auth

**Your printer, scanner or app stopped sending email through Microsoft 365?**
You're most likely hitting the Basic authentication shutdown. This site
explains what happened, lists every way to fix it, and documents one free
option among them.

```
535 5.7.139 Authentication unsuccessful, basic authentication is disabled
```

If that's the error you're seeing, start with
[Exchange Online SMTP AUTH migration](EXCHANGE-ONLINE-SMTP-AUTH.md).

Basic authentication for SMTP AUTH is disabled by default on existing
Microsoft 365 tenants at the end of December 2026.

<div id="zc-fc"></div>

---

## Connection settings

Three values, straight into the SMTP fields your device or app already has.
No SDK, no API key, no DNS records.

| Setting | Value |
| --- | --- |
| Server | `mx.msgwing.com` |
| Port | `587` (STARTTLS) — try this first |
| Port | `465` (SSL/TLS) — if the device insists |
| Authentication | Plain username and password, from your account |

[Get free credentials](https://msgwing.com) — free, no card. 200 messages a
day, sent from a generated `@msgwing.com` address rather than your own
domain. If the From address has to be your own domain, this is the wrong
tool and [the alternatives page](ALTERNATIVES.md) says which one is right.

---

## Start here

<div class="paths">
  <div class="path">
    <span class="kto">Serwis i drukarki</span>
    <h3>A printer or scanner stopped emailing</h3>
    <p>Scan-to-email died, the panel shows an authentication error, or the device refuses the certificate.</p>
    <ul>
      <li><a href="PRINTERS.html">Setup by brand</a> — Canon, Epson, Brother, HP, Ricoh, Kyocera, Xerox</li>
      <li><a href="DEVICE-COMPATIBILITY.html">Does my model have OAuth firmware?</a></li>
      <li><a href="PRINTER-CERTIFICATE-ERROR.html">It will not trust the certificate</a></li>
    </ul>
  </div>
  <div class="path">
    <span class="kto">Administracja</span>
    <h3>You run the servers this breaks</h3>
    <p>Find out what else in the environment sends mail with a password before December finds it for you.</p>
    <ul>
      <li><a href="AFFECTED-SYSTEMS.html">What breaks, and when</a></li>
      <li><a href="WINDOWS-SERVER.html">Windows Server / IIS</a> · <a href="LINUX.html">Linux</a></li>
      <li><a href="SELF-HOSTED.html">Gitea, Vaultwarden, Immich, Authelia, Paperless</a></li>
    </ul>
  </div>
  <div class="path">
    <span class="kto">Programowanie</span>
    <h3>Your code or app cannot send</h3>
    <p>The library printed a summary of the error rather than the error. Start from the string you actually have.</p>
    <ul>
      <li><a href="LIBRARY-ERRORS.html">What your library said vs. what the server said</a></li>
      <li><a href="CODE-EXAMPLES.html">21 runnable examples, 19 languages</a></li>
      <li><a href="WORDPRESS.html">WordPress and WooCommerce</a></li>
    </ul>
  </div>
</div>

Everything else is in the table further down — these three cover most of it.

**If you have an error in front of you right now, skip the table:**

```bash
npx zerosmtp-check --explain "535 5.7.139 Authentication unsuccessful"
```

Paste whatever *your* client printed. A Postfix SASL line, a Python traceback,
`1102` off a Kyocera panel, or `curl: (67) Login denied` — which shows none of
the server's answer at all. Seventeen error strings are covered, and each one
says whether the cause can still be turned back on before the end of December
2026, because three of the four still can.

If mail is **hanging** rather than being refused, run it with no arguments: it
checks ports 25, 587 and 465 from the machine that is actually failing, which
is the only place the answer means anything. Nothing to install, no credentials,
no mail sent.

| If you… | Go to |
| --- | --- |
| Got an authentication error from `smtp.office365.com` | [Exchange Online SMTP AUTH migration](EXCHANGE-ONLINE-SMTP-AUTH.md) |
| Need to know **what else** in your environment will break | [What breaks: affected systems](AFFECTED-SYSTEMS.md) |
| Have a printer or MFP to reconfigure | [Printer scan-to-email setup by brand](PRINTERS.md) |
| Have an HP printer saying **"SMTP server requires authentication"** | [What that means and how to fix it](HP-PRINTER-SMTP.md) |
| Have a printer that **will not trust the server's certificate** | [Why, and when turning it off is right](PRINTER-CERTIFICATE-ERROR.md) |
| Just want a **home printer** to email a scan, and Gmail or Hotmail stopped working | [Scan to email from a home printer](SCAN-TO-EMAIL-HOME.md) |
| Manage Windows Server / IIS / Exchange | [Windows Server guide](WINDOWS-SERVER.md) |
| Have an app that can only "deliver to local SMTP server" | [IIS SMTP relay and Microsoft 365](IIS-SMTP-RELAY.md) |
| Manage Linux servers | [Linux](LINUX.md) · [system-wide relay](SYSTEM-MTA.md) |
| Want to look up one device or product | [OAuth compatibility list](DEVICE-COMPATIBILITY.md) |
| Have a printer whose vendor says no OAuth firmware is coming | [Devices that will never get OAuth firmware](NO-OAUTH-FIRMWARE.md) |
| Are sending from an app or script | [21 code examples across 19 languages](CODE-EXAMPLES.md) |
| Want to know how big this actually is | [How much public code breaks in December 2026](BLAST-RADIUS.md) — measured weekly |
| Deploy with Ansible or Docker Compose | [Deployment recipes](CODE-EXAMPLES.md#deployment-recipes) |
| Have an error message to look up | [535 5.7.139 and other SMTP AUTH errors](ERROR-MESSAGES.md) |
| Have it failing or timing out | [Troubleshooting](TROUBLESHOOTING.md) |
| Have monitoring/alerting tools that need to send mail | [Monitoring alerts](MONITORING.md) |
| Want to see confirmed fixes for specific hardware | [Device case studies](DEVICE-CASE-STUDIES.md) |
| Are comparing free SMTP relays | [ZeroSMTP vs. other free relays](ALTERNATIVES.md) |
| Just want the short answers | [FAQ](FAQ.md) |

## What is happening

Microsoft is retiring Basic authentication (username + password) for SMTP
AUTH in Exchange Online. Per Microsoft's
[updated timeline](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835),
it is **disabled by default on existing tenants at the end of December 2026**,
unavailable by default for tenants created after that, with final removal
announced in the second half of 2027.

Devices that can run OAuth 2.0 can be updated. Older printers, scanners,
NAS units and line-of-business software generally cannot — and for many of
them no firmware update will ever exist.

## What ZeroSMTP is

A free SMTP relay at `mx.msgwing.com` that **still accepts a plain username
and password over TLS**. For a device with no OAuth path, migrating means
changing three fields:

| Setting | From | To |
| --- | --- | --- |
| Server | `smtp.office365.com` | `mx.msgwing.com` |
| Port | 587 | 587 (STARTTLS) or 465 (SSL/TLS) |
| Credentials | Microsoft 365 account | free `@msgwing.com` account |

**The trade-off, stated plainly:** mail is sent *from* an `@msgwing.com`
address, **not your own domain**
([why](FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)),
and there is a [200 emails/day limit](TROUBLESHOOTING.md#sending-limits-rate-limiting).

In exchange, there's no DNS work: most free relays require verifying your
own domain (SPF/DKIM records, propagation, sender reputation to manage
yourself) before they'll send normally. ZeroSMTP skips that entirely.

<img src="assets/setup-comparison.svg" width="760" height="580" alt="Setup path: a typical free relay takes five steps including DNS configuration (SPF, DKIM, DMARC, propagation, verification); ZeroSMTP takes three steps with no DNS work">

Full breakdown: [ZeroSMTP vs. other free SMTP relays](ALTERNATIVES.md).

That makes it a good fit for scan-to-email, device and backup alerts,
monitoring notifications, homelabs, schools and small offices — anywhere the
message just needs to arrive. It is **not** the right answer for
customer-facing mail or anything that must come from your company domain. The
[migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md) covers the options that are,
including Microsoft's own.

## Get started

1. Register a free account at [msgwing.com](https://msgwing.com).
2. Copy the generated `@msgwing.com` username and password.
3. Point your device or app at `mx.msgwing.com` on port 587 with STARTTLS.

Full quickstart, 15 language examples and setup guides are in the
[GitHub repository](https://github.com/msgwing/ZeroSMTP).

---

<p><small>
Service status is checked automatically every 15 minutes —
<a href="https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml">see the live check</a>.
Questions or corrections: <a href="https://github.com/msgwing/ZeroSMTP/issues/new/choose">open an issue</a>.
</small></p>
