#!/usr/bin/env python3
"""Render everything that is derived from data/devices.json.

Two outputs, one source:

  docs/DEVICE-COMPATIBILITY.md   the summary table and per-entry notes
  docs/devices/<slug>.md         one page per entry

The per-entry pages exist because of how this audience searches. Nobody types
"OAuth compatibility list"; they paste the thing in front of them - "Ricoh
535 5.7.139", "Konica Minolta ineo scan to email stopped working". A single
page competing for several hundred of those loses every one of them to a page
that is about exactly that vendor. The pages are generated rather than written
so the set cannot fall behind the data, and so adding a row to the JSON is the
whole of the work.

Generated, not hand-written, because a compatibility list that disagrees with
its own data is worse than no list: somebody acts on the wrong row. `--check`
makes CI fail if any output has drifted.

    python tools/build-device-table.py            # rewrite everything
    python tools/build-device-table.py --check    # fail if anything would change
"""

import argparse
import json
import pathlib
import re
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
DANE = KORZEN / "data" / "devices.json"
STRONA = KORZEN / "docs" / "DEVICE-COMPATIBILITY.md"
KATALOG_STRON = KORZEN / "docs" / "devices"

POCZATEK = "<!-- BEGIN GENERATED TABLE -->"
KONIEC = "<!-- END GENERATED TABLE -->"

# jekyll-seo-tag appends " | ZeroSMTP" to every title, and docs/_config.yml
# documents a budget of roughly 50 characters for the part before it. The
# build fails rather than silently shipping a title Google will truncate.
LIMIT_TYTULU = 48

# Kolejnosc ma znaczenie: czytelnik szuka najpierw tego, czego nie da sie
# naprawic aktualizacja, bo to jedyny przypadek zamykajacy droge firmware'u.
PORZADEK = {
    "none-planned": 0,
    "unsupported": 1,
    "partial": 2,
    "check-advisory": 3,
    "available": 4,
}

ETYKIETY = {
    "none-planned": "**No OAuth firmware planned**",
    "unsupported": "No OAuth for this purpose",
    "partial": "Some models or versions",
    "check-advisory": "Check vendor advisory",
    "available": "OAuth available",
}

# One paragraph per status, written for somebody who arrived from a search
# engine with a broken device and no context.
WYJASNIENIA = {
    "none-planned": (
        "The vendor has stated that no OAuth firmware is coming for these "
        "models. This is worth being blunt about: it is not a step you have "
        "missed, and there is no update to wait for. Once Basic authentication "
        "is switched off, the device cannot authenticate to Microsoft 365 at "
        "all — the mail path has to change, not the firmware."
    ),
    "unsupported": (
        "There is no OAuth option for this purpose at all, on any firmware "
        "version. The settings screen accepts a username and a password and "
        "nothing else, so the only thing that can change is what those "
        "credentials point at."
    ),
    "partial": (
        "OAuth exists for part of the range. The model or version number "
        "decides, which means the answer for your unit is not the answer for "
        "the product line — check yours against the vendor's statement before "
        "planning either way."
    ),
    "check-advisory": (
        "The vendor publishes a per-model list and revises it over time, so it "
        "is not copied here; a stale second copy of a moving list is exactly "
        "how somebody ends up acting on the wrong row. Check your exact model "
        "against the vendor's own page."
    ),
    "available": (
        "Supported. For most installations this is a configuration change "
        "rather than a migration, and no relay is needed."
    ),
}

ZNACZNIK_START = "<!-- BEGIN GENERATED PAGE -->"


def komorka(tekst):
    """Markdown tables break on unescaped pipes and literal newlines."""
    return tekst.replace("|", "\\|").replace("\n", " ").strip()


def slug(wpis):
    """Vendor alone collides - Microsoft has two entries - so the product is
    part of the identity of a page, not decoration."""
    surowy = f"{wpis['vendor']} {wpis['product']}".lower()
    surowy = re.sub(r"[^a-z0-9]+", "-", surowy)
    return surowy.strip("-")


def tytul(wpis):
    """`Vendor: product` where it fits the SEO budget, trimmed on a word
    boundary where it does not. Truncating mid-word reads like a bug."""
    pelny = f"{wpis['vendor']}: {wpis['product']}"
    if len(pelny) <= LIMIT_TYTULU:
        return pelny

    slowa = wpis["product"].split()
    while slowa:
        slowa.pop()
        skrocony = f"{wpis['vendor']}: {' '.join(slowa)}"
        if slowa and len(skrocony) <= LIMIT_TYTULU:
            return skrocony

    return f"{wpis['vendor']}: OAuth status"[:LIMIT_TYTULU]


