#!/usr/bin/env python3
"""Liczby, ktorych wolno uzywac w decyzjach. Jedno zrodlo, z ostrzezeniami.

DLACZEGO TO ISTNIEJE:
2026-08-27 licznik `traffic/clones` trafil do trzech decyzji zarzadu jako
dowod zasiegu - do briefu konkursowego dla czterech agentow, do opisu PR #312
i do wyliczenia "konwersji 0,3%". Byl **artefaktem naszej wlasnej automatyki**:
kazdy z osiemnastu workflowow klonuje repozytorium, wiec 112 przebiegow dalo
433 klony, a 79 commitow dalo 2276.

Przy 1657 klonach bylo 68 unikalnych - **24 klony na "osobe"**. Zaden czlowiek
tak nie robi. Biegacz Actions owszem.

Regula, ktora z tego wynika: **licznik, na ktory wplywa wlasna automatyka, nie
jest miara zasiegu.** Reguly jednak zawodza - ta firma ma to udokumentowane -
wiec zamiast zapisu powstal ten skrypt. Liczba, ktorej tu nie ma, nie wchodzi
do decyzji bez wyraznego zastrzezenia.

UZYCIE:
    python tools/metrics.py            # liczby czyste
    python tools/metrics.py --all      # takze zanieczyszczone, z ostrzezeniem
"""
import argparse
import json
import subprocess
import sys

REPO = "msgwing/ZeroSMTP"


def gh(sciezka):
    w = subprocess.run(["gh", "api", sciezka], capture_output=True, text=True)
    if w.returncode != 0:
        return None
    try:
        return json.loads(w.stdout)
    except json.JSONDecodeError:
        return None


# Czy nasza wlasna automatyka moze podbic ten licznik?
#   False = czysty, wolno uzywac w decyzji
#   True  = zanieczyszczony, wolno tylko z zastrzezeniem
LICZNIKI = [
    ("odslony, unikalnych / 14 dni", "traffic/views", "uniques", False,
     "Actions nie ogladaja stron."),
    ("odslony, suma / 14 dni", "traffic/views", "count", False,
     "Suma jest szumna, ale nie nasza - patrz raczej na unikalnych."),
    ("klony, unikalnych / 14 dni", "traffic/clones", "uniques", True,
     "KAZDY przebieg workflow klonuje repozytorium. 18 workflowow."),
    ("klony, suma / 14 dni", "traffic/clones", "count", True,
     "To samo, tylko mocniej. 79 commitow dalo 2276 klonow."),
    ("gwiazdki", "", "stargazers_count", False,
     "Kazda dotad przyszla od osoby, ktora forkowala albo kontrybuowala."),
    ("forki", "", "forks_count", False, ""),
    ("obserwujacy", "", "subscribers_count", False, ""),
]


