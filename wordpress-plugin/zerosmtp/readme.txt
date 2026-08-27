=== ZeroSMTP ===
Tags: smtp, office 365, microsoft 365, wp mail smtp, email
Requires at least: 5.9
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Keeps WordPress sending when Microsoft 365 stops accepting a username and password for SMTP at the end of December 2026.

== Description ==

A WordPress site that cannot send email does not look broken. The order page still says thank you, the password-reset form still says check your inbox, the contact form still shows its success message. All three are rendered before the mail reaches the SMTP server, and none of them changes when the handoff is refused.

At the end of December 2026, Exchange Online stops accepting a username and password for SMTP AUTH. Every plugin's **Other SMTP** option pointed at `smtp.office365.com` stops working on that day. Not throttled — refused.

This plugin points WordPress at the ZeroSMTP relay instead. It is a host, a port and a login: no OAuth flow, no Microsoft Entra app registration, nothing to install on a server.

= Read this before installing =

Two limits, stated here rather than discovered later:

* **Mail leaves from a generated `@msgwing.com` address, not your own domain.** For password resets and contact forms that is usually acceptable. For **WooCommerce order confirmations it often is not** — customers expect the shop's address, and a receipt from an unfamiliar domain gets ignored or reported as spam.
* **200 messages a day**, with no paid tier that lifts it. A small business site will never reach that. A store with a hundred orders a day will.

If either rules you out, a dedicated transactional provider is the better answer and this plugin is not for you.

= When you do not need this =

If you have administrator rights in your Microsoft 365 tenant, you can register an application in Microsoft Entra and use a plugin's OAuth mailer instead. That keeps your own domain in the From address and is a better outcome than anything here.

This plugin is for the case where that route is closed: an agency that does not administer the client's tenant, a freelancer holding FTP credentials and nothing else, a site on shared hosting whose IT contact answers in three weeks.

= What it does =

Hooks `phpmailer_init` and points PHPMailer at the relay on port 587 with STARTTLS. It does nothing at all until you enter a login and tick the box, so installing it does not change how your site sends mail until you decide it should.

== Installation ==

1. Register at https://msgwing.com and copy the generated login and password. They are shown once.
2. Install and activate this plugin.
3. Go to **Settings → ZeroSMTP**, enter the login and password, and tick **Enabled**.
4. Send a test email — a password reset to yourself is the honest test, because it exercises the same path your users will.

== Frequently Asked Questions ==

= Does this work alongside WP Mail SMTP, FluentSMTP or Post SMTP? =

No, and you should not try. Those plugins configure the same PHPMailer instance this one does, and whichever runs last wins. Use one or the other. If you already have one of those plugins and it is working, keep it and set it to **Other SMTP** with the values from Settings → ZeroSMTP.

= Why does my mail come from an address that is not my domain? =

Because the relay is free and shared. Sending as your own domain would require you to prove you own it, which means DNS records, which is exactly the work this is meant to avoid. If you need your own domain in the From address, this is the wrong tool and the description above says which are the right ones.

= Is my password stored securely? =

It is stored in the WordPress options table, in plain text, the same way every SMTP plugin stores it. Anybody who can read your database can read it. That is a property of how WordPress sends mail, not a choice made here, but it is worth knowing before you type it in.

= What happens if I go over 200 messages in a day? =

Further messages are refused until the count resets. WordPress will log a mail failure; your visitors will see nothing.

== Changelog ==

= 1.0.0 =
* First release.