def opis(wpis):
    """The meta description is what shows under the title in results, so it
    answers the question rather than describing the page."""
    return (
        f"{wpis['vendor']} {wpis['product']} and the Microsoft 365 SMTP AUTH "
        f"shutdown: {ETYKIETY[wpis['status']].strip('*').lower()}, with a link "
        f"to the vendor's own statement and what to do if firmware is not an "
        f"option."
    )


def zbuduj_tabele(wpisy):
    linie = [
        "| System | OAuth status | Named models | Evidence |",
        "| --- | --- | --- | --- |",
    ]

    for w in sorted(
        wpisy,
        key=lambda w: (PORZADEK.get(w["status"], 9), w["vendor"], w["product"]),
    ):
        nazwa = f"**[{komorka(w['vendor'])}](devices/{slug(w)}.md)** {komorka(w['product'])}"
        stan = ETYKIETY.get(w["status"], komorka(w["status"]))
        modele = ", ".join(f"`{komorka(m)}`" for m in w.get("models") or []) or "—"
        dowod = f"[advisory]({w['evidence']})"
        linie.append(f"| {nazwa} | {stan} | {modele} | {dowod} |")

    return "\n".join(linie)


def zbuduj_notatki(wpisy):
    linie = []
    for w in sorted(
        wpisy,
        key=lambda w: (PORZADEK.get(w["status"], 9), w["vendor"], w["product"]),
    ):
        linie.append(f"**{w['vendor']} — {w['product']}**  ")
        linie.append(f"{w['notes']}")
        linie.append("")
    return "\n".join(linie).rstrip()


def zbuduj_strone(wpis, aktualizacja):
    modele = wpis.get("models") or []

    czesci = [
        "---",
        f"title: {json.dumps(tytul(wpis))}",
        f"description: {json.dumps(opis(wpis))}",
        "---",
        "",
        ZNACZNIK_START,
        "<!-- Generated by tools/build-device-table.py from data/devices.json.",
        "     Edit the JSON, not this file - CI rejects the two disagreeing. -->",
        "",
        f"# {wpis['vendor']} {wpis['product']}: OAuth 2.0 and Microsoft 365 SMTP AUTH",
        "",
        f"**Status: {ETYKIETY[wpis['status']].replace('**', '')}**",
        "",
        WYJASNIENIA[wpis["status"]],
        "",
        "## What the vendor says",
        "",
        wpis["notes"],
        "",
        f"[Read the vendor's statement in full]({wpis['evidence']})  ",
        "Everything on this page comes from that document. If it and this page "
        "disagree, the vendor is right and this page is out of date — "
        "[say so](https://github.com/msgwing/ZeroSMTP/issues/new?template=device_report.yml).",
        "",
    ]

    if modele:
        czesci += [
            "## Models named in the advisory",
            "",
            *[f"- `{m}`" for m in modele],
            "",
            "A model missing from this list is not automatically safe. Vendors "
            "publish headline lists; regional variants and OEM rebadges drift "
            "away from them.",
            "",
        ]

    if wpis["status"] == "available":
        czesci += [
            "## What to do",
            "",
            "Follow the vendor's instructions above. Come back here only if the "
            "device turns out to be on an older firmware branch than the one "
            "the document assumes.",
            "",
        ]
    else:
        czesci += [
            "## What to do instead",
            "",
            "Once firmware is ruled out, three options remain, and they differ "
            "more than they look:",
            "",
            "- **Direct Send** — free, but only delivers to recipients inside "
            "your own tenant, and needs a connector plus a static IP.",
            "- **A relay that still accepts a username and password** — works "
            "for any recipient, and is three fields on the device rather than "
            "a project.",
            "- **Replace the device** — sometimes the honest answer. A 2016 MFP "
            "with no OAuth path and no security updates is a hardware decision, "
            "not a mail one.",
            "",
            "The [migration guide](../EXCHANGE-ONLINE-SMTP-AUTH.md) walks "
            "through all of them, including Graph API and paid relays, and the "
            "[quiz on that page](../EXCHANGE-ONLINE-SMTP-AUTH.md#zc-quiz) gives "
            "a recommendation you can link to.",
            "",
            "[ZeroSMTP](https://github.com/msgwing/ZeroSMTP#quickstart) is the "
            "second option. It is free with no paid tier, accepts plain SMTP "
            "AUTH, and is capped at 200 messages a day — and it sends from a "
            "shared `@msgwing.com` address, not your own domain. If the "
            "from-address has to be yours, it is the wrong answer and the "
            "migration guide covers the others.",
            "",
        ]

    czesci += [
        "## Related",
        "",
        f"- [What the error message means](../ERROR-MESSAGES.md) — if the "
        f"{wpis['vendor']} device is reporting a code rather than a sentence",
        "- [The full compatibility list](../DEVICE-COMPATIBILITY.md) — every "
        "vendor, in one table",
        "- [Setup by printer brand](../PRINTERS.md) — where the SMTP fields "
        "actually live in each vendor's interface",
        "",
        f"*Last reviewed {aktualizacja}. Source: "
        f"[`data/devices.json`](https://github.com/msgwing/ZeroSMTP/blob/main/data/devices.json).*",
        "",
    ]

    return "\n".join(czesci)


