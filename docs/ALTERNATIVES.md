# ZeroSMTP vs. other free SMTP relays

There are three ways to keep mail flowing without Basic authentication.
Services built for sending from **your own domain** (SMTP2GO, Brevo,
MailerSend, and similar). A **proxy you run yourself**, which keeps your
domain and your tenant. And ZeroSMTP, for sending when you **don't want to
touch DNS or run anything at all**. None is "better" in the abstract — they
solve different problems, and the third option is the one most comparisons
leave out.

![Setup path: a typical free relay takes five steps including DNS configuration; ZeroSMTP takes three steps with no DNS work](assets/setup-comparison.svg)

## The one difference that matters

Every relay below gives you SMTP credentials (username + password) — that
part is standard. What differs is what happens *before* you can use them.

| | ZeroSMTP | SMTP2GO / Brevo / MailerSend (typical) |
| --- | --- | --- |
| **Time to first email** | ~2 minutes | Minutes to 48 hours (DNS propagation) |
| **DNS records to configure** | None | SPF + DKIM (and DMARC, recommended) |
| **Sends from your own domain** | ❌ shared `@msgwing.com` address | ✅ once verified |
| **Sender reputation** | Shared — actively monitored for abuse, but no single account controls the whole pool's reputation | Yours alone to build and protect — a fresh domain/IP has no reputation yet, but you're the only one who can wreck it |
| **Free tier** | 200/day, permanent | 100/month to 12,000/month — [the numbers are below](#what-the-free-tiers-actually-allow) |
| **Credit card required** | No | Usually no |
| **Best fit** | Printers, NAS units, scripts, legacy devices — anything that just needs mail to leave, from anyone | Apps and products sending under your own brand |

Sources: [SMTP2GO — verified senders](https://support.smtp2go.com/hc/en-gb/articles/115004408567-Verified-Senders)
(verification required for normal sending), [Brevo domain authentication](https://community.brevo.com/t/smtp-domain-authentication-sender-domain-verification/760)
(not required to start, recommended for deliverability).

## What the free tiers actually allow

The vague version of this comparison — "roughly 300/day to 3,000/month" — was
doing us no favours and is not much use to anybody deciding. The published free
tiers, as surveyed by
[EmailToolTester's roundup of free SMTP servers](https://www.emailtooltester.com/en/blog/free-smtp-servers/):

| Service | Free tier | Own domain |
| --- | --- | --- |
| SendPulse | 12,000/month | required |
| Brevo | 300/day | recommended |
| Mailtrap | 4,000/month | required |
| Maileroo | 3,000/month | required |
| MailerSend | 500/month | required |
| Mailjet | 200/day | required |
| **ZeroSMTP** | **200/day** | **not possible** |
| SendGrid | 100/day | required |
| Elastic Email | 100/day | required |
| Postmark | 100/month | required |

Two things worth reading off that table, and the second is against us.

**On volume we are mid-pack, not bottom.** 200 a day matches Mailjet, doubles
SendGrid and Elastic Email, and is sixty times what Postmark's free tier
allows. For a printer sending scans this is not the constraint anybody thinks
it is.

**On everything else those services are more capable.** They send from your
domain, report deliverability, handle bounces and suppression lists, and scale
when you outgrow the free tier. We do none of that and never will. If you are
building a product that emails customers, one of them is the right answer and
this is not a close call.

Limits move. These were current when this page was last reviewed; check the
provider before deciding on the strength of a number in somebody else's table,
including ours.

## The option most comparisons leave out: a proxy you run yourself

If the mail has to come from your own domain **and** you would rather not
hand it to a third party, there is a third answer: run a small SMTP server
inside your own network that accepts username-and-password from the device
and speaks OAuth2 to Microsoft on the other side. The device never learns
that anything changed.

There is a whole shelf of these, and for a long time this page named only
one of them. That was not a judgement — it was the only one we had found.
First measured on 2026-08-27; re-measured on 2026-09-10, searching GitHub with
competitors' own vocabulary ("microsoft graph smtp relay", "oauth2 smtp
proxy", "exchange online smtp oauth") rather than ours, and reading each
last-commit date off the repository's own commit list — not the `pushed_at`
field alone, which one entry below shows can be misleading:

| Project | Stars | Last real commit | Licence | Shape |
| --- | ---: | --- | --- | --- |
| [`simonrob/email-oauth2-proxy`](https://github.com/simonrob/email-oauth2-proxy) | 1470 | 2026-07-03 (69 days quiet) | Apache-2.0 | IMAP/POP/**SMTP** proxy; still the largest of these by a wide margin, no longer receiving commits |
| [`rustmailer/rustmailer`](https://github.com/rustmailer/rustmailer) | 504 | **2026-09-07** | custom, source-visible ("all rights reserved", not OSI) | broader self-hosted email middleware for developers (IMAP/SMTP/Gmail API/Graph API), not printer-specific — shipped an OAuth2-client-credentials flow for Microsoft Graph on 2026-08-13; the most actively developed large project on this shelf today |
| [`SMTP2Graph/SMTP2Graph`](https://github.com/SMTP2Graph/SMTP2Graph) | 92 | 2026-05-03 (130 days quiet) | GPL-3.0 | SMTP server that relays over the Microsoft Graph API; dead |
| [`JustinIven/smtp-oauth-relay`](https://github.com/JustinIven/smtp-oauth-relay) | 49 | 2026-08-12 (29 days quiet) | Apache-2.0 | small SMTP → Graph relay — GitHub's `pushed_at` for this repo reads 2026-09-03, but that push was a dependabot branch and pull request, never merged; the last real commit to `main` is three weeks older |
| [`ggpwnkthx/Microsoft-Graph-SMTP-Relay`](https://github.com/ggpwnkthx/Microsoft-Graph-SMTP-Relay) | 34 | 2026-07-02 (70 days quiet) | MIT | same idea, Python; dead |
| [`oldium/microsoft-smtp-oauth2-proxy`](https://github.com/oldium/microsoft-smtp-oauth2-proxy) | 9 | 2026-05-20 (113 days quiet) | — | SMTP-only, deliberately minimal; dead |
| [`debold/GraphMailer.NET`](https://github.com/debold/GraphMailer.NET) | 2 | **2026-09-02** | MIT | Windows SMTP relay for Microsoft 365 aimed squarely at "legacy apps, scanners, and devices" — the same audience as the case for ZeroSMTP below. Fewest stars on this shelf, but 21 real commits in the last 30 days, one author, genuine feature work (malware scanning, message rules, a fixed restart bug) — more active than everything above it except `rustmailer` |

Two things worth saying plainly rather than leaving you to work out.

**The two approaches in that table are not the same thing.** A *proxy* speaks
SMTP to Microsoft with an OAuth2 token, so your mail leaves through Exchange
Online exactly as it does today. A *Graph relay* hands the message to the
Microsoft Graph API instead, which is the direction Microsoft is pushing and
which sidesteps SMTP AUTH entirely — but it is a different code path, with
different permissions to grant and different failure modes. Neither is
obviously better; they fail differently.

**This page previously recommended the 9-star one.** Not out of preference —
we had not measured the shelf. If you are choosing today and you want the
option most other people have used and reported bugs against, that is still
`simonrob/email-oauth2-proxy`, even though it has not taken a commit in over
two months. If you want something under active development right now, the
honest answer changed between the two measurements: on 2026-08-27 it looked
like `JustinIven/smtp-oauth-relay`; re-checked today its apparent September
activity turned out to be an unmerged dependabot branch, and the two projects
actually taking commits this week are `rustmailer/rustmailer` (broader scope,
custom licence) and `debold/GraphMailer.NET` (narrowest scope, MIT, and the
closest match to ZeroSMTP's own audience of legacy printers and scanners).

All of them are a better answer than we are for the case below.

| | ZeroSMTP | A proxy you run yourself |
| --- | --- | --- |
| **Sends from your own domain** | ❌ shared `@msgwing.com` address | ✅ your tenant, your domain |
| **Anything to install or keep running** | ✅ nothing | ❌ a server that has to stay up, patched, and reachable by the device |
| **Entra app registration required** | ✅ none | ❌ yes — you register the app and manage its secret |
| **Who is in the mail path** | us | nobody but you and Microsoft |
| **Time to first email** | ~2 minutes | as long as it takes to deploy and register the app |
| **When it fails at 2am** | our problem | yours |

**Pick the proxy if** the sender identity matters, you already run
infrastructure, and adding one more service to keep alive is not a burden.
**Pick us if** the thing sending the mail is a printer in an office with
nobody to look after a server, and the address it sends from does not
matter to anyone.

We are not going to pretend that a shared sending address is a feature. It
is the price of having nothing to install, and for a scan-to-email button
on a copier it is usually the right price. For an application that sends
receipts to your customers, it is not.

## Which one fits you

- ✅ **Pick ZeroSMTP if:** you don't have a domain to spare for this, don't
  want to learn what an SPF record is, or the device sending the mail
  (a printer, a NAS, a cron job) doesn't care whose address it comes from —
  see [Printers](PRINTERS.md) and [Device case studies](DEVICE-CASE-STUDIES.md).
- ✅ **Pick a proxy you run yourself if:** the mail must come from your own
  domain, you want nobody else in the path, and you already have somewhere
  to run it — see [the section above](#the-option-most-comparisons-leave-out-a-proxy-you-run-yourself).
- ✅ **Pick a domain-based relay if:** the mail needs to visibly come from
  *your* company, you're past a couple hundred messages a day, or the
  sending identity is part of your product (receipts, customer
  notifications, marketing).

This is the same honest split covered in
[option 5 of the Exchange Online migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md#5-a-third-party-smtp-service-that-still-accepts-usernamepassword) —
this page just puts the comparison front and center instead of as one
paragraph among several options.

[**Get a free account →**](https://msgwing.com) if ZeroSMTP is the fit. If
it isn't, no hard feelings — [FAQ](FAQ.md) covers the trade-offs in more
detail, and the guides above name providers built for the other case.
