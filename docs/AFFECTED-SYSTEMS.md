# What breaks when Microsoft 365 turns off SMTP AUTH Basic auth

A risk assessment of the systems that stop sending email when Basic
authentication for SMTP AUTH is disabled — by default at the **end of
December 2026**, per Microsoft's
[updated deprecation timeline](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835).

For the timeline itself and the full list of migration options, see
[EXCHANGE-ONLINE-SMTP-AUTH.md](EXCHANGE-ONLINE-SMTP-AUTH.md). This page is
about **inventory**: finding the things in your environment that will quietly
stop working.

## Why this is easy to miss

The systems most at risk share a nasty property: **they only send email when
something is already wrong.** A backup failure alert, a UPS on battery, a
disk in a NAS degrading, a monitoring alarm. Nobody notices they've stopped
working until the day one of them needed to reach you and didn't.

Scan-to-email breaks loudly — a user complains the same morning. Alerting
breaks silently, and you find out during the incident it should have warned
you about.

## Find your exposure first

Before auditing devices one by one, ask Exchange Online who is actually
still using SMTP AUTH. The report covers the last 90 days:

```powershell
Connect-ExchangeOnline
# Which mailboxes still have SMTP AUTH enabled?
Get-CASMailbox -ResultSize Unlimited |
  Where-Object { $_.SmtpClientAuthenticationDisabled -eq $false } |
  Select-Object DisplayName, PrimarySmtpAddress

# Tenant-wide setting ($false here means SMTP AUTH is allowed)
Get-TransportConfig | Select-Object SmtpClientAuthenticationDisabled
```

