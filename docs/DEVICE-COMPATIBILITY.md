# OAuth compatibility by device and product

Vendors publish their Basic auth advisories as prose, PDFs and support pages,
one vendor at a time. There is no single place to check whether the thing on
your network has a way out. This is an attempt at one.

The table is generated from
[`data/devices.json`](https://github.com/msgwing/ZeroSMTP/blob/main/data/devices.json),
so it can be read by a script as well as by a person, and it cannot disagree
with its own data — CI rejects the two drifting apart.

**Every row carries a link to the vendor's own statement.** A compatibility
list is only worth citing if each claim can be checked, so an entry with
nothing published behind it does not get added.

## How to read the status column

| Status | Meaning |
| --- | --- |
| **No OAuth firmware planned** | The vendor has said it is not coming. Firmware is not a step you have skipped; it does not exist. |
| No OAuth for this purpose | The feature has no OAuth option at all, regardless of firmware. |
| Some models or versions | OAuth exists for part of the range. The model or version number decides. |
| Check vendor advisory | The vendor publishes a per-model list, revised over time, that is not reproduced here. |
| OAuth available | Supported — usually a configuration change rather than a migration. |

The two top rows are the ones that matter for planning. Everything else means
"go and read the advisory for your exact model", which is honest but is not an
answer.

<!-- BEGIN GENERATED TABLE -->

| System | OAuth status | Named models | Evidence |
| --- | --- | --- | --- |
| **[Konica Minolta / DEVELOP](devices/konica-minolta-develop-ineo-and-ineo-mfps.md)** ineo and ineo+ MFPs | **No OAuth firmware planned** | `ineo 306`, `ineo 7228`, `ineo 266`, `ineo+ 266`, `ineo+ 256`, `ineo+ 226`, `ineo 4752`, `ineo 4052`, `ineo 4750`, `ineo 4050`, `ineo+ 3110`, `ineo+ 3100P`, `ineo+ 754e`, `ineo+ 654e`, `ineo 246`, `ineo 236`, `ineo 226`, `ineo 216`, `ineo 4700P`, `ineo 3301P`, `ineo 4000P`, `ineo 165 variants`, `ineo 185 variants` | [advisory](https://www.develop.eu/en/support/discontinuation-of-basic-authentication-for-smtp.html) |
| **[Canon](devices/canon-maxify-mb2755.md)** Maxify MB2755 | No OAuth for this purpose | `Maxify MB2755` | [advisory](https://github.com/msgwing/ZeroSMTP/blob/main/docs/DEVICE-CASE-STUDIES.md) |
| **[QNAP](devices/qnap-nas-notification-settings.md)** NAS notification settings | No OAuth for this purpose | — | [advisory](https://gist.github.com/msgwing/39958d909e085ae9cc0e6b3584d930bf) |
| **[Microsoft](devices/microsoft-dynamics-nav-business-central.md)** Dynamics NAV / Business Central | Some models or versions | — | [advisory](https://www.innovia.com/blog/microsoft-to-retire-basic-auth-smtp-for-exchange-online-what-bc-nav-users-need-to-know) |
| **[Veeam](devices/veeam-backup-for-microsoft-365-and-related-products.md)** Backup for Microsoft 365 and related products | Some models or versions | — | [advisory](https://helpcenter.veeam.com/docs/vbo365/guide/smtp_server.html) |
| **[Xerox](devices/xerox-connectkey-printers-and-mfps.md)** ConnectKey printers and MFPs | Some models or versions | `VersaLink B415`, `VersaLink C415`, `VersaLink B620`, `VersaLink C620`, `VersaLink B625`, `VersaLink C625`, `AltaLink`, `PrimeLink` | [advisory](https://www.xerox.com/en-us/office/insights/exchange-online-authentication) |
| **[Brother](devices/brother-printers-mfps-and-document-scanners.md)** printers, MFPs and document scanners | Check vendor advisory | — | [advisory](https://support.brother.com/g/b/oscontents.aspx?c=us&lang=en&ossid=42) |
| **[Cerberus](devices/cerberus-ftp-server.md)** FTP Server | Check vendor advisory | — | [advisory](https://support.cerberusftp.com/hc/en-us/articles/24103821642643-Troubleshooting-SMTP-Setup-Error-on-Office365-com-Resolving-EHLO-Message-Failure-535-5-7-139-Authentication-Unsuccessful-Basic-Authentication-Disabled) |
| **[Cisco](devices/cisco-unity-connection.md)** Unity Connection | Check vendor advisory | — | [advisory](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) |
| **[Faxination](devices/faxination-fax-server.md)** fax server | Check vendor advisory | — | [advisory](https://faxination.com/microsoft-timeline-for-basic-authentication-deprecation-in-exchange-online-smtp-auth/) |
| **[Kyocera](devices/kyocera-mfps-reporting-send-error-1102.md)** MFPs reporting send error 1102 | Check vendor advisory | — | [advisory](https://github.com/msgwing/ZeroSMTP/blob/main/docs/ERROR-MESSAGES.md) |
| **[Laserfiche](devices/laserfiche-workflow-email.md)** Workflow email | Check vendor advisory | — | [advisory](https://answers.laserfiche.com/questions/200557/Disabling-basic-authentication-causing-Workflow-emails-to-fail) |
| **[ManageEngine](devices/manageengine-opmanager.md)** OpManager | Check vendor advisory | — | [advisory](https://www.manageengine.com/network-monitoring/how-to/fix-smtpclientauth-disabled-error.html) |
| **[Ricoh](devices/ricoh-multifunction-printers.md)** multifunction printers | Check vendor advisory | — | [advisory](https://www.ricoh.com/info/2025/0526_1) |
| **[Microsoft](devices/microsoft-teams-rooms.md)** Teams Rooms | OAuth available | — | [advisory](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) |

### Notes per entry

**Konica Minolta / DEVELOP — ineo and ineo+ MFPs**  
Marked "N/A" in the vendor's own OAuth column. The advisory points these owners at a different mail service rather than at an update. Other ineo product groups in the same advisory do have OAuth firmware - check the exact model. A third category exists that is neither: several Product Group 10 models are listed as "Under planning" with no release date, so their owners have no answer yet in either direction.

**Canon — Maxify MB2755**  
Separate failure mode from OAuth: the firmware ships a fixed root CA store predating current Let's Encrypt roots, so certificate validation fails regardless of authentication. Hardware-confirmed, unchanged after a firmware update. Verification has to be disabled on the device.

**QNAP — NAS notification settings**  
The notification settings accept username and password only; there is no OAuth option for Microsoft 365 SMTP.

**Microsoft — Dynamics NAV / Business Central**  
Newer Business Central handles modern auth. Older on-prem NAV installs generally need the SMTP account repointed.

**Veeam — Backup for Microsoft 365 and related products**  
Corrected 2026-08-16 - the previous note claimed newer versions added OAuth for SMTP, which the linked page does not support. The v8 documentation offers "SMTP server (basic authentication)" and does not describe an OAuth option for SMTP notifications; modern app-only authentication appears elsewhere in the product, for Entra applications, not here. So the fix is not "upgrade and SMTP gets OAuth" - check whether your build offers a notification method that is not SMTP at all, and treat the SMTP path as basic-auth only.

**Xerox — ConnectKey printers and MFPs**  
Device Code Flow is supported broadly; Client Credentials Flow only on the ConnectKey models listed. Devices not on Xerox's supported-firmware list are the problem cases and are not promised an update. Affects Scan to Email, Internet Fax (Send), Fax Forward to Email and Auto Email Notifications.

**Brother — printers, MFPs and document scanners**  
Brother publishes a per-model Product Support List and states plainly that a machine not on it does not support OAuth 2.0, with no firmware promised - the vendor's own guidance for those owners is to use a different mail service. Listed models split into two tiers: OAuth already present, or present after a firmware update that is already downloadable. Affects Scan to Email Server, Internet Fax, Email Reports and Email Notifications. Check the exact model: support is firmware-dependent as well as model-dependent.

**Cerberus — FTP Server**  
Vendor support article covers the exact 535 5.7.139 failure.

**Cisco — Unity Connection**  
Named in Microsoft's own deprecation documentation. OAuth support depends on the release; check yours before assuming either way.

**Faxination — fax server**  
Vendor published a timeline notice. Apply their update if one exists for the version in use; otherwise the outbound SMTP account has to be repointed.

**Kyocera — MFPs reporting send error 1102**  
1102 / 0x1102 is Kyocera's device-side code for an SMTP authentication failure, not a model list. No public per-model OAuth statement located; check with the vendor for a specific model.

**Laserfiche — Workflow email**  
Workflow emails failing on Basic auth removal, reported in the vendor's own community.

**ManageEngine — OpManager**  
OpManager supports OAuth 2.0 from build 126306, so for anyone on that build or later this is a settings change rather than a migration - the vendor's guide states it directly. The same page also documents re-enabling SMTP AUTH in the Exchange admin centre, which works until the end of December 2026 and not after; treat it as breathing room, not a fix.

**Ricoh — multifunction printers**  
Ricoh publishes affected products with per-product firmware status, revised on 2026-01-30 into two tables - products with released OAuth firmware, and products newly added - plus a third group the Ricoh Firmware Update Tool cannot update, where the local representative has to do it. Not reproduced here because the list is long and still moving; check the model against the advisory. Ricoh does not say any product is permanently excluded, but for devices still waiting its own recommendation is to stop relying on email from the device or to use a mail service other than Exchange Online.

**Microsoft — Teams Rooms**  
Microsoft's own product. Enable modern auth on the resource account - no relay needed.

*15 entries, last reviewed 2026-08-16.*

<!-- END GENERATED TABLE -->

## What this list is not

It is not exhaustive, and it is not a substitute for the vendor's advisory. It
records what vendors have published, which is a different thing from what is
true of every unit in the field: firmware branches, regional model names and
OEM rebadges all diverge from the headline list.

It also says nothing about whether a device is *worth* keeping. A 2016 MFP with
no OAuth path and no security updates is a decision about hardware, not about
mail configuration.

## Once firmware is ruled out

Three options remain, and they differ from each other more than they look:

- **Direct Send** — free, works only for recipients inside your own tenant,
  needs a connector and a static IP
- **A relay that still accepts a username and password** — works for any
  recipient; check whether the sender domain has to be your own
- **Replace the hardware** — the only option that also survives the next
  deprecation

[The migration guide](EXCHANGE-ONLINE-SMTP-AUTH.md) covers all three,
including the ones that are not this project. [Devices that will never get
OAuth firmware](NO-OAUTH-FIRMWARE.md) goes into the ruled-out cases in prose.

## Adding an entry

The list grows by report. If you have a model whose status is documented
somewhere and is not here, or a vendor has since shipped firmware for
something listed as ruled out, edit
[`data/devices.json`](https://github.com/msgwing/ZeroSMTP/blob/main/data/devices.json)
and run:

```bash
python tools/build-device-table.py
```

That regenerates the table above. Entries need a vendor, a product, a status
from the list, and an evidence URL — without the last one the build refuses
the entry. Hardware-confirmed reports get credited by username.
