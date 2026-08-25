#!/usr/bin/env python3
"""Znajdz znaki sterujace w kazdym sledzonym pliku tekstowym.

Istnieje, bo ta sama usterka wrocila trzeci raz. Ukosnik zjedzony przez
warstwe powloki zamienia \b w regule wyrazenia regularnego na prawdziwy
znak backspace. Kod dalej wyglada poprawnie w edytorze i w przegladzie
zmian, a dziala inaczej: wyszukiwanie kodow paneli drukarek przestalo
znajdowac cokolwiek i nikt tego nie zauwazyl, bo nic sie nie wysypalo.

Kontrola dla plikow workflow istniala od dawna i to ona zlapala ten sam
znak 2026-08-25 w listings-radar.yml. Jej zakres konczyl sie jednak na
.github/workflows/*.yml, a pierwotna usterka mieszkala w pliku
JavaScript. Ten skrypt zamyka te luke: sprawdza wszystko, co git sledzi.

Dozwolone sa tabulator, nowa linia i powrot karetki. Kazdy inny znak
sterujacy jest bledem.

Granica, zmierzona przy pisaniu tego skryptu: widzi tylko to, co git juz
sledzi. Nowy plik, ktorego nikt nie dodal, przechodzi niezauwazony az do
pierwszego commita. W CI to nie ma znaczenia, bo tam wszystko jest
zacommitowane; przy uruchomieniu recznie na swiezym pliku - ma.
"""
import subprocess
import sys

DOZWOLONE = {9, 10, 13}
POMIN = (".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".woff", ".woff2",
         ".zip", ".gz", ".svgz", ".webp", ".mp4")

pliki = subprocess.run(["git", "ls-files"], capture_output=True, text=True,
                       check=True).stdout.split(chr(10))

bledy = 0
for sciezka in pliki:
    if not sciezka or sciezka.lower().endswith(POMIN):
        continue
    try:
        with open(sciezka, "r", encoding="utf-8") as uchwyt:
            tekst = uchwyt.read()
    except (OSError, UnicodeDecodeError):
        continue
    for numer, linia in enumerate(tekst.split(chr(10)), 1):
        zle = sorted({hex(ord(z)) for z in linia
                      if ord(z) < 32 and ord(z) not in DOZWOLONE})
        if zle:
            print("::error file=" + sciezka + ",line=" + str(numer)
                  + "::znaki sterujace " + ", ".join(zle)
                  + " - kod wyglada poprawnie, a dziala inaczej")
            bledy += 1

if bledy:
    print("Znaki sterujace: " + str(bledy) + " wierszy do naprawy.")
    sys.exit(1)
print("Znaki sterujace: czysto (" + str(len([p for p in pliki if p])) + " plikow).")
