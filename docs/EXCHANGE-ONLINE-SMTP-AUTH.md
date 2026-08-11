# Exchange Online is turning off SMTP AUTH Basic auth — options for printers and legacy apps

**Landed here from an error message?** You're in the right place if your
printer, scanner, or app suddenly started returning one of these against
`smtp.office365.com`:

```
535 5.7.139 Authentication unsuccessful, basic authentication is disabled
535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant
535 5.7.3  Authentication unsuccessful
```

Nothing is wrong with your password. Microsoft is switching off the
username-and-password (Basic auth) method these devices use. Jump straight
to [your options](#your-options-honestly), or read the timeline first.

---

If you have a network printer, scanner, NAS, backup job, or line-of-business
app that sends mail through `smtp.office365.com` with a username and
password, that setup has an expiry date. This page explains the timeline,
lays out **every** realistic option (most of which are not this project),
and is honest about the one case where ZeroSMTP actually fits.

## The timeline

Microsoft already removed Basic authentication for EAS, POP, IMAP, EWS,
Remote PowerShell, OAB, and Autodiscover back in 2022–2023. **SMTP AUTH was
the last protocol still allowed to use it**, and it's now on the way out
too. Per Microsoft's [updated deprecation timeline](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835)
(published 27 January 2026):

| When | What happens |
| --- | --- |
| Through December 2026 | No change — Basic auth for SMTP AUTH keeps working. |
| **End of December 2026** | **Disabled by default on existing tenants.** An admin can still re-enable it. |
| After December 2026 | New tenants get it **unavailable** by default. |
| Second half of 2027 | Microsoft announces the *final* removal date. |

So this isn't a cliff you fall off overnight — but the default flips at the
end of 2026, and re-enabling it is a temporary reprieve, not a fix. See also
Microsoft's [Deprecation of Basic authentication in Exchange Online](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online).

Hardware vendors have started publishing their own advisories about which
models can and can't be updated — for example
[Ricoh's notice on affected products](https://www.ricoh.com/info/2025/0526_1).
Check your device vendor's before assuming a firmware update exists.

## Your options, honestly

### 1. OAuth 2.0 / Microsoft Graph — the official answer

If your app is code you control, [implement OAuth 2.0 for SMTP AUTH](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth)
or switch to the [Graph `sendMail` API](https://learn.microsoft.com/en-us/graph/api/user-sendmail).
This is what Microsoft recommends and it keeps mail flowing from your own
domain with full auditing. It's also the only option on this page that
requires real development work — which is exactly why printers and 10-year-old
line-of-business apps are stuck.

### 2. Direct Send or an SMTP relay connector (still Microsoft, no Basic auth)

For devices on a network you control, Microsoft supports
[Direct Send and SMTP relay connectors](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365)
that authenticate by **static public IP or certificate instead of a
password**. If your printers sit behind a fixed public IP and you only send
to recipients inside your own organization, this often solves the problem
without touching the devices at all.

Limitations worth knowing before you commit: Direct Send only delivers to
your own tenant's domains, needs a static IP with correct SPF, and is
subject to its own throttling.

### 3. A dedicated on-prem relay (Postfix, IIS SMTP, etc.)

Point the devices at an internal relay, and let *that* relay handle modern
auth upstream. This keeps your domain as the sender and requires no device
changes, but it's another server to run, patch, and monitor. Our
[SYSTEM-MTA.md](SYSTEM-MTA.md) covers the Postfix side of this pattern.

### 4. A third-party SMTP service that still accepts username/password

Commercial relays (SendGrid, Mailgun, Brevo, SMTP2GO, Amazon SES…) accept
plain SMTP AUTH and let you verify your own domain, so devices keep working
with just a credential change. This is the usual paid answer, and for a
business sending on its own domain it's typically the right one — see
[ZeroSMTP vs. other free relays](ALTERNATIVES.md) for exactly what that
verification step involves.

### 5. ZeroSMTP — where it actually fits

This project is a free relay that accepts ordinary SMTP AUTH
(username + password, TLS) on `mx.msgwing.com`. For a device that can't do
OAuth, that means **changing three settings and nothing else**:

| Setting | Old (Exchange Online) | New |
| --- | --- | --- |
| Server | `smtp.office365.com` | `mx.msgwing.com` |
| Port | 587 | 587 (STARTTLS) or 465 (SSL/TLS) |
| Username / password | your M365 account | your `@msgwing.com` account |

**Be clear about the trade-off before you pick this.** Mail will go out
*from* an `@msgwing.com` address, **not** your company domain (see the
[FAQ](FAQ.md#will-emails-be-sent-from-my-own-domain-eg-youyourdomaincom)),
and there's a [200 emails/day limit](TROUBLESHOOTING.md#sending-limits-rate-limiting).
So:

- ✅ **Good fit:** scan-to-email where the scan just has to reach someone;
  device/NAS/backup alerts; a homelab or small office that has no budget and
  no one to run a mail server; keeping a legacy device useful instead of
  landfilling it.
- ❌ **Bad fit:** customer-facing mail, anything that must come from your
  company domain, anything above a couple hundred messages a day, or a
  regulated environment where the sending identity matters. Use option 1, 2,
  or 4 for those.

If that trade-off works for your case, the [Quickstart](https://github.com/msgwing/ZeroSMTP#quickstart)
takes about a minute, and [PRINTERS.md](PRINTERS.md) has per-brand settings
(Canon, Epson, Brother, HP, Ricoh…). Test the network path first with
[`check-connection.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.sh) — on a corporate network,
outbound 587/465 to a new host is often firewalled.

## Quick decision guide

Answer two or three questions for a straight recommendation, or read the
same logic as a flowchart below.

<div id="zc-quiz"></div>

<details>
<summary>Same logic as a flowchart (for reference, or if JavaScript is off)</summary>

```
Does the mail have to come FROM your own domain?
├── Yes ──► Can you change the app's code?
│           ├── Yes ──► OAuth 2.0 / Graph API            (option 1)
│           └── No  ──► Static IP available?
│                       ├── Yes ──► Direct Send / relay connector  (option 2)
│                       └── No  ──► On-prem relay (option 3) or paid SMTP (option 4)
└── No  ──► Low volume, non-critical (scans, device alerts)?
            ├── Yes ──► ZeroSMTP                          (option 5)
            └── No  ──► Paid SMTP service                 (option 4)
```

</details>

## "Can I just turn it back on?"

Until the end of December 2026, yes — an admin can re-enable SMTP AUTH
per-tenant or per-mailbox:

```powershell
# Tenant-wide (not recommended — re-enables it for every mailbox)
Set-TransportConfig -SmtpClientAuthenticationDisabled $false

# Better: leave it off tenant-wide, enable only the one mailbox that needs it
Set-CASMailbox -Identity printer@yourdomain.com -SmtpClientAuthenticationDisabled $false
```

Also check that a **Conditional Access policy blocking legacy
authentication** or **Security Defaults** isn't the actual cause — both
produce the same error, and neither is fixed by the commands above.

Treat this as breathing room to plan a real migration, not a solution.
Microsoft announces the final removal date in the second half of 2027, and
new tenants created after December 2026 don't get the option at all.

## Put the countdown in your own runbook

If you are the person who has to keep reminding colleagues that this date is
real, the countdown badge from this project is a live endpoint you are welcome
to embed. It recalculates daily, so an internal wiki page or a project README
carrying it stops going stale on its own.

Currently: ![days left](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json)

Markdown, for a README or wiki:

```markdown
![Exchange Online Basic auth countdown](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json)
```

HTML, for an intranet page or dashboard:

```html
<img alt="Exchange Online Basic auth countdown"
     src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown.json">
```

There is also a larger card, better suited to the top of a page than to a
row of badges:

```markdown
![Exchange Online Basic auth (SMTP AUTH) countdown](https://raw.githubusercontent.com/msgwing/ZeroSMTP/status/countdown-card.svg)
```

Both are plain static files served from this repository's `status` branch and
regenerated by a scheduled workflow. Nothing is tracked, and no attribution is
required — though a link back to this page gives whoever reads the badge
somewhere to go next.

## Related

- [AFFECTED-SYSTEMS.md](AFFECTED-SYSTEMS.md) — **what to audit**: which
  printers, NAS units, backup jobs, monitoring tools and line-of-business
  apps stop sending, with an Exchange Online PowerShell audit to find them
- [PRINTERS.md](PRINTERS.md) — per-brand scan-to-email settings
- [SYSTEM-MTA.md](SYSTEM-MTA.md) — Postfix/msmtp/Exim4 as a system relay
- [WINDOWS-SERVER.md](WINDOWS-SERVER.md) — IIS, ASP.NET, Exchange connectors
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — blocked ports, TLS, auth failures
