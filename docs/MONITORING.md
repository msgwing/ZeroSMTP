# Monitoring alerts via SMTP relay

Monitoring tools use two different patterns for sending alert email, and it
changes what you actually need to configure:

- **Tools with their own built-in SMTP settings** (Zabbix, Uptime Kuma, PRTG)
  — you enter `mx.msgwing.com` and your `@msgwing.com` credentials directly
  in that tool's UI. There's no config file to edit.
- **Tools that shell out to the system's mail command** (classic Nagios,
  Icinga2) — they don't have their own SMTP settings at all. They call
  `mail`/`sendmail` and rely on **the system's own MTA** to deliver it. Point
  that at `mx.msgwing.com` once — see [SYSTEM-MTA.md](SYSTEM-MTA.md) — and
  every tool on that host that already calls `mail`/`sendmail` starts
  working through the relay with no per-tool change at all.

The connection values are the same everywhere:

| Setting | Value |
| --- | --- |
| Server | `mx.msgwing.com` |
| Port | `587` (STARTTLS) or `465` (SSL/TLS) |
| Encryption | STARTTLS on 587, or SSL/TLS on 465 — required |
| Authentication | Username + password (`LOGIN` or `PLAIN`) |
| Username / From | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |

> **The username and password come from an account, and the account is free.**
> Register at [msgwing.com](https://msgwing.com), activate, and copy the
> generated login and password — they are shown once. Mail leaves from that
> generated `@msgwing.com` address rather than your own domain, and the cap is
> 200 messages a day with no paid tier that lifts it. Both limits are stated
> here rather than discovered later; if either one rules this out for you,
> [the alternatives page](ALTERNATIVES.md) names the tools that do not have
> them.

## Zabbix

Zabbix's email alerting is a **Media type**, configured in the frontend or
via API — not a config file. Under **Administration → Media types → Email**
(exact menu path varies slightly by Zabbix version):

| Field | Value |
| --- | --- |
| SMTP server | `mx.msgwing.com` |
| SMTP server port | `587` or `465` |
| SMTP helo | your domain or hostname (anything valid) |
| SMTP email | your `@msgwing.com` login |
| Connection security | `STARTTLS` (port 587) or `SSL/TLS` (port 465) |
| Authentication | `Username and password` |
| Username | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |

Then assign that media type to a user under **Users → Media**, and use it in
an alert action. See
[Zabbix: configure email media type](https://www.zabbix.com/documentation/current/en/manual/config/notifications/media/email)
for the current field layout on your version.

## Uptime Kuma

Under **Settings → Notifications → Setup Notification**, choose
**Email (SMTP)** as the notification type:

| Field | Value |
| --- | --- |
| Hostname | `mx.msgwing.com` |
| Port | `587` or `465` |
| Security | `STARTTLS` (port 587) or `TLS` (port 465) |
| Username | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |
| From Email | your `@msgwing.com` login |
| To Email | wherever you want the alert |

Save, then use **Test** to confirm before attaching it to a monitor.

## Nagios / Icinga2

These don't have their own SMTP settings — the default notification
commands (`notify-host-by-email`, `notify-service-by-email`, or Icinga2's
`mail-host-notification`/`mail-service-notification`) pipe the message to
the system's `mail` or `sendmail` command, which hands off to whatever MTA
is installed (usually Postfix, msmtp or Exim on the monitoring server).

That means the fix isn't a Nagios/Icinga setting at all — it's making the
**host's own outgoing mail** work, which [SYSTEM-MTA.md](SYSTEM-MTA.md)
already covers (Postfix satellite mode, msmtp, or Exim4). Do that once, then
verify with the same command Nagios/Icinga already uses:

```bash
echo "Test from Nagios/Icinga host" | mail -s "ZeroSMTP test" you@example.com
```

If that delivers, existing notification commands work unchanged.

## PRTG

Under **Setup → Account Settings → Notification Delivery → Add New Mail
Server** (menu wording varies by PRTG version):

| Field | Value |
| --- | --- |
| Server | `mx.msgwing.com` |
| Port | `587` or `465` |
| Connection security | `STARTTLS` (port 587) or `Implicit SSL` (port 465) |
| Authentication | enabled, username + password |
| Username | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |
| Sender address | your `@msgwing.com` login |

Send a test notification from the same screen before relying on it.

## Rate limits apply here too

Monitoring alerts can burst during an outage — a flapping check can queue up
dozens of notifications in minutes. The same
[sending limits](TROUBLESHOOTING.md#sending-limits-rate-limiting) apply
(5/minute, 50/hour, 200/day): configure alert flapping/throttling in your
monitoring tool so a single incident doesn't burn through the daily limit
before a human sees it.

## Certificate expiry, from CI

Every check above watches whether the relay is answering. None of them watches
the thing that takes mail down without any warning at all: the certificate on
your own mail server expiring.

It is worth a separate line because of how it fails. Nothing degrades, nothing
retries, no alert threshold is crossed. It works on Saturday and on Sunday it
does not, and the first report is somebody saying scanning stopped working.

```yaml
- uses: msgwing/ZeroSMTP@v1
  with:
    host: smtp.office365.com
    cert-expiry-days: '14'
```

Put it on a schedule and the build goes red two weeks before the certificate
does. `fail-on-error: false` reports without failing, which is what you want if
the host is somebody else's and a red build would page the wrong person.

No credentials are used and no mail is sent - the conversation stops after
`EHLO`, the same as [`npx zerosmtp-check`](https://www.npmjs.com/package/zerosmtp-check).
