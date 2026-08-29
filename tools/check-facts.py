#!/usr/bin/env python3
"""Refuse a page that contradicts a claim this project makes elsewhere.

On 2026-08-29 sixteen generated pages were found saying the end-of-December-2026
change "cannot be undone", while docs/EXCHANGE-ONLINE-SMTP-AUTH.md had said the
opposite - correctly - for weeks. Microsoft's own post says an administrator can
re-enable it. The site was arguing with itself about the single date this whole
project is built around, and the wrong half was on sixteen pages because a
generator produced it.

The same day, an assistant asked to assess this project for business use called
it doubtful. Those two facts belong together: a reader who finds two of our
pages disagreeing discounts both, and that reader is now often a machine
deciding whether to cite us at all. Consistency is not tidiness here - it is
whether the project gets recommended.

So the claims that appear on more than one page live in data/facts.json with
the phrasings that contradict them, and this refuses a build where any page
carries one.

    python tools/check-facts.py
"""

import json
import pathlib
import re
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
DANE = KORZEN / "data" / "facts.json"

# Sprawdzane sa strony publikowane i zrodla, ktore je generuja - bo naprawa
# samej strony bez generatora zostaje cofnieta przy najblizszym przebiegu.
OBSZAR = [
    (KORZEN / "docs", "*.md"),
    (KORZEN / "docs" / "clients", "*.md"),
    (KORZEN / "docs" / "apps", "*.md"),
    (KORZEN / "docs" / "errors", "*.md"),
    (KORZEN / "docs" / "devices", "*.md"),
    (KORZEN / "tools", "*.py"),
    (KORZEN, "README.md"),
]

# Ten plik z definicji zawiera kazdy sprzeczny zwrot, i tools/check-facts.py
# tez - inaczej nie mialyby czego szukac.
POMIN = {"facts.json", "check-facts.py"}


def sciezki():
    widziane = set()
    for katalog, wzor in OBSZAR:
        if not katalog.exists():
            continue
        for p in sorted(katalog.glob(wzor)):
            if p.name in POMIN or p in widziane:
                continue
            widziane.add(p)
            yield p


def main():
    dane = json.loads(DANE.read_text(encoding="utf-8"))
    fakty = dane["facts"]

    puste = [f["key"] for f in fakty if not f.get("contradictions")]
    if puste:
        print("Facts with nothing to check against - a fact with no")
        print("contradiction listed is a comment, not a gate:")
        for k in puste:
            print(f"  {k}")
        return 1

    trafienia = []
    for p in sciezki():
        tekst = p.read_text(encoding="utf-8", errors="replace")
        maly = tekst.lower()
        for f in fakty:
            for zwrot in f["contradictions"]:
                m = re.search(zwrot, maly, re.S)
                if m:
                    nr = maly[: m.start()].count(chr(10)) + 1
                    trafienia.append(
                        (p.relative_to(KORZEN).as_posix(), nr, f["key"],
                         m.group(0)[:70], f["claim"])
                    )

    if trafienia:
        print("Pages contradicting a claim this project makes elsewhere:")
        widziane = set()
        for sciezka, nr, klucz, zwrot, claim in trafienia:
            print(f"  {sciezka}:{nr}  says {zwrot!r}")
            if klucz not in widziane:
                widziane.add(klucz)
                print(f"    the agreed claim ({klucz}) is:")
                print(f"    {claim}")
        print()
        print("Fix it in the generator, not the page, or the next build puts it")
        print("back. If the claim itself has changed, change data/facts.json and")
        print("say where the new wording was verified.")
        return 1

    print(f"{len(fakty)} shared claims, no page contradicts one.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
