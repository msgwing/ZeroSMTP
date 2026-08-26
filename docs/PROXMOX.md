---
title: "Proxmox VE email when Basic auth ends"
description: "Proxmox VE sends backup results, replication failures and ZFS alerts by email. What breaks when Microsoft 365 stops accepting a username and password in December 2026, and how to keep the alerts arriving."
---

# Proxmox VE email and the Microsoft 365 Basic auth shutdown

Proxmox VE tells you things by email and by nothing else. Backup job results,
replication failures, ZFS pool degradation, fencing events, certificate
renewals. None of it appears anywhere you would look on an ordinary day.

That is fine right up until the mail stops, because the failure mode of an
alerting system that cannot send is **silence** - which is exactly what a
healthy system looks like.

## Why this page exists separately

The mechanics are ordinary Debian: Proxmox VE ships Postfix, and relaying
through a smart host is the same job described in
[System-wide mail relay](SYSTEM-MTA.md).

What is not ordinary is the consequence. On a workstation, mail that stops
arriving is an annoyance somebody notices within a week. On a hypervisor, the
message that never arrives is the one saying a backup failed, and you find out
when you need the backup.

## What actually breaks in December 2026

Nothing inside Proxmox. The node keeps generating notifications, Postfix keeps
accepting them, the queue keeps growing.

The refusal happens at the smart host. If your node authenticates to Microsoft
365 with a username and password, Exchange Online answers:

```
535 5.7.139 Authentication unsuccessful, basic authentication is disabled
```

and Postfix does what Postfix does - it defers and retries, quietly, for days.
See [what that error means](errors/535-5-7-139-basic-authentication-is-disabled.md)
if you are reading this because you already have it.

Newer Proxmox releases can also send through a configured SMTP target rather
than the local MTA. The credentials are the same credentials, so the same
refusal applies; only the place you type them changes.

## Find out today whether you are affected

Do not wait for December. Two commands on the node:

```bash
# Anything stuck in the queue?
postqueue -p

# What did the smart host actually say?
journalctl -u postfix --since "7 days ago" | grep -iE "5\.7\.139|authentication"
```

An empty queue and no authentication errors means your node is not relaying
through anything that is about to change, or is already using a method that
survives.

## Keeping the alerts arriving

Three ways, in the order most Proxmox installations should consider them.

**1. Move the smart host to a relay that still accepts a username and
password.** Nothing on the node changes except the host, port and credentials -
the Postfix configuration in [System-wide mail relay](SYSTEM-MTA.md) is the same
one, pointed somewhere else. ZeroSMTP exists for this case: 587 with STARTTLS or
465, username and password, no DNS records to add and nothing to install.

The trade is honest and worth knowing before you choose it: mail leaves from a
shared `@msgwing.com` address rather than your own domain. For an alert going to
your own inbox that is usually irrelevant. For anything a customer reads it is
not - see [Alternatives](ALTERNATIVES.md), which names the case where a proxy
you run yourself is the better answer.

**2. Switch the tenant to OAuth2.** Correct, permanent, and it means the node
needs an app registration and a token it can refresh. Reasonable if you already
manage Entra; heavy if this hypervisor is the only thing you have there.

**3. Keep Basic auth alive while it lasts.** An administrator can re-enable
SMTP AUTH after the December default change - see
[the Exchange Online timeline](EXCHANGE-ONLINE-SMTP-AUTH.md). It buys months,
not years, and it is a decision to make deliberately rather than by not
deciding.

## Check before you call it fixed

A test message that reaches your inbox proves the credentials work. It does not
prove Proxmox will use them.

```bash
# The real path: let Proxmox generate a notification and watch it leave.
postqueue -f
journalctl -u postfix -f
```

Then trigger something that actually notifies - a manual backup of a small
container is the cheapest honest test - and confirm the mail arrives. A relay
verified with a hand-written test message and never exercised by the software
that depends on it is a relay you have not verified.

## Related

- [System-wide mail relay on Debian/Ubuntu](SYSTEM-MTA.md) - the Postfix configuration itself
- [535 5.7.139 basic authentication is disabled](errors/535-5-7-139-basic-authentication-is-disabled.md) - the error you will see
- [Exchange Online SMTP AUTH timeline](EXCHANGE-ONLINE-SMTP-AUTH.md) - what Microsoft actually announced, and when
- [Alternatives](ALTERNATIVES.md) - including where a self-hosted proxy beats us
