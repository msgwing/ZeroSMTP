---
title: "What happens to mail sent through this relay"
description: "Where ZeroSMTP processes data, what is kept and for how long, what encryption is actually in place — measured rather than claimed — and the things this relay is not suitable for."
---

# What happens to mail sent through this relay

This page exists because the honest answer to *"is this safe to put company
mail through?"* was, until now, nowhere on this site. A reviewer — human or
otherwise — found nothing to read and concluded the sensible thing: unknown.

That was a fair conclusion. Here is the answer.

## The short version

| Question | Answer |
| --- | --- |
| Where is mail processed? | On our own hardware, inside the European Union. |
| Is a cloud provider in the mail path? | No. The relay is not hosted on rented infrastructure, so there is no subprocessor to disclose. |
| Is message content stored? | No. It sits in the delivery queue until it is delivered, then it is gone. |
| Is anything read, scanned or profiled? | No. Not for marketing, not for advertising, not for training anything. |
| Encryption in transit? | TLS 1.3 and TLS 1.2. TLS 1.0 and 1.1 are refused by the server. |
| Encryption at rest? | The disk holding the queue is encrypted. |
| Does the documentation site track you? | No analytics, no trackers, no third-party fonts. |

Every line about encryption below was **measured**, not asserted, and the
commands are given so you can measure it yourself.

## What actually passes through

An SMTP relay cannot do its job without handling three things:

- **The envelope** — who sent it, who it goes to, when, and whether delivery
  succeeded. This is what a queue log is, on every mail server that has ever
  existed.
- **The message itself** — headers, body, attachments — for as long as it
  takes to hand it to the receiving server.
- **Your credentials** — the generated login and password you were issued.

Nothing else is required, so nothing else is collected. There is no account
profile to fill in, no billing details, and no reason for either.

## How long anything is kept

**Message content is not retained.** It is queued, delivered, and dropped. If
the receiving server is unreachable, the message stays in the queue and is
retried — the normal behaviour of every SMTP server — until it is delivered or
the queue gives up and returns it to you as a bounce. There is no archive, no
copy kept "for support", and no mailbox: this relay only sends, and cannot
receive.

**Queue logs** — the envelope facts above — are what remains, and they are
what makes it possible to answer "did my scan actually go out?".

## Where it happens

**Our own hardware, in the European Union.**

That sentence is short because there is nothing behind it that needs
explaining away. The relay does not run on rented cloud capacity, so there is
no hosting provider acting as a subprocessor, no shared tenancy, and no
transfer to a third country to find a legal basis for.

## Encryption, measured

### In transit

Measured against `mx.msgwing.com:587` on 2026-08-29:

| Protocol | Result |
| --- | --- |
| **TLS 1.3** | Accepted — `TLS_AES_256_GCM_SHA384` |
| **TLS 1.2** | Accepted — `ECDHE-ECDSA-CHACHA20-POLY1305` |
| TLS 1.1 | **Refused** by the server |
| TLS 1.0 | **Refused** by the server |

TLS 1.2 is deliberately still accepted, and that is a decision worth stating
rather than hiding: a 2014 multifunction printer cannot negotiate TLS 1.3, and
refusing it would lock out the exact devices this relay exists for. What is
not accepted is anything older, and that is enforced by the server rather than
requested politely.

Check it yourself, from your own network, without an account:

```bash
openssl s_client -starttls smtp -connect mx.msgwing.com:587 -tls1_3
```

```bash
npx zerosmtp-check
```

### At rest

The disk holding the queue is encrypted. Given that content is not retained
after delivery, this covers the window in which a message exists at all.

### DKIM is not encryption, and calling it that would be a lie

Mail leaving the relay is DKIM-signed. A DKIM signature proves a message was
not altered in transit and genuinely came from where it says — **authenticity
and integrity**. It does not make the message unreadable to anybody, and any
page telling you DKIM "encrypts" your mail is describing something that does
not exist.

Confidentiality between the relay and the receiving server comes from TLS, and
only from TLS. If the receiving server does not support TLS, mail to it is not
protected in transit — which is true of every mail sender on the internet,
including Microsoft 365, and is worth knowing rather than glossing over.

## What we do not do with it

- **No marketing use.** Addresses that pass through are not added to any list,
  ours or anyone else's.
- **No commercial use.** Nothing here is sold, shared, brokered or handed to a
  data partner.
- **No profiling, no advertising, no model training.**
- **No third-party analytics on this site.** The documentation pages load no
  tracker, no tag manager and no external font. The only outbound request any
  page makes is to GitHub's public API, to show whether the relay is answering
  right now.

## You can read the code

The client side of this project is open source under the MIT licence: the
[code examples in twenty-one languages](CODE-EXAMPLES.md), the
[`zerosmtp-check` CLI](https://www.npmjs.com/package/zerosmtp-check) that tests
the connection, the audit script, and every generator that builds these pages.

That does not let you audit the relay's own machine, and this page will not
pretend otherwise. What it does mean is that everything sent *from* your side
is inspectable line by line before you run it, which is more than most
services in this category offer.

## Where this relay is the wrong choice

Stated here as plainly as on the pages that recommend it:

- **Mail leaves from a generated `@msgwing.com` address**, not your own domain.
  For anything customer-facing, that alone rules it out.
- **200 messages a day**, with no paid tier that lifts it.
- **If your data is subject to a regime requiring a signed processing
  agreement with a named processor** — health records under HIPAA, or anything
  where your own compliance team must hold a contract — this is a free service
  and that contract does not exist. Use a provider that will sign one. The
  [alternatives page](ALTERNATIVES.md) names several.

The last one is the honest boundary. A free relay is a good answer for a
printer in an office and a bad answer for regulated personal data, and no
amount of TLS changes which of those you have.

## Reporting something, or asking

Security issues go through
[SECURITY.md](https://github.com/msgwing/ZeroSMTP/blob/main/SECURITY.md).
Anything else about how data is handled:
[open an issue](https://github.com/msgwing/ZeroSMTP/issues/new/choose) — the
answer will be public, which is the point.

## Related

- [Security policy](https://github.com/msgwing/ZeroSMTP/blob/main/SECURITY.md)
- [Tools that are a better fit than this one](ALTERNATIVES.md)
- [What breaks at the end of December 2026](AFFECTED-SYSTEMS.md)

*Last reviewed 2026-08-29.*
