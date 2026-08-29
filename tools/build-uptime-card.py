#!/usr/bin/env python3
"""Draw the uptime strip as an SVG, for surfaces that cannot run JavaScript.

docs.msgwing.com renders this panel live in the browser. github.com does not
run scripts in a README, and the repository page is where most people meet
this project first - the one badge there says `operational`, which is a word,
not a record.

So the same strip is drawn as an image, published to the orphan `status`
branch by service-healthcheck.yml and embedded in README.md the way
countdown-card.svg already is.

Deliberately the same numbers as the web panel and derived the same way: a
count rather than a percentage, and a cadence measured from the runs rather
than copied from the cron - which asks for 15 minutes and gets a median of 47.

    gh api ".../runs?per_page=30&status=completed" > runs.json
    python tools/build-uptime-card.py runs.json > uptime-card.svg
"""

import argparse
import json
import pathlib
import sys
from datetime import datetime, timezone

SZEROKOSC = 480
WYSOKOSC = 116

# Trzymane osobno od palety strony celowo: ta karta nie wie, czy czytelnik ma
# GitHuba w trybie jasnym czy ciemnym, wiec niesie wlasne tlo i musi byc
# czytelna na obu. Te same wartosci co countdown-card.svg, ktory juz tam stoi.
TLO = "#12101E"
RAMKA = "#332C55"
TEKST = "#EFECFA"
PRZYGASZONY = "#A8A2C4"
DOBRY = "#3FD07A"
ZLY = "#FF8A80"


def czas(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def okres(minut):
    if minut >= 2880:
        return "%d days" % round(minut / 1440)
    if minut >= 120:
        return "about %d hours" % round(minut / 60)
    return "under two hours"


def rytm(przebiegi):
    """Median gap between consecutive runs, in minutes.

    One run has no gap to measure. The web panel printed "about every 0
    minutes" for that case before it was fixed; this returns None and the
    caller says nothing, which is what an unmeasurable quantity deserves.
    """
    if len(przebiegi) < 2:
        return None

    przerwy = sorted(
        (czas(przebiegi[i]["updated_at"]) - czas(przebiegi[i + 1]["updated_at"])).total_seconds() / 60
        for i in range(len(przebiegi) - 1)
    )
    return przerwy[len(przerwy) // 2]


def zbuduj(przebiegi):
    if not przebiegi:
        raise ValueError("no runs to draw - refusing to invent a record")

    # Najnowszy po prawej, tak jak na stronie.
    kolejnosc = list(reversed(przebiegi))
    udane = sum(1 for r in kolejnosc if r.get("conclusion") == "success")
    ok = kolejnosc[-1].get("conclusion") == "success"

    rozpietosc = (czas(kolejnosc[-1]["updated_at"]) - czas(kolejnosc[0]["updated_at"])).total_seconds() / 60
    m = rytm(przebiegi)
    opis_rytmu = ""
    if m is not None:
        opis_rytmu = (", about every %.1f hours" % (m / 60)) if m >= 90 else (", about every %d minutes" % round(m))

    n = len(kolejnosc)
    lewo, prawo, gora, wys = 16, 16, 52, 26
    pole = SZEROKOSC - lewo - prawo
    odstep = 2 if n > 1 else 0
    szer = (pole - odstep * (n - 1)) / n

    slupki = []
    for i, r in enumerate(kolejnosc):
        x = lewo + i * (szer + odstep)
        kolor = DOBRY if r.get("conclusion") == "success" else ZLY
        # Ostatni slupek pulsuje. Karta jest nieruchomym obrazkiem i bez tego
        # niczym nie rozni sie od zrzutu ekranu sprzed tygodnia.
        klasa = ' class="teraz"' if i == n - 1 else ""
        slupki.append(
            '<rect x="%.2f" y="%d" width="%.2f" height="%d" rx="2" fill="%s"%s/>'
            % (x, gora, szer, wys, kolor, klasa)
        )

    plakietka = "answering on 587 and 465" if ok else "not answering"
    kolor_plakietki = DOBRY if ok else ZLY
    # Szerokosc plakietki liczona z dlugosci tekstu, bo SVG nie ma ukladu.
    szer_plakietki = len(plakietka) * 5.6 + 16

    return """<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="%s: %d of %d checks passed">
  <title>mx.msgwing.com &#8212; %d of %d checks passed</title>
  <style>
    .teraz { animation: zu-puls 2.4s ease-in-out infinite; }
    @keyframes zu-puls { 0%%, 100%% { opacity: 1; } 50%% { opacity: .45; } }
    @media (prefers-reduced-motion: reduce) { .teraz { animation: none; } }
  </style>
  <rect x="1" y="1" width="%d" height="%d" rx="12" fill="%s" stroke="%s" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="5" fill="%s"/>
  <text x="38" y="28" font-family="Courier New,monospace" font-size="13" font-weight="700" fill="%s">mx.msgwing.com</text>
  <rect x="168" y="15" width="%.1f" height="18" rx="9" fill="%s"/>
  <text x="%.1f" y="27.5" text-anchor="middle" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="9.5" font-weight="700" fill="%s" letter-spacing="0.6">%s</text>
  <text x="%d" y="46" text-anchor="end" font-family="Courier New,monospace" font-size="11" font-weight="700" fill="%s">%d of %d passed</text>
  <text x="16" y="46" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="9.5" fill="%s" letter-spacing="0.8">EVERY CHECK ON RECORD%s</text>
  %s
  <text x="16" y="%d" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="9.5" fill="%s">%s ago</text>
  <text x="%d" y="%d" text-anchor="end" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="9.5" fill="%s">now</text>
</svg>
""" % (
        SZEROKOSC, WYSOKOSC, SZEROKOSC, WYSOKOSC, plakietka, udane, n,
        udane, n,
        SZEROKOSC - 2, WYSOKOSC - 2, TLO, RAMKA,
        DOBRY if ok else ZLY,
        TEKST,
        szer_plakietki, kolor_plakietki,
        168 + szer_plakietki / 2, TLO, plakietka,
        SZEROKOSC - prawo, TEKST, udane, n,
        PRZYGASZONY, opis_rytmu.upper(),
        "\n  ".join(slupki),
        gora + wys + 14, PRZYGASZONY, okres(rozpietosc),
        SZEROKOSC - prawo, gora + wys + 14, PRZYGASZONY,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("runs", help="JSON from the workflow-runs API, or - for stdin")
    args = ap.parse_args()

    tresc = sys.stdin.read() if args.runs == "-" else pathlib.Path(args.runs).read_text(encoding="utf-8")
    dane = json.loads(tresc)
    przebiegi = dane["workflow_runs"] if isinstance(dane, dict) else dane

    # Bieg bez wniosku jeszcze trwa albo zostal przerwany; wpuszczony do
    # licznika udawalby porazke, ktorej nikt nie zmierzyl.
    przebiegi = [r for r in przebiegi if r.get("conclusion")]
    if not przebiegi:
        print("no completed runs in the input", file=sys.stderr)
        return 1

    sys.stdout.write(zbuduj(przebiegi))
    return 0


if __name__ == "__main__":
    sys.exit(main())
