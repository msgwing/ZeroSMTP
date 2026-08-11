<picture>
  <source srcset="assets/banner.webp" type="image/webp">
  <img src="assets/banner.png" width="1280" height="340" fetchpriority="high" alt="ZeroSMTP — free SMTP relay for developers and sysadmins, mx.msgwing.com, port 587/465, TLS">
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

## Start here

| If you… | Go to |
| --- | --- |
| Got an authentication error from `smtp.office365.com` | [Exchange Online SMTP AUTH migration](EXCHANGE-ONLINE-SMTP-AUTH.md) |
| Need to know **what else** in your environment will break | [What breaks: affected systems](AFFECTED-SYSTEMS.md) |
| Have a printer or MFP to reconfigure | [Printer scan-to-email setup by brand](PRINTERS.md) |
| Manage Windows Server / IIS / Exchange | [Windows Server guide](WINDOWS-SERVER.md) |
| Manage Linux servers | [Linux](LINUX.md) · [system-wide relay](SYSTEM-MTA.md) |
| Have a printer whose vendor says no OAuth firmware is coming | [Devices that will never get OAuth firmware](NO-OAUTH-FIRMWARE.md) |
| Are sending from an app or script | [20 code examples across 18 languages](CODE-EXAMPLES.md) |
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
Service status is checked automatically every 6 hours —
<a href="https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml">see the live check</a>.
Questions or corrections: <a href="https://github.com/msgwing/ZeroSMTP/issues/new/choose">open an issue</a>.
</small></p>
