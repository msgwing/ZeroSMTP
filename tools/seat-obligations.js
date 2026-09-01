// Wykrywa JEDNA rzecz: etat, ktorego wyzwalacz zadzialal, a ktory nie zostawil
// po sobie zadnego sladu w API GitHuba.
//
// Powod, 2026-09-01. Wlasciciel: "nie chce w firmie nigdy takich sytuacji, ze
// ktos na cos nie spojrzal". Tego dnia szesc scalonych PR-ow - #390, #394,
// #396, #397, #399, #405 - zwrocilo `0` z `pulls/<n>/reviews`. Wsrod nich PR
// od czlowieka z zewnatrz uruchamiany na naszych runnerach oraz dwie nowe
// bramki. Etat `change-board`, ktorego plik mowi, ze "approves or rejects
// changes on the owner's behalf", nie spojrzal na zaden z nich.
//
// Szerzej: z ostatnich 60 PR-ow tego repozytorium dokladnie JEDEN ma
// jakikolwiek obiekt recenzji (#331), i jest on od
// `github-advanced-security[bot]`. Zaden nie ma recenzji od czlowieka. Nie
// bylo wiec regresu - bramka nigdy nie istniala.
//
// Czego ten modul NIE robi i dlaczego. Nie blokuje scalenia. `ci-engineer.md`
// zapisuje, ze `enforce_admins` jest wlaczone a liczba wymaganych recenzji
// wynosi zero, wiec `--auto` jest celowo droga, ktora praca lada. Wymuszenie
// recenzji na kazdym PR zatrzymaloby projekt. Ta bramka WYKRYWA i MELDUJE.
//
// Dlaczego osobny plik, a nie skrypt w YAML: bramka sklejona w kroku workflow
// nie da sie przetestowac, a bramka nieprzetestowana wywraca sie w dniu,
// w ktorym jest potrzebna (patrz DOCTRINE, `UnboundLocalError` w generatorze
// stron aplikacji). Testy sa w `tools/seat-obligations.test.js`.

/**
 * Czy ten akt jest naszym dzialaniem, czy tylko szumem.
 *
 * Caly zespol dziala jednym loginem (`owner`), wiec API nie potrafi
 * przypisac aktu do konkretnego etatu - patrz NIEOBSERWOWALNE nizej. To,
 * co API rozroznia, to CZY ktokolwiek z naszej strony w ogole cos zrobil.
 *
 * Bot sie nie liczy. Jedyna recenzja w historii tego repozytorium pochodzi
 * od `github-advanced-security[bot]`; policzenie jej jako "etat spojrzal"
 * zamienilaby te bramke w zielone swiatlo dla dokladnie tej sytuacji,
 * ktora ma wykrywac.
 */
export function slad(akt, owner) {
  if (!akt || !akt.login || !akt.at) return false;
  // Jeden warunek zalatwia oba pytania i to nie jest skrot. Caly zespol
  // dziala loginem wlasciciela, a KAZDA nasza automatyka pisze jako
  // `github-actions[bot]` albo `github-advanced-security[bot]` - zaden bot
  // nie ma tego loginu. Osobne straze na `typ === 'Bot'` i na sufiks `[bot]`
  // zostaly tu napisane i USUNIETE po tym, jak celowe zepsucie pokazalo, ze
  // sa nieosiagalne: test #331 przechodzil takze bez nich. Martwa straz jest
  // gorsza niz jej brak, bo test obok niej wyglada na pokrycie, ktorym nie jest.
  return akt.login === owner;
}

/**
 * @param {{seat:string, przedmiot:string, trigger:string, wyzwolonyAt:string,
 *          terminAt:string, akty:Array<{login:string,typ:string,at:string}>,
 *          owner:string}} o
 * @param {number} terazMs
 * @returns {{zwloka:boolean, spozniony:boolean,
 *            akt:({login:string,typ:string,at:string}|null), wiekH:number}}
 */
export function ocenObowiazek(o, terazMs) {
  const nasze = (o.akty || []).filter((a) => slad(a, o.owner));
  // Najwczesniejszy akt, nie najpozniejszy: pytanie brzmi "kiedy ktos
  // pierwszy raz spojrzal", a nie "kiedy ostatni raz".
  nasze.sort((a, b) => (a.at < b.at ? -1 : 1));
  const akt = nasze.length ? nasze[0] : null;

  const termin = new Date(o.terminAt).getTime();
  const poTerminie = terazMs >= termin;

  return {
    zwloka: !akt && poTerminie,
    spozniony: !!akt && new Date(akt.at).getTime() > termin,
    akt,
    wiekH: Math.max(0, Math.round((terazMs - termin) / 3600000)),
  };
}

