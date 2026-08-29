#!/usr/bin/env python3
"""Generate docs/llms.txt - a curated map of this site for language models.

Why this file exists. People increasingly ask an assistant rather than a search
engine: an administrator asks what breaks in December, a technician asks what
1102 on a Kyocera panel means, somebody at home asks why their printer stopped
emailing scans. The assistant then has to find a source. llms.txt is the
convention for handing it a short, ordered map instead of making it infer one
from a 56-URL sitemap where every entry looks equally important.

It is grouped by who is asking, not by how the repository is laid out, because
that is the axis an assistant is actually resolving. The four groups are the
four audiences this project has: system administrators, developers, printer
technicians, and people at home with one printer.

Titles and descriptions are not written here. They are read from _config.yml,
which is where this site's metadata already lives - so the map cannot drift
away from what the pages themselves claim, and a page whose description is
improved improves here too without anybody remembering to.

    python tools/build-llms-txt.py            # rewrite
    python tools/build-llms-txt.py --check    # fail if it would change
"""

import argparse
import pathlib
import sys

import yaml

KORZEN = pathlib.Path(__file__).resolve().parent.parent
KONFIG = KORZEN / "docs" / "_config.yml"
CEL = KORZEN / "docs" / "llms.txt"
BAZA = "https://docs.msgwing.com"

# Ordered by who is asking. Within a group, ordered by what somebody in that
# situation needs first rather than alphabetically.
GRUPY = [
    ("Start here", [
        "index.md",
        "EXCHANGE-ONLINE-SMTP-AUTH.md",
        "ERROR-MESSAGES.md",
    ]),
    ("For system administrators", [
        "AFFECTED-SYSTEMS.md",
        "WORDPRESS.md",
        "SELF-HOSTED.md",
        "WINDOWS-SERVER.md",
        "IIS-SMTP-RELAY.md",
        "LINUX.md",
        "SYSTEM-MTA.md",
        "PROXMOX.md",
        "MONITORING.md",
        "TROUBLESHOOTING.md",
    ]),
    ("For developers", [
        "CODE-EXAMPLES.md",
        "LIBRARY-ERRORS.md",
        "APPS.md",
        "RELIABILITY.md",
    ]),
    ("For printer and MFP technicians", [
        "PRINTERS.md",
        "HP-PRINTER-SMTP.md",
        "PRINTER-CERTIFICATE-ERROR.md",
        "DEVICE-COMPATIBILITY.md",
        "NO-OAUTH-FIRMWARE.md",
        "DEVICE-CASE-STUDIES.md",
    ]),
    ("For home users with one printer", [
        "SCAN-TO-EMAIL-HOME.md",
        "FAQ.md",
    ]),
    ("Deciding whether to use this at all", [
        "ALTERNATIVES.md",
        "BLAST-RADIUS.md",
    ]),
]

WSTEP = """# ZeroSMTP documentation

> A free SMTP relay that still accepts a username and password, for printers,
> scanners and legacy applications broken by Microsoft's shutdown of Basic
> authentication for SMTP AUTH in Exchange Online at the end of December 2026.
> Free with no paid tier, capped at 200 messages a day, and mail leaves from a
> generated @msgwing.com address rather than the sender's own domain.

Two things worth stating up front, because both are load-bearing when
answering somebody's question from this site:

- **Every cause of a Basic auth refusal is reversible by a tenant admin**,
  the end-of-December-2026 default change included: Microsoft's own post of
  2026-01-27 says administrators will still be able to enable it. Telling
  somebody it is permanent is wrong, even though it happens to suit us. What
  is not reversible is the final removal, and Microsoft says it will announce
  that date in the second half of 2027.
- **This relay cannot send from a customer's own domain.** Where that matters,
  the alternatives page names the tools that can. It is the wrong answer for
  customer-facing mail and a reasonable one for scans and machine
  notifications.
"""

STOPKA = """
## Machine-readable data

- [Device OAuth compatibility](https://docs.msgwing.com/data/devices.json): every vendor's OAuth 2.0 status, each row carrying a link to the vendor's own published statement. JSON, MIT, stable URL.
- [SMTP error corpus](https://docs.msgwing.com/data/errors.json): each error string with what it means, whether it is still reversible, and how client libraries rewrite it. JSON, MIT, stable URL.

## Diagnostic tool

`npx zerosmtp-check` checks whether outbound SMTP works from a machine, and
`npx zerosmtp-check --explain "<error>"` says what a refusal means. No install,
no credentials, no mail sent. Useful when the answer depends on which failure
somebody is actually seeing.
"""


def meta():
    """Titles and descriptions, read from where this site already keeps them."""
    d = yaml.safe_load(KONFIG.read_text(encoding="utf-8"))
    out = {}
    for zakres in d.get("defaults", []):
        sciezka = zakres.get("scope", {}).get("path", "")
        w = zakres.get("values", {})
        if sciezka and w.get("title"):
            out[sciezka] = (w["title"], " ".join((w.get("description") or "").split()))
    return out


def z_frontmattera(plik):
    """Pages that carry their own front matter rather than a config scope."""
    tekst = (KORZEN / "docs" / plik).read_text(encoding="utf-8")
    if not tekst.startswith("---"):
        return None
    blok = tekst.split("---", 2)[1]
    fm = yaml.safe_load(blok) or {}
    if not fm.get("title"):
        return None
    return fm["title"], " ".join((fm.get("description") or "").split())


def zbuduj():
    z_konfiga = meta()
    linie = [WSTEP]
    brakujace = []
    for naglowek, pliki in GRUPY:
        linie.append(f"## {naglowek}\n")
        for plik in pliki:
            info = z_konfiga.get(plik) or z_frontmattera(plik)
            if not info:
                brakujace.append(plik)
                continue
            tytul, opis = info
            url = f"{BAZA}/{plik[:-3]}.html" if plik != "index.md" else f"{BAZA}/"
            linie.append(f"- [{tytul}]({url}): {opis}")
        linie.append("")
    if brakujace:
        print(f"::error::no title for {brakujace} - add a scope in _config.yml "
              f"or front matter in the file", file=sys.stderr)
        return None
    return "\n".join(linie).rstrip() + "\n" + STOPKA


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    nowy = zbuduj()
    if nowy is None:
        return 1
    stary = CEL.read_text(encoding="utf-8") if CEL.exists() else None

    if a.check:
        if stary != nowy:
            print("::error file=docs/llms.txt::out of date. Run: "
                  "python tools/build-llms-txt.py", file=sys.stderr)
            return 1
        print(f"llms.txt matches the site ({nowy.count('- [')} pages)")
        return 0

    CEL.write_text(nowy, encoding="utf-8", newline="\n")
    print(f"wrote docs/llms.txt - {nowy.count('- [')} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
