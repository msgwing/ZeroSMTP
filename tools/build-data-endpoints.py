#!/usr/bin/env python3
"""Publish data/*.json under docs/ so the site serves them as data.

The device compatibility list is the one asset this project has that nobody
else does: twenty vendors, each row carrying a link to that vendor's own
published statement. It lived only as a file in a git repository, which means
a tool that wanted to consume it had to know about GitHub, and an assistant
answering somebody's question had no stable URL to cite.

Copied rather than moved. data/ stays the source of truth - it is what the
generators read and what CI checks - and docs/data/ is a published mirror that
cannot drift because this script is the only thing that writes it and --check
fails when the two differ.

    python tools/build-data-endpoints.py            # rewrite
    python tools/build-data-endpoints.py --check    # fail if it would change
"""

import argparse
import json
import pathlib
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
ZRODLO = KORZEN / "data"
CEL = KORZEN / "docs" / "data"
# facts.json dolaczone 2026-08-29: to jedyny plik, ktory mowi wprost, ktore
# twierdzenia sa uzgodnione - a asystent cytujacy nas bez tego cytuje wersje,
# ktora sam sobie zlozyl.
PLIKI = ["devices.json", "errors.json", "facts.json"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    CEL.mkdir(parents=True, exist_ok=True)
    rozne = []
    for nazwa in PLIKI:
        zr = ZRODLO / nazwa
        if not zr.exists():
            print(f"::error::{zr.relative_to(KORZEN)} is missing", file=sys.stderr)
            return 1
        # Round-tripped through json so a stray formatting difference in the
        # source cannot make the published copy look changed when it is not.
        tresc = json.dumps(json.loads(zr.read_text(encoding="utf-8")),
                           indent=2, ensure_ascii=False) + "\n"
        do = CEL / nazwa
        stary = do.read_text(encoding="utf-8") if do.exists() else None
        if stary != tresc:
            rozne.append(nazwa)
            if not a.check:
                do.write_text(tresc, encoding="utf-8", newline="\n")

    if a.check:
        if rozne:
            print(f"::error::docs/data is out of date ({', '.join(rozne)}). "
                  f"Run: python tools/build-data-endpoints.py", file=sys.stderr)
            return 1
        print(f"docs/data matches data/ ({len(PLIKI)} files)")
        return 0

    print(f"wrote docs/data - {len(PLIKI)} files, "
          f"{'updated ' + ', '.join(rozne) if rozne else 'no change'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
