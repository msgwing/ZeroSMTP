#!/usr/bin/env python3
"""Render the compatibility table in docs/DEVICE-COMPATIBILITY.md from
data/devices.json.

The table is generated rather than hand-maintained because a compatibility
list that disagrees with its own data is worse than no list: somebody acts on
the wrong row. `--check` makes CI fail if the two have drifted, so the file
cannot be edited by hand and left that way.

    python tools/build-device-table.py            # rewrite the table
    python tools/build-device-table.py --check    # fail if it would change
"""

import argparse
import json
import pathlib
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
DANE = KORZEN / "data" / "devices.json"
STRONA = KORZEN / "docs" / "DEVICE-COMPATIBILITY.md"

POCZATEK = "<!-- BEGIN GENERATED TABLE -->"
KONIEC = "<!-- END GENERATED TABLE -->"

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


def komorka(tekst):
    """Markdown tables break on unescaped pipes and literal newlines."""
    return tekst.replace("|", "\\|").replace("\n", " ").strip()


def zbuduj_tabele(wpisy):
    linie = [
        "| System | OAuth status | Named models | Evidence |",
        "| --- | --- | --- | --- |",
    ]

    for w in sorted(
        wpisy,
        key=lambda w: (PORZADEK.get(w["status"], 9), w["vendor"], w["product"]),
    ):
        nazwa = f"**{komorka(w['vendor'])}** {komorka(w['product'])}"
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if the page is out of date instead of rewriting it")
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

    tresc = STRONA.read_text(encoding="utf-8")
    if POCZATEK not in tresc or KONIEC not in tresc:
        print(f"Markers missing from {STRONA.name}")
        return 1

    przed = tresc.split(POCZATEK)[0]
    po = tresc.split(KONIEC)[1]

    nowa = (
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

    if args.check:
        if nowa != tresc:
            print(f"{STRONA.name} is out of date. Run:")
            print("  python tools/build-device-table.py")
            return 1
        print(f"{STRONA.name} matches data/devices.json ({len(wpisy)} entries)")
        return 0

    if nowa == tresc:
        print(f"{STRONA.name} already up to date ({len(wpisy)} entries)")
        return 0

    STRONA.write_bytes(nowa.encode())
    print(f"{STRONA.name} rewritten ({len(wpisy)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
