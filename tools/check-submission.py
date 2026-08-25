#!/usr/bin/env python3
"""Sprawdz wniosek do cudzego repozytorium, ZANIM zostanie wypchniety.

Istnieje, bo 2026-08-25 wpis jednolinijkowy do katalogu `awesome-cli-apps-in-a-csv`
wyszedl jako commit na **4417 linii**. Drzewo robocze pokazywalo 1 linie.
Windows przerobil konce wierszy calego pliku przy `git add`, a roznicy po
commicie nikt nie sprawdzil.

Taki wniosek zostaje odrzucony w sekundę, wyglada na niechlujny i - co gorsze -
uczy opiekuna cudzej listy, ze nasze zgloszenia sa smieciowe. Kosztem nie jest
jeden PR, tylko wszystkie nastepne do tego samego lokalu.

Uzycie, w katalogu sklonowanego forka, po commicie a przed `git push`:

    python tools/check-submission.py --max-lines 3

Konczy sie kodem 1, gdy cokolwiek jest nie tak. Wtedy NIE wypychaj.
"""
import argparse
import subprocess
import sys


def git(*a, cwd=None):
    return subprocess.run(["git", *a], capture_output=True, text=True,
                          cwd=cwd, check=False).stdout.strip()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--max-lines", type=int, default=5,
                   help="ile najwyzej linii wolno zmienic (domyslnie 5)")
    p.add_argument("--repo", default=".", help="katalog sklonowanego forka")
    args = p.parse_args()
    bledy = []

    # 1. Konwersja koncow wierszy. To jest ta usterka, dla ktorej ten plik powstal.
    crlf = git("config", "core.autocrlf", cwd=args.repo)
    if crlf.lower() not in ("false", "input"):
        bledy.append(
            "core.autocrlf = " + (crlf or "<niezdefiniowane>") + ". Na Windowsie "
            "to przepisze konce wierszy calego pliku. Sklonuj ponownie: "
            "git -c core.autocrlf=false clone ...")

    # 2. Rozmiar roznicy NA COMMICIE, nie w drzewie roboczym. Bez --format=
    #    numstat doklei naglowek commita i sprawdzenie porowna sie z nazwiskiem
    #    autora - ta pomylka tez zdarzyla sie tego samego dnia.
    numstat = git("show", "--numstat", "--format=", "HEAD", cwd=args.repo)
    wiersze = [l.split("	") for l in numstat.splitlines() if l.strip()]
    suma = 0
    for w in wiersze:
        if len(w) < 3:
            continue
        dodane, usuniete = w[0], w[1]
        if dodane == "-" or usuniete == "-":
            bledy.append("plik binarny w commicie: " + w[2])
            continue
        suma += int(dodane) + int(usuniete)

    if not wiersze:
        bledy.append("commit nie zmienia niczego - czy na pewno zrobiles commit?")
    elif suma > args.max_lines:
        bledy.append(
            "commit zmienia " + str(suma) + " linii przy dopuszczalnych "
            + str(args.max_lines) + ". Prawie na pewno konce wierszy albo "
            "przebudowany plik generowany, a nie tresc wniosku.")

    # 3. Nic poza commitem. Wypchniecie zostawi smieci w forku.
    brudne = git("status", "--porcelain", cwd=args.repo)
    if brudne:
        bledy.append("niezacommitowane zmiany w drzewie:" + chr(10)
                     + chr(10).join("    " + l for l in brudne.splitlines()))

    print("Wniosek: " + str(suma) + " zmienionych linii w "
          + str(len(wiersze)) + " pliku/plikach.")
    for w in wiersze:
        if len(w) >= 3:
            print("  +" + w[0] + " -" + w[1] + "  " + w[2])

    if bledy:
        print()
        for b in bledy:
            print("BLAD: " + b)
        print()
        print("Nie wypychaj, dopoki powyzsze nie zniknie.")
        sys.exit(1)

    print("Czysto. Mozna wypychac.")


if __name__ == "__main__":
    main()