/**
 * SZEW DLA `change-board`. Ta funkcja decyduje TYLKO o tym, czy dany PR w
 * ogole podlega meldowaniu - o TRESC polityki (ktore klasy zmian maja isc
 * przez recenzje) odpowiada `change-board` w swoim wlasnym pliku, nie ta
 * bramka. Tutaj jest wylacznie mechanizm, ktory te polityke skonsumuje.
 *
 * Do czasu, az polityka zostanie opublikowana, `polityka` jest `null`
 * i bramka melduje KAZDY scalony PR. To jest celowy domysl w strone
 * halasu, nie ciszy: cisza jest dokladnie tym trybem awarii, ktory
 * 2026-09-01 musial zauwazyc wlasciciel.
 *
 * CO `change-board` FAKTYCZNIE ZBUDOWAL, sprawdzone 2026-09-01 w tym samym
 * drzewie: `tools/check-board-review.py`. Jego polityka to nie etykiety, tylko
 * KLASY SCIEZEK (`packages/<pkg>/package.json`, `.github/workflows/`,
 * `data/` ...), wymuszane PRZED scaleniem jako czerwona kontrola
 * zadajaca linii `BOARD:` w tresci PR-a.
 *
 * Te globy NIE sa tu przepisane celowo. Dwie kopie tej samej listy rozjezdzaja
 * sie, a wlascicielem TRESCI polityki jest tamten etat. Jesli zechce zawezic
 * takze ten raport, publikuje swoje klasy jako `data/review-policy.json`
 * i bramka je skonsumuje bez zmiany kodu:
 *   { "etykiety": ["ci", "security"], "zewnetrzniZawsze": true }
 *
 * Te dwie bramki sie nie dubluja. Tamta pyta "czy autor NAPISAL, ze byla
 * decyzja" - i sama zapisuje, ze linii `BOARD:` nikt nie broni przed
 * wpisaniem jej sobie samemu. Ta pyta "czy w API ISTNIEJE obiekt recenzji" -
 * tego w tresci PR-a napisac sie nie da. Tamta blokuje waska nazwana klase
 * przed scaleniem; ta obserwuje wszystko i melduje po fakcie.
 *
 * @param {{autor:string, etykiety:string[]}} pr
 * @param {{etykiety?:string[], zewnetrzniZawsze?:boolean}|null} polityka
 * @param {string} owner
 */
export function wymagaRecenzji(pr, polityka, owner) {
  if (!polityka) return true;
  if (polityka.zewnetrzniZawsze !== false && pr.autor !== owner) return true;
  const chciane = polityka.etykiety || [];
  return (pr.etykiety || []).some((e) => chciane.includes(e));
}

/**
 * @param {Array} obowiazki
 * @param {number} terazMs
 * @returns {{zwloki:Array, spoznione:Array, poEtacie:Object}}
 */
export function raport(obowiazki, terazMs) {
  const zwloki = [], spoznione = [], poEtacie = {};
  for (const o of obowiazki || []) {
    const w = ocenObowiazek(o, terazMs);
    if (w.zwloka) {
      zwloki.push({ ...o, ...w });
      poEtacie[o.seat] = (poEtacie[o.seat] || 0) + 1;
    } else if (w.spozniony) {
      spoznione.push({ ...o, ...w });
    }
  }
  zwloki.sort((a, b) => b.wiekH - a.wiekH);
  return { zwloki, spoznione, poEtacie };
}

// Zasieg tej bramki, spisany jawnie, bo DOCTRINE §5 zabrania wymyslania
// przyrzadow, a pomiaru niewykonanego nie wolno zapisac jako zera. Ta lista
// jest jedynym uczciwym sposobem, zeby raport nie udawal, ze cisza po stronie
// pozostalych etatow znaczy "brak zwloki".
//
// Runner NIE MOZE policzyc etatow sam: `.claude/` jest w `.gitignore` tego
// repozytorium (linia 6) i nie ma go w `git ls-files`. Obsada zyje w osobnym
// repozytorium `msgwing/zerosmtp-team`. Stad liczba ponizej jest wpisana
// recznie i ma date odczytu.
export const OBSADA_ETATOW = 28;          // odczyt 2026-09-01, `ls .claude/agents/*.md`
export const OBSADA_ODCZYT = '2026-09-01';

/**
 * Etaty, ktorych wyzwalacza ta bramka NIE widzi, z powodem. Powod jest
 * zawsze jeden z dwoch: albo wyzwalacz nie jest zdarzeniem w API, albo akt
 * etatu nie zostawia obiektu, ktory da sie odroznic od pracy kogokolwiek
 * innego dzialajacego tym samym loginem.
 */
export const NIEOBSERWOWALNE = [
  { seat: 'marketing-lead', powod: 'wyzwalacz to rozbieznosc w tekscie na kilku powierzchniach - nie zdarzenie' },
  { seat: 'color-systems', powod: 'wyzwalacz to ocena wizualna; API nie ma pojecia "strona meczy"' },
  { seat: 'strategy-director', powod: 'wyzwalacz to konflikt priorytetow, nie obiekt' },
  { seat: 'competitive-intel', powod: 'wyzwalacz jest w cudzych repozytoriach, akt to wiedza a nie artefakt' },
  { seat: 'auditor', powod: 'akt to sprostowanie w prozie, nieodrozninalne od zwyklego komentarza' },
  { seat: 'trust-safety', powod: 'weto jest brakiem dzialania - bramka nie odroznia weta od przeoczenia' },
  { seat: 'pentester', powod: 'akt bez znaleziska nie zostawia sladu' },
  { seat: 'traffic-analyst', powod: 'zrodlo to API ruchu, nieczytelne tokenem workflow (403, sprawdzone dwa razy)' },
];
