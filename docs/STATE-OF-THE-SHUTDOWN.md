---
title: "State of the Basic auth shutdown, Q3 2026"
description: "A dated snapshot of the Microsoft 365 Basic auth retirement: the measured scale, one live example being missed, and the ecosystem responding."
---

# State of the Basic auth shutdown, Q3 2026

A snapshot, not a running counter — the pieces below are each measured on
their own date, cited here rather than reproduced, so this page can be
checked against its sources instead of taken on trust. If you're writing
about the December 2026 deadline and need something citable, this is the
one-page version; the primary sources it draws from are linked throughout.

## The scale, as far as it can honestly be measured

**At least 25,728 public files on GitHub** still contain the hostname
`smtp.office365.com`, up 3.1% in the eight days before the last measurement.
Full method, caveats and the raw weekly series: [How much public code breaks
in December 2026](BLAST-RADIUS.md). It is a floor, not a ceiling — it only
sees public repositories, and the printer control panel in the corner of an
office is invisible to any code search.

## A live example, not a hypothetical

Measured 2026-08-30: [Immich](https://github.com/immich-app/immich)
(112,990 GitHub stars, actively maintained) publishes an official setup
guide instructing users to authenticate to `smtp-mail.outlook.com` with an
"app password." That is still Basic authentication for SMTP AUTH underneath
— the same mechanism Microsoft is retiring — and the guide does not mention
the deprecation anywhere. [Reported upstream](https://github.com/immich-app/immich/issues/31134).

This is not chosen to single out one project. It's evidence that "large,
well-maintained, actively developed" is not, by itself, protection against
this specific problem — the failure mode is a documentation page nobody has
revisited since before the deprecation was announced, and that can happen to
any project regardless of size.

## The ecosystem is responding, independently

At least five other open-source projects address the same underlying
problem from different angles — evidence the issue is recognized industry-wide,
not a niche concern one project invented a market for:

| Project | Approach | Stars | Last push (measured 2026-08-30) |
| --- | --- | --- | --- |
| [simonrob/email-oauth2-proxy](https://github.com/simonrob/email-oauth2-proxy) | Local OAuth2 proxy in front of any SMTP client | 1,467 | 2026-07-03 |
| [SMTP2Graph/SMTP2Graph](https://github.com/SMTP2Graph/SMTP2Graph) | SMTP-to-Microsoft-Graph relay | 91 | 2026-05-03 |
| [JustinIven/smtp-oauth-relay](https://github.com/JustinIven/smtp-oauth-relay) | SMTP-to-Graph relay | 48 | 2026-08-24 |
| [ggpwnkthx/Microsoft-Graph-SMTP-Relay](https://github.com/ggpwnkthx/Microsoft-Graph-SMTP-Relay) | SMTP-to-Graph relay | 33 | 2026-07-02 |
| [oldium/microsoft-smtp-oauth2-proxy](https://github.com/oldium/microsoft-smtp-oauth2-proxy) | Local OAuth2 proxy | 9 | 2026-05-20 |

Not every entry here is thriving — two of the five haven't had a commit in
over three months. Included anyway: a stalled project still counts as
evidence that someone thought this problem was worth building for.

None of these are ZeroSMTP, and most solve a genuinely different problem —
proxying to OAuth2 while keeping your own domain, rather than relaying
through a shared one. See [ZeroSMTP vs. other free SMTP
relays](ALTERNATIVES.md) for where each approach actually fits, including
the cases where ZeroSMTP is the wrong answer.

## The timeline

Per Microsoft's own [updated
timeline](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835):
Basic authentication for SMTP AUTH is disabled by default on existing
Microsoft 365 tenants at the end of December 2026, unavailable by default
for tenants created after that, with final removal announced for the second
half of 2027. Microsoft has revised this date before — check that page for
what is currently accurate, not this one.

## Reusing this page

Free to cite, quote and republish under this repository's MIT licence — a
link back is appreciated, not required. Each figure above carries its own
date and source so it can be re-verified rather than re-quoted blind.

## Related

- [How much public code breaks in December 2026](BLAST-RADIUS.md) — the full weekly series
- [What breaks, and when](AFFECTED-SYSTEMS.md)
- [ZeroSMTP vs. other free SMTP relays](ALTERNATIVES.md)
- [The dated Microsoft timeline](EXCHANGE-ONLINE-SMTP-AUTH.md)
