# SMTP AUTH error messages and what they mean

If you searched or pasted an error and landed here, find it below. These are
the messages Microsoft 365 and its clients produce when username-and-password
authentication for SMTP is refused.

**None of them mean your password is wrong.** They mean the authentication
*method* is switched off, which is a different problem with a different fix.

## Why the same error has four different causes

Basic auth for SMTP AUTH gets refused in four situations, and the client-side
message is identical in all of them. Knowing which one you are in decides
whether you can simply turn it back on:

| Cause | Can you re-enable it? |
| --- | --- |
| An admin disabled SMTP AUTH for the tenant or the mailbox | Yes, until the December 2026 default flip |
| **Security Defaults** — on by default for tenants created recently | Yes, but it disables more than SMTP and turning it off weakens the tenant |
| A **Conditional Access** policy blocking legacy authentication | Yes, by scoping the policy — usually deliberate, so ask why it exists first |
| The **end-of-December-2026 default change** | No |

Before December 2026 the first three are the likely answer, and the fix may be
a setting rather than a migration. After it, re-enabling is no longer an
option — see [the migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md).

## Microsoft 365 / Exchange Online

Each of these has a page of its own with the full diagnosis — follow the
error you actually saw.

| Error | What it means |
| --- | --- |
| [`535 5.7.139 Authentication unsuccessful, basic authentication is disabled`](errors/535-5-7-139-basic-authentication-is-disabled.md) | Microsoft 365 refused username/password auth. Credentials are fine; the method is off. |
| [`535 5.7.139 ... SmtpClientAuthentication is disabled for the Tenant`](errors/535-5-7-139-smtpclientauthentication-is-disabled-for-the-tenant.md) | Same cause, reported at tenant level — the setting applies to every mailbox that inherits it. |
| [`535 5.7.139 ... SmtpClientAuthentication is disabled for the Mailbox`](errors/535-5-7-139-smtpclientauthentication-is-disabled-for-the-mailbox.md) | Same cause, reported for **this one mailbox**. Either it was disabled explicitly for this mailbox, or it inherits a tenant-wide block. Common on personal Outlook.com accounts and on single mailboxes an admin has locked down. |
| [`535 5.7.3 Authentication unsuccessful`](errors/535-5-7-3-authentication-unsuccessful.md) | Generic refusal, same set of causes. |
| [`535 5.7.57 SMTP; Client was not authenticated to send anonymous mail`](errors/535-5-7-57-client-was-not-authenticated-to-send-anonymous-mail.md) | The client sent no credentials at all, or sent them after `MAIL FROM`. Usually a client configured for anonymous relay pointed at an authenticated endpoint. |
| [`550 5.7.60 SMTP; Client does not have permissions to send as this sender`](errors/550-5-7-60-client-does-not-have-permissions-to-send-as-this-sender.md) | Authentication succeeded, but the `From` address does not belong to the authenticated mailbox. A different problem from the ones above. |

Which mailboxes are still exposed on your own tenant is answerable in one
command — see
[`Find-SmtpAuthExposure.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/Find-SmtpAuthExposure.ps1).
It is read-only, and it counts the mailboxes that inherit the tenant setting
rather than having their own, which the usual one-liner misses.

## Device and application wording

Vendors rarely pass the server's message through. These are the same refusal
in local dress:

| What you see | Where | What it means |
| --- | --- | --- |
| **Send error 1102** / `0x1102` | Kyocera MFPs | Kyocera's code for an SMTP authentication failure |
| `Authentication failed` / `Login failed` on the panel | Most printer and scanner panels | Vendor wording for the above |
| `SMTPAuthenticationError (535, ...)` | Python `smtplib` | The 535 above, wrapped |
| `javax.mail.AuthenticationFailedException` | Java / JavaMail | Same |
| `AuthenticationInvalidCredentials` / `5.7.139` | .NET, MailKit | Same |
| Backup or monitoring job reports "email failed", no code | Veeam, Zabbix, Nagios, PRTG and similar | Check the tool's own SMTP log; the 535 is usually there |

Alerting tools are the dangerous case: they fail **silently**, so you find out
during the incident they were supposed to warn you about. [What
breaks](AFFECTED-SYSTEMS.md) has the audit list.

## Not authentication at all

Two failures get mistaken for this and have unrelated fixes:

| Symptom | Actual cause |
| --- | --- |
| Connection times out, no auth error ever appears | The network is blocking outbound SMTP. Cloud providers block port 25 and often 587 by default — see [troubleshooting](TROUBLESHOOTING.md). |
| `Certificate verify failed` / `unable to get local issuer certificate` | The device's trust store cannot validate the server certificate. Common on hardware whose firmware predates current root CAs — see [the Canon Maxify MB2755 case](DEVICE-CASE-STUDIES.md). |

## What to do next

1. Establish which of the four causes applies. If it is one of the first
   three, re-enabling may be the whole fix.
2. If firmware or software is the blocker, check whether your vendor shipped
   an OAuth update — and whether they have stated they will not. Models the
   vendor has ruled out are listed in [devices that will never get OAuth
   firmware](NO-OAUTH-FIRMWARE.md).
3. If nothing on the device can change, the sending has to move: Direct Send
   for internal-only recipients, or a relay that still accepts a username and
   password. [The migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md) covers every
   option, including the ones that are not this project.

## An error not listed here?

[Open an issue](https://github.com/msgwing/ZeroSMTP/issues/new/choose) with
the exact string and what produced it. Errors reported from real hardware and
real software are worth more than anything transcribed from documentation, and
get added here.
