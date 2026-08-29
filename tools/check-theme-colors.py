#!/usr/bin/env python3
"""Refuse a colour literal in any style the page builds at runtime.

Found on a phone, 2026-08-29: text at contrast 1.09 - near-white on
near-white, invisible. Two widgets set `background:#f6f8fa` in an inline
style string while the text inside inherited `--ink`, which is #1B1830 in
light mode and #EFECFA in dark. The background stayed light when the theme
flipped and the text did not, so the whole widget went blank.

Thirty elements on one page. It was not visible in review because reviewing
happens in light mode, where a light background is exactly right.

The rule this enforces: a colour inside a `style="..."` or `cssText` string
in the layout must come from a custom property, because those are the only
values defined twice - once per theme. A literal is defined once and is
therefore wrong in one of the two.

Syntax highlighting is exempt. Those rules live in a real stylesheet under
`.highlight`, they colour text on a code block that paints its own dark
background in both themes, and they are a palette rather than a theme.

    python tools/check-theme-colors.py
"""

import pathlib
import re
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
UKLAD = KORZEN / "docs" / "_layouts" / "default.html"

# Wlasciwosci, ktore niosa kolor. `border` lapie tez `border:1px solid #fff`.
WLASCIWOSCI = r"(?:background|background-color|color|border|border-color|outline|fill|stroke)"

# Literal koloru: #abc, #aabbcc, rgb(), rgba(), albo nazwa z tej krotkiej listy.
# Nazwy pelne (`white`, `black`) sa tu, bo to one wygladaja najniewinniej.
LITERAL = r"(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black|silver|gainsboro|whitesmoke)\b)"

# Ciagi, ktore strona sklada w czasie dzialania: atrybut style= wewnatrz
# lancucha JavaScriptu, oraz przypisania do cssText / style.background itd.
WZORY_RUNTIME = [
    re.compile(r"style\s*=\\?[\"'][^\"']*?" + WLASCIWOSCI + r"\s*:\s*" + LITERAL),
    re.compile(r"cssText\s*=\s*[\"'][^\"']*?" + WLASCIWOSCI + r"\s*:\s*" + LITERAL),
    re.compile(r"\.style\.(?:background|backgroundColor|color|borderColor)\s*=\s*[\"']" + LITERAL),
]


def main():
    tekst = UKLAD.read_text(encoding="utf-8")
    znalezione = []

    for nr, linia in enumerate(tekst.split("\n"), 1):
        for wzor in WZORY_RUNTIME:
            for m in wzor.finditer(linia):
                znalezione.append((nr, m.group(1), linia.strip()[:96]))

    if znalezione:
        print("Colour literals in styles the page builds at runtime:")
        for nr, kolor, linia in znalezione:
            print(f"  docs/_layouts/default.html:{nr}  {kolor}")
            print(f"    {linia}")
        print()
        print("A literal is defined once; a theme needs two values. Use a custom")
        print("property - var(--panel), var(--paper), var(--ink), var(--muted),")
        print("var(--line), var(--tint), var(--ok), var(--fault) - so the value")
        print("changes with the theme and the text stays on top of its own")
        print("background rather than disappearing into it.")
        return 1

    print(f"Runtime styles carry no colour literals ({UKLAD.name}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