def zbuduj_wyjscia(dane):
    """Every path this script owns, mapped to the exact bytes it should hold."""
    wpisy = dane["entries"]
    wyjscia = {}

    tresc = STRONA.read_text(encoding="utf-8")
    if POCZATEK not in tresc or KONIEC not in tresc:
        raise ValueError(f"Markers missing from {STRONA.name}")

    przed = tresc.split(POCZATEK)[0]
    po = tresc.split(KONIEC)[1]

    wyjscia[STRONA] = (
        przed
        + POCZATEK
        + "\n\n"
        + zbuduj_tabele(wpisy)
        + "\n\n### Notes per entry\n\n"
        + zbuduj_notatki(wpisy)
        + "\n\n"
        + f"*{len(wpisy)} entries, last reviewed {dane['updated']}.*\n\n"
        + KONIEC
        + po
    )

    for w in wpisy:
        wyjscia[KATALOG_STRON / f"{slug(w)}.md"] = zbuduj_strone(w, dane["updated"])

    return wyjscia


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if anything is out of date instead of rewriting it")
    args = ap.parse_args()

    dane = json.loads(DANE.read_text(encoding="utf-8"))
    wpisy = dane["entries"]

    brak_dowodu = [w for w in wpisy if not w.get("evidence")]
    if brak_dowodu:
        print("Entries without an evidence URL, which the list does not allow:")
        for w in brak_dowodu:
            print(f"  {w['vendor']} - {w['product']}")
        return 1

    nieznany = {w["status"] for w in wpisy} - set(PORZADEK)
    if nieznany:
        print(f"Unknown status values: {sorted(nieznany)}")
        return 1

    # A slug collision would silently overwrite one page with another, which
    # is the kind of failure nobody notices until the wrong advice is live.
    slugi = {}
    for w in wpisy:
        slugi.setdefault(slug(w), []).append(f"{w['vendor']} - {w['product']}")
    kolizje = {s: v for s, v in slugi.items() if len(v) > 1}
    if kolizje:
        print("Entries sharing a page slug:")
        for s, v in kolizje.items():
            print(f"  {s}: {', '.join(v)}")
        return 1

    za_dlugie = [w for w in wpisy if len(tytul(w)) > LIMIT_TYTULU]
    if za_dlugie:
        print(f"Page titles over the {LIMIT_TYTULU}-character SEO budget:")
        for w in za_dlugie:
            print(f"  {len(tytul(w))}: {tytul(w)}")
        return 1

    try:
        wyjscia = zbuduj_wyjscia(dane)
    except ValueError as blad:
        print(blad)
        return 1

    # Pages for entries that were removed from the JSON have to go, or the
    # site keeps serving advice about a row that no longer exists.
    istniejace = set(KATALOG_STRON.glob("*.md")) if KATALOG_STRON.exists() else set()
    osierocone = sorted(istniejace - set(wyjscia))

    def sciezka(p):
        return p.relative_to(KORZEN).as_posix()

    if args.check:
        rozne = [
            p for p, t in wyjscia.items()
            if not p.exists() or p.read_text(encoding="utf-8") != t
        ]
        if rozne or osierocone:
            for p in rozne:
                print(f"out of date: {sciezka(p)}")
            for p in osierocone:
                print(f"orphaned:    {sciezka(p)}")
            print("Run:  python tools/build-device-table.py")
            return 1
        print(f"{len(wyjscia)} generated files match data/devices.json "
              f"({len(wpisy)} entries)")
        return 0

    KATALOG_STRON.mkdir(parents=True, exist_ok=True)
    zapisane = 0
    for p, t in wyjscia.items():
        if not p.exists() or p.read_text(encoding="utf-8") != t:
            p.write_bytes(t.encode())
            zapisane += 1
    for p in osierocone:
        p.unlink()
        print(f"removed orphaned page: {sciezka(p)}")

    if zapisane or osierocone:
        print(f"{zapisane} file(s) rewritten, {len(osierocone)} removed "
              f"({len(wpisy)} entries)")
    else:
        print(f"already up to date ({len(wpisy)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