The snippet above misses one case on purpose kept simple: a mailbox whose
`SmtpClientAuthenticationDisabled` is `$null` inherits the tenant setting, so
it is fully exposed whenever the tenant allows SMTP AUTH — and filtering on
`-eq $false` never shows it.
[`Find-SmtpAuthExposure.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/Find-SmtpAuthExposure.ps1)
handles all three states, counts them separately and can export a CSV to hand
to whoever owns the devices. It is read-only.

Microsoft also exposes a **SMTP AUTH client submission report** in the
Exchange admin center (Reports → Mail flow) showing which clients and IPs
have authenticated recently — that's usually the fastest way to find the
forgotten device nobody remembers configuring.

## Confirmed affected — vendors have published advisories

These aren't predictions; the vendor or a support channel has documented the
breakage publicly.

| System | Evidence | Quick fix notes |
| --- | --- | --- |
| **Ricoh multifunction printers** | [Official advisory](https://www.ricoh.com/info/2025/0526_1) listing affected products and firmware status | [Gist](https://gist.github.com/msgwing/90db4abd056e013aceb126c4d67f6012) |
| **Konica Minolta / DEVELOP ineo MFPs** | [Vendor advisory](https://www.develop.eu/en/support/discontinuation-of-basic-authentication-for-smtp.html) listing affected models across 10 product groups — and, notably, a set marked **"N/A": no OAuth firmware planned** (ineo 306/7228/266, ineo+ 266/256/226, ineo 4750/4050, ineo 4700P/3301P/4000P, ineo 165/185 variants). For those, the vendor itself suggests a different mail service. | Update firmware if your model is in a supported group. If it's on the "N/A" list, firmware won't save it — [swap the SMTP settings](PRINTERS.md#konica-minolta) instead. |
| **Xerox printers and MFPs** | [Vendor advisory](https://www.xerox.com/en-us/office/insights/exchange-online-authentication) — names Scan to Email, Internet Fax (Send), Fax Forward to Email and Auto Email Notifications as affected. OAuth firmware exists for the supported list (Device Code Flow broadly; Client Credentials Flow only on ConnectKey models such as VersaLink B415/C415, B620/C620, B625/C625, AltaLink and PrimeLink). Devices off that list are the problem cases. | Check your model against Xerox's supported-firmware list first — no hardware change is needed if it's there. If it isn't, [change the SMTP settings](PRINTERS.md#xerox). |
| **Microsoft Dynamics NAV / Business Central** | [Vendor guidance](https://www.innovia.com/blog/microsoft-to-retire-basic-auth-smtp-for-exchange-online-what-bc-nav-users-need-to-know) for affected installs | Follow the linked guidance for your version; older on-prem NAV installs generally need their SMTP account repointed at a relay. |
| **Laserfiche workflows** | [Community thread](https://answers.laserfiche.com/questions/200557/Disabling-basic-authentication-causing-Workflow-emails-to-fail) — workflow emails failing | [Gist](https://gist.github.com/msgwing/ce9c7d2de9b3c1c942e459f372772866) |
| **ManageEngine OpManager** | [Vendor fix guide](https://www.manageengine.com/network-monitoring/how-to/fix-smtpclientauth-disabled-error.html) for the SMTPClientAuth error | [Gist](https://gist.github.com/msgwing/899fd2ce0da733770bedf4942987ce47) |
| **Cerberus FTP Server** | [Support article](https://support.cerberusftp.com/hc/en-us/articles/24103821642643-Troubleshooting-SMTP-Setup-Error-on-Office365-com-Resolving-EHLO-Message-Failure-535-5-7-139-Authentication-Unsuccessful-Basic-Authentication-Disabled) on the exact 535 5.7.139 error | [Gist](https://gist.github.com/msgwing/f9b201aeddd34c8a156cf35fca85f6c5) |
| **Fax servers (e.g. Faxination)** | [Vendor timeline notice](https://faxination.com/microsoft-timeline-for-basic-authentication-deprecation-in-exchange-online-smtp-auth/) | Apply the vendor's update if one exists for your version; otherwise repoint the outbound SMTP account. |
| **Cisco Unity Connection** | Named in [Microsoft's own deprecation docs](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) | Check your release for OAuth support first; if it has none, repoint the SMTP notification settings at a relay. |
| **Microsoft Teams Rooms** | Named in Microsoft's docs as needing modern auth enabled | Enable modern auth on the resource account — this one is Microsoft's own product, so no relay is needed. |
| **QNAP NAS** | QNAP's own notification settings don't support OAuth for Microsoft 365 SMTP, only username/password | [Gist](https://gist.github.com/msgwing/39958d909e085ae9cc0e6b3584d930bf) |
| **Veeam (older versions)** | [Veeam docs](https://helpcenter.veeam.com/docs/vbo365/guide/smtp_server.html) — some versions support only SMTP basic auth; newer ones added OAuth | [Gist](https://gist.github.com/msgwing/ac5e126b0389c38cd7c13517eeec44a4) |
| **Kyocera "Send Error 1102"** | Kyocera's device-side code for an SMTP auth failure | [Gist](https://gist.github.com/msgwing/882d045c3dfa9750e1cb3f020a5f4304) |
| **Generic `535 5.7.3` from `smtp.office365.com`** | Same root cause, different wording | [Gist](https://gist.github.com/msgwing/66c97a2c9a399861bac89fcefc00ea67) |

## Categories to audit

Whether a specific unit breaks depends on two things: **can its firmware do
OAuth 2.0**, and **has your admin re-enabled Basic auth** as a stopgap. Older
and cheaper hardware overwhelmingly cannot do OAuth and never will.

### Printers, scanners, MFPs — the largest group
Scan-to-email on Ricoh, Canon, Konica Minolta, Xerox, Sharp, Kyocera,
Brother, HP, Epson, Lexmark. Devices more than a few years old rarely get
firmware adding OAuth. See [PRINTERS.md](PRINTERS.md) for per-brand settings.

### Storage and infrastructure hardware
NAS units (QNAP, Synology, TrueNAS), UPS monitoring (APC PowerChute and
similar), RAID controller alerts, IPMI/iDRAC/iLO out-of-band notifications,
switch and firewall alerting. **This is the silent-failure category** — these
only email you when hardware is already failing.

### Backup and disaster recovery
Veeam, Acronis, Macrium, Bacula, Nakivo, and custom backup scripts. A backup
job that fails silently for months is materially worse than one that fails
loudly on day one.

### Monitoring and alerting
Nagios, Zabbix, PRTG, Icinga, LibreNMS, ManageEngine, Checkmk. Same silent
failure mode, and often the very system meant to catch the others.

### Line-of-business and legacy applications
ERP and accounting (Dynamics NAV/BC, Sage, older SAP integrations), document
management (Laserfiche and similar), ticketing and helpdesk, HR and payroll
systems, hospital/lab/school information systems. Frequently vendor-locked,
out of support, or maintained by someone who left years ago.

### Web applications and self-hosted software
WordPress with an SMTP plugin, WooCommerce order mail, Nextcloud, GitLab,
Jenkins, Grafana alerts, Zabbix, Home Assistant, phpBB, and any in-house app
whose mail config is a hardcoded username and password.

### Scripts and automation
PowerShell using `Send-MailMessage` (itself deprecated), Python `smtplib`,
cron jobs, scheduled tasks, database jobs (SQL Server Database Mail), CI/CD
pipelines. Usually the easiest to fix — someone can edit the code — but also
the easiest to forget, because they're not in any asset inventory.

### Physical security and building systems
Alarm panels, camera/NVR motion alerts, access control, environmental
sensors in server rooms. Old, rarely touched, and often the last thing anyone
thinks to audit.

## Practical triage

1. **Run the PowerShell audit above** and pull the SMTP AUTH client
   submission report — start from what's actually authenticating, not from
   memory.
2. **Sort by silent vs. loud.** Anything whose only job is to warn you
   (backups, monitoring, UPS, hardware alerts) goes first, because its
   failure hides itself.
3. **Check firmware/version support for OAuth** per device. If the vendor
   has no OAuth path, no amount of planning changes the outcome — it needs a
   different relay.
4. **Pick a route per system** from the five options in
   [EXCHANGE-ONLINE-SMTP-AUTH.md](EXCHANGE-ONLINE-SMTP-AUTH.md).
5. **Test before December**, not after. Re-enabling Basic auth is available
   until then and buys planning time, but it is not a fix.

## Where ZeroSMTP fits — and where it doesn't

ZeroSMTP accepts ordinary SMTP AUTH (username + password over TLS), so for a
device with no OAuth path it's a three-field change: server, port,
credentials. Nothing else about the device changes.

**It fits** the silent-alert category well: NAS and UPS notifications, backup
job results, monitoring alarms, scan-to-email inside an organization,
homelabs, schools and small offices with no budget for a paid relay. For
those, what matters is that the message *arrives at all* — the sender address
is irrelevant.

**It does not fit** anything customer-facing, anything that must come from
your company domain, anything above roughly 200 messages a day, or regulated
environments where sender identity is auditable. For those, use OAuth/Graph,
a Direct Send connector, your own relay, or a paid service — all covered in
the [migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md), which recommends them
over this project where they're the better answer.

Test the network path first with [`check-connection.sh`](https://github.com/msgwing/ZeroSMTP/blob/main/check-connection.sh)
— corporate firewalls often block outbound 587/465 to a new host, which looks
identical to an authentication problem.