def npm(pakiet):
    """Daily download series for one npm package, and an honest reading of it.

    Added 2026-08-29 after "594 downloads a week" was nearly written into a
    board goal. The series behind it was:

        0 0 0 0 0 0 0 496 22 23 36 12 2 3

    One day of 496 and a tail in single figures. The weekly total is the
    496 - a mirror or a scanner picking the package up once - and reporting
    it as reach would have repeated exactly the mistake traffic/clones cost
    this company three decisions ago.

    So the weekly total is shown as contaminated and the median of the days
    that actually had downloads is shown as the number to use.
    """
    import urllib.request
    adres = f"https://api.npmjs.org/downloads/range/last-month/{pakiet}"
    try:
        with urllib.request.urlopen(adres, timeout=20) as o:
            d = json.load(o)
    except Exception as e:
        # 404 z rejestru npm znaczy "pakiet nie jest opublikowany", a nie
        # awarie. Cel 4 wisi na tym odczycie, wiec musi odrozniac brak
        # publikacji od braku odpowiedzi.
        kod = getattr(e, "code", None)
        if kod == 404:
            # 404 z API pobran nie rozstrzyga. Nowy pakiet jest w rejestrze
            # od razu, a licznik pobran rusza dopiero po dobie - wiec o zywym
            # pakiecie miernik mowilby "nieopublikowany", co jest falszem
            # i trafiloby do odczytu celu 4.
            try:
                with urllib.request.urlopen(
                        f"https://registry.npmjs.org/{pakiet}", timeout=20):
                    return None, "opublikowany, licznik pobran jeszcze milczy"
            except Exception:
                return None, "nieopublikowany"
        return None, f"nie odczytano ({type(e).__name__})"

    dni = [x["downloads"] for x in d.get("downloads", [])]
    if not dni:
        return None, "brak danych"

    ostatnie = dni[-14:]
    niezerowe = sorted(x for x in ostatnie if x)
    if not niezerowe:
        return {"mediana": 0, "suma7": sum(dni[-7:]), "szczyt": 0, "dni": ostatnie}, None

    mediana = niezerowe[len(niezerowe) // 2]
    szczyt = max(ostatnie)
    return {"mediana": mediana, "suma7": sum(dni[-7:]), "szczyt": szczyt,
            "dni": ostatnie}, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="pokaz takze liczniki zanieczyszczone wlasna automatyka")
    args = ap.parse_args()

    meta = gh(f"repos/{REPO}") or {}
    cache = {}

    print("LICZBY, KTORYCH WOLNO UZYWAC W DECYZJACH")
    print("=" * 62)
    brudne = []
    for nazwa, sciezka, pole, zanieczyszczony, uwaga in LICZNIKI:
        if zanieczyszczony and not args.all:
            brudne.append(nazwa)
            continue
        if sciezka:
            if sciezka not in cache:
                cache[sciezka] = gh(f"repos/{REPO}/{sciezka}")
            zrodlo = cache[sciezka]
        else:
            zrodlo = meta
        wartosc = (zrodlo or {}).get(pole)
        # Brak odpowiedzi to nie jest zero - mechanika 6.
        pokaz = "nie zmierzono" if wartosc is None else str(wartosc)
        znak = "  !" if zanieczyszczony else "   "
        print(f"{znak} {nazwa:34} {pokaz:>10}")
        if uwaga and (args.all or not zanieczyszczony):
            print(f"      {uwaga}")

    ref = gh(f"repos/{REPO}/traffic/popular/referrers")
    if ref is None:
        print()
        print("   skad ludzie                        nie zmierzono")
        print("      Wymaga tokena uzytkownika. GITHUB_TOKEN w workflow zwraca 403")
        print("      przy contents:read ORAZ contents:write - to ograniczenie")
        print("      platformy, nie uprawnien.")
    else:
        print()
        print("   skad ludzie (unikalnych, 14 dni)")
        for r in ref:
            print(f"      {r['uniques']:>4}  {r['referrer']}")

    for pakiet in ("zerosmtp-check", "zerosmtp-mcp"):
        w, blad = npm(pakiet)
        print()
        if blad:
            print(f"   npm {pakiet}: {blad}")
            continue
        print(f"   npm {pakiet} (14 dni)")
        print(f"      mediana dnia z pobraniami       {w['mediana']:>6}   <- ta liczba")
        print(f"      najwiekszy pojedynczy dzien     {w['szczyt']:>6}")
        print(f"    ! suma 7 dni                      {w['suma7']:>6}   "
              f"zanieczyszczona przez szczyt, NIE uzywac")
        print(f"      szereg: {' '.join(str(x) for x in w['dni'])}")
        brudne.append(f"npm {pakiet}: suma tygodniowa - jeden dzien potrafi byc "
                      f"lustrem, patrz na mediane")

    if brudne:
        print()
        print("POMINIETE - zanieczyszczone wlasna automatyka:")
        for b in brudne:
            print(f"   ! {b}")
        print("   Pokaz je przez --all, ale NIE uzywaj w decyzji bez zastrzezenia.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
