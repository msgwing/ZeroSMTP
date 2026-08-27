---
title: "WordPress email when Basic auth ends"
description: "WordPress and WooCommerce send order confirmations, password resets and contact-form mail through SMTP. What breaks when Microsoft 365 stops accepting a username and password in December 2026, which plugins have an OAuth route, and when a relay is the wrong answer."
---

# WordPress email and the Microsoft 365 Basic auth shutdown

A WordPress site that cannot send email does not look broken. It looks fine.

The order page still says thank you. The password-reset form still says *check
your inbox*. The contact form still shows its success message. Every one of
those screens is rendered before the mail is handed to the SMTP server, and
none of them changes when the handoff is refused.

So the failure arrives as an absence, and it arrives at somebody who cannot
report it to you: the customer who never got the confirmation and assumes the
order failed, the user who never got the reset link and gave up, the enquiry
that was never answered because it was never seen.

## What actually stops

If your site authenticates to Microsoft 365 with a username and password —
which is what every plugin's **Other SMTP** option does — then at the end of
December 2026 Exchange Online stops accepting it. Not throttles: refuses.

That covers, in rough order of how much it hurts:

- **WooCommerce order confirmations, invoices and shipping notices.** The
  customer's only receipt.
- **Password resets.** Locks people out permanently, including administrators.
- **New-account and email-change confirmations.**
- **Contact-form and enquiry mail.** Lost leads, no error anywhere.
- **Core update and security notifications** — including the ones that tell you
  something is wrong.

## How to tell whether you are affected, today

You are affected if your SMTP plugin is set to **Other SMTP** with an
`smtp.office365.com` host and a mailbox password in the password field.

You are not affected if the plugin is using a Microsoft 365 / Outlook mailer
that sent you through a Microsoft consent screen, or a provider that is not
Microsoft at all.

## The message you will actually see

Not the server's. Your plugin's.

WordPress surfaces PHPMailer's summary through the plugin, one layer further
from the server, and prints `SMTP connect() failed.` — six words naming no
code, no tenant and no cause. The wording suggests a network problem. It is
not.

[What WordPress prints, and what the server said](clients/wordpress-wp-mail-smtp-connect-failed.md)
covers how to make the plugin show you the real line, which is the only thing
that tells you whether this is a setting somebody can switch back on or the
change that cannot be undone.

## Your three routes, honestly

### 1. OAuth through the plugin — best, if you can do it

Both major plugins offer a Microsoft 365 mailer that uses OAuth instead of a
password:

- **FluentSMTP** lists Microsoft Office (Outlook) among its providers and is
  free on WordPress.org.
- **WP Mail SMTP**'s Microsoft 365 / Outlook.com mailer is a paid feature —
  their documentation states it *"is only available with the Pro license or
  higher."*

Either way the real gate is not the plugin. It is that OAuth needs an
**application registered in Microsoft Entra**, which needs somebody with admin
rights in the tenant. If you have those rights, take this route and stop
reading — it keeps your own domain in the From address, and nothing on this
site improves on that.

### 2. A relay — when route 1 is closed to you

Route 1 is closed more often than its documentation assumes. An agency
maintaining a client's site is not an administrator of the client's tenant. A
freelancer handed FTP credentials is not either. Neither is anyone on shared
hosting whose customer's IT is a phone number that answers in three weeks.

That is who a relay is for: the site owner who can change a plugin setting and
cannot change anything in Entra.

### 3. Move the site's mail off Microsoft 365 entirely

For a transactional store this is frequently the correct answer, and it is not
ours. A dedicated transactional provider gives you your own sending domain,
DKIM alignment, bounce handling and volume. [The alternatives
page](ALTERNATIVES.md) names them without pretending we compete.

## Before you configure ZeroSMTP, two limits that may disqualify it

Stated here rather than discovered after your store's busiest day:

- **Mail leaves from a generated `@msgwing.com` address, not your own domain.**
  For password resets and contact forms this is usually acceptable. For
  **WooCommerce order confirmations it often is not** — customers expect the
  shop's address, and a receipt from an unfamiliar domain gets ignored or
  reported.
- **200 messages a day**, with no paid tier that lifts it. A small business
  site will never touch that. A store with a hundred orders a day, each
  generating several messages, will.

If either rules you out, route 3 above is where to go, and going there is not
a defeat.

## Setup, if it still fits

Works with WP Mail SMTP, FluentSMTP, Post SMTP or any plugin offering a plain
SMTP option.

1. Register at [msgwing.com](https://msgwing.com) and copy the generated login
   and password — they are shown once.
2. In the plugin's mailer settings choose **Other SMTP**.
3. Enter the values below.
4. Set the **From** address to your generated `@msgwing.com` login. Leaving
   your own domain there while sending through a different one is the fastest
   way into a spam folder.
5. Send the plugin's built-in test email.

| Setting | Value |
| --- | --- |
| SMTP host | `mx.msgwing.com` |
| Port | `587` (STARTTLS) or `465` (SSL/TLS) |
| Encryption | STARTTLS on 587, or SSL/TLS on 465 — required |
| Authentication | Enabled |
| Username | your `@msgwing.com` login |
| Password | your `@msgwing.com` password |
| From address | your `@msgwing.com` login |

Then place a test order, or trigger a real password reset. The plugin's test
email proves the connection; it does not prove that WooCommerce's own mail
uses it.

## Related

- [What WordPress prints, and what the server said](clients/wordpress-wp-mail-smtp-connect-failed.md)
- [All library error messages](LIBRARY-ERRORS.md)
- [Configuring other applications](APPS.md)
- [What breaks at the end of December 2026](AFFECTED-SYSTEMS.md)
- [Tools that are a better fit than this one](ALTERNATIVES.md)
