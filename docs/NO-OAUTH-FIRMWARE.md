# Devices that will never get OAuth firmware

Most guidance about the Microsoft 365 SMTP AUTH shutdown assumes a firmware
update exists. For a large set of printers and MFPs, the vendor has already
said it does not, and will not.

If your device is on one of the lists below, updating firmware is not a
step you have skipped — it is a step that does not exist. That changes which
options are actually open to you, so it is worth establishing first.

## Konica Minolta / DEVELOP ineo

Konica Minolta's
[advisory on the discontinuation of Basic authentication for SMTP](https://www.develop.eu/en/support/discontinuation-of-basic-authentication-for-smtp.html)
lists affected models across ten product groups. Most groups have a firmware
version that adds OAuth 2.0.

One set does not. In the vendor's own table those models are marked **"N/A"**
in the OAuth column, and the advisory points their owners at a different mail
service rather than at an update:

- ineo 306, ineo 7228, ineo 266
- ineo+ 266, ineo+ 256, ineo+ 226
- ineo 4750, ineo 4050
- ineo 4700P, ineo 3301P, ineo 4000P
- ineo 165 and ineo 185 variants

Check your exact model against the advisory before concluding anything — the
lists are long, similar model numbers land in different groups, and a digit
decides whether an update exists for you.

**What "N/A" means in practice.** The device will keep speaking SMTP with a
username and password for as long as it runs. What stops working is the
*server* accepting that. So the fix is on the server side, not the device
side, which is why a firmware update cannot deliver it.

## Xerox

Xerox's
[advisory on Exchange Online authentication](https://www.xerox.com/en-us/office/insights/exchange-online-authentication)
names Scan to Email, Internet Fax (Send), Fax Forward to Email and Auto Email
Notifications as affected.

OAuth firmware exists for the supported list — Device Code Flow broadly, and
Client Credentials Flow only on ConnectKey models such as VersaLink
B415/C415, B620/C620, B625/C625, AltaLink and PrimeLink. **Devices that are
not on that list are the problem cases**, and Xerox does not promise them an
update.

## Ricoh

Ricoh's [advisory](https://www.ricoh.com/info/2025/0526_1) lists affected
products with their firmware status. Some models have an update; check yours
against the list rather than assuming either way.

## What is actually left

Once firmware is off the table, three options remain, and they are genuinely
different from one another rather than three flavours of the same thing.

| Option | Works when | Cost |
| --- | --- | --- |
| **Direct Send** | Recipients are all inside your own tenant | Free, but internal-only and needs a connector plus a static IP |
| **A relay that still accepts a username and password** | Recipients are anywhere | Varies; the from-address may not be your own domain |
| **Replace the hardware** | Budget exists and the device is old anyway | Highest, and the only one that also solves the next deprecation |

Direct Send is the option most often overlooked, and for a scanner that only
ever mails documents to colleagues it is frequently the right answer — see
[the migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md) for how it is set up and
where it falls down.

ZeroSMTP is the second row. It is free, accepts plain SMTP AUTH, and sends
from a shared `@msgwing.com` address rather than your own domain — which for
scan-to-email is usually irrelevant and for customer-facing mail is
disqualifying. [Settings by brand](PRINTERS.md) covers where to type them in.

## Before you change anything

Confirm the device is genuinely affected rather than misconfigured. Two
minutes of checking saves an afternoon:

1. Run
   [`Find-SmtpAuthExposure.ps1`](https://github.com/msgwing/ZeroSMTP/blob/main/Find-SmtpAuthExposure.ps1)
   against your tenant. It is read-only and reports which mailboxes can still
   use SMTP AUTH today, including the ones that inherit the tenant setting and
   are easy to miss.
2. Check the exact error the device reports against
   [the error list](ERROR-MESSAGES.md). Several
   unrelated faults produce a similar-looking authentication failure.
3. If your model is not on any list here, see
   [what breaks](AFFECTED-SYSTEMS.md) for the full inventory of affected
   system categories, not just printers.

## Something missing?

These lists come from vendor advisories, and vendors keep publishing. If your
model is confirmed dead-end and is not named above — or if a vendor has since
shipped firmware for one that is —
[open an issue](https://github.com/msgwing/ZeroSMTP/issues/new/choose), or
edit [`data/devices.json`](https://github.com/msgwing/ZeroSMTP/blob/main/data/devices.json)
directly — it backs the [machine-readable compatibility
list](DEVICE-COMPATIBILITY.md). A
report from someone holding the hardware is worth more than anything read off
a datasheet, and gets credited by username.
