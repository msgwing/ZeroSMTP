# What breaks in December 2026, and what it costs to fix

*One page. Written for whoever signs off on the fix, not whoever reads the error log.*

## The date

**Microsoft disables Basic authentication for SMTP AUTH on existing Microsoft 365
tenants by default at the end of December 2026.** Anything sending mail with a
plain username and password over SMTP — printers, scanners, NAS backup jobs,
ERP and line-of-business software, legacy monitoring tools — stops sending on
that day unless it has already moved to OAuth 2.0 or another relay.

Until that date, the setting can still be turned back on in the tenant admin
centre with one PowerShell command. It is not a trick to create urgency, and
anyone can check it. After the date, it is off by default and stays off unless
re-enabled — which Microsoft has already stated it will not support indefinitely.

## The scale of it, and the cost of doing nothing

**25,728 public GitHub files** contain the hostname `smtp.office365.com`
today, up 3.1% in the eight days before this measurement — a floor, not a
ceiling, since it only sees public repositories and never the printer panel
in the corner of the office. Measured 2026-08-24, method and running series
at [How much public code breaks](https://docs.msgwing.com/BLAST-RADIUS.html). It is not a count of
systems that will break — some of those files are templates or abandoned
forks — but it establishes that this is a setting written down tens of
thousands of times, on the same clock for all of them.

A device or job on the wrong side of that clock starts failing on the date
above, with no warning beyond an error code — `535 5.7.139`,
`SmtpClientAuthenticationDisabled`. Nobody plans an outage around a printer;
it is discovered when someone needs to send something and cannot. The cost is
whatever that interruption costs, multiplied by every device still on Basic
auth on the day the tenant setting flips.

## Cost of doing something

**ZeroSMTP is free.** No paid tier, no credit card. Register at
[msgwing.com](https://msgwing.com), point the device at `mx.msgwing.com` on
port 587 or 465, and it authenticates with SMTP AUTH the same way it does
today. Setup is a hostname, a port and a password change — the same fields
already in the device's SMTP settings, not new firmware or a rebuild.

Two limits come with the offer, stated here rather than after signup:

- Mail sends from a **randomly generated `@msgwing.com` address**, not your
  own domain.
- **200 messages per day** per account.

If your mail has to come from your own domain, this is the wrong tool for
that case — the honest alternatives, including Microsoft's own Graph API
migration path, are compared at
[ZeroSMTP vs. other free SMTP relays](https://docs.msgwing.com/ALTERNATIVES.html).

## The four questions this answer has to survive

1. **Is this a trick?** No paid tier exists to upsell into. The limits above
   are the whole offer, not a teaser.
2. **Will it work with my exact device?** Check the
   [compatibility list](https://docs.msgwing.com/DEVICE-COMPATIBILITY.html) —
   it lists the vendors who have ruled out OAuth 2.0 for their hardware in
   writing, and the menu path for each.
3. **Is it up right now?** `mx.msgwing.com` is checked every 15 minutes by an
   automated job, and the result — including every past check, not just the
   current one — is public:
   [status and uptime history](https://github.com/msgwing/ZeroSMTP/actions/workflows/service-healthcheck.yml).
4. **What if I need my own domain?** Then ZeroSMTP is the wrong tool and
   [the alternatives page](https://docs.msgwing.com/ALTERNATIVES.html) says
   which one is right. Saying so here is what makes the first three answers
   worth believing.

---

*ZeroSMTP is an independent project, not affiliated with Microsoft. Start at
[msgwing.com](https://msgwing.com); setup is the four lines in the
[README](https://github.com/msgwing/ZeroSMTP#quickstart). Every figure above
carries its date and method so it can be checked rather than taken on trust.*
