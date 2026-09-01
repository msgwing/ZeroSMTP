// Dlug wobec kontrybutorow: czyja praca zostala SCALONA, a nikt z nas nie
// powiedzial mu ani slowa.
//
// DLACZEGO OSOBNY MODUL, SKORO ISTNIEJE unanswered-external.js
//
// `tools/unanswered-external.js` odpowiada na pytanie "czy ostatnie slowo w
// tym watku jest nasze" i jest poprawny. Zadania, ktore go wolaja
// (`czeka-czlowiek`, `zalegle-zewnetrzne`), pytaja jednak GitHuba o
// `state: 'open'` - a scalony pull request jest ZAMKNIETY. Wklad, ktory
// zostal przyjety i nieodnotowany, byl dla tamtej bramki niewidzialny
// z definicji, nie przez blad w niej.
//
// Zmierzone 2026-09-01, po przejrzeniu wszystkich 14 scalonych wnioskow od
// ludzi z zewnatrz: PIEC z nich nie ma ani jednego slowa od nas, a nie
// jedno, jak sadzono. #238 i #245 czekaly dziewiec dni i nie znalazl ich
// zaden przeglad, bo zaden nie patrzyl na rzeczy zamkniete.
//
// Modul jest czysty - zadnych wywolan sieciowych. Regule "kto napisal
// ostatni" importujemy z unanswered-external.js zamiast pisac ja drugi raz:
// dwie kopie tej samej logiki rozjezdzaja sie przy pierwszej poprawce.

import { ocenWatek, jestZewnetrzny } from './unanswered-external.js';

export const PROGI = {
  // Ile godzin po scaleniu wklad zaczyna sie liczyc jako dlug. Nie jest
  // wymyslony: CLAUDE.md niesie stojace polecenie "Odpowiadac tym ludziom
  // tego samego dnia", wiec doba jest zapisana norma tej firmy, a nie
  // wygodnie dobrana liczba. Sprawdzone na przypadku: #390 dostal
  // podziekowanie po okolo 25 godzinach i ta bramka MA sie o niego upomniec.
  potwierdzenieH: 24,

  // Po ilu dniach ciszy kontrybutor jest uznany za usypiajacego.
  //
  // TEN PROG JEST NIESKALIBROWANY I TAK MA BYC RAPORTOWANY. Jedyne dane, na
  // ktorych da sie go oprzec, to odstepy miedzy kolejnymi wkladami jedynego
  // powracajacego kontrybutora (Mohitingale13): 3 i 4 dni. Dwie obserwacje
  // od jednej osoby to nie jest rozklad. 21 dni to okolo pieciokrotnosc
  // tego, co widzielismy - liczba wybrana, nie wyliczona.
  //
  // Dlatego uspienie NIGDY nie zaklada zgloszenia samo i nie generuje
  // zadnego kontaktu. Jest wylacznie wierszem kontekstu. To ta sama
  // konkluzja, ktora dala analiza forkujacych z 2026-08-27: przy n=5
  // profilowanie ludzi po metadanych nie ma pokrycia, a niezamowiony
  // kontakt kosztuje wiecej, niz moze przyniesc.
  uspienieDni: 21,
};

/** Czy to jest prawdziwe slowo od nas, a nie pusta formalnosc. */
export function jestNaszymSlowem(login, body, owner, ackMarker) {
  if (login !== owner) return false;
  const t = (body || '').trim();
  if (!t) return false;
  // Wlasne automatyczne potwierdzenie nie jest podziekowaniem. Ta sama
  // zasada co w ocenWatek: bot nie zalatwia dlugu za czlowieka.
  if (ackMarker && t.includes(ackMarker)) return false;
  return true;
}

export function dniOd(iso, teraz) {
  return Math.floor((teraz - new Date(iso).getTime()) / 86400000);
}

export function godzinOd(iso, teraz) {
  return Math.floor((teraz - new Date(iso).getTime()) / 3600000);
}

/**
 * Najpozniejszy slad autora wniosku w jego wlasnym watku.
 *
 * SWIADOMIE bez `merged_at`: scalenie jest NASZA czynnoscia, nie jego.
 * Liczac je jako jego aktywnosc, zrobilibysmy z wlasnego klikniecia dowod,
 * ze kontrybutor wciaz jest z nami - a to jest dokladnie ten rodzaj miary,
 * ktora sama sobie przytakuje. Na zywym przypadku roznica wynosi piec dni:
 * @slegarraga wyslal ostatni wniosek 2026-08-06, a my scalilismy go
 * 2026-08-11.
 */
function ostatniaAktywnoscAutora(pr, komentarze, owner) {
  let max = pr.created_at;
  for (const k of komentarze || []) {
    const login = k.user && k.user.login;
    if (!jestZewnetrzny(login, k.user && k.user.type, owner)) continue;
    if (login !== pr.user.login) continue;
    if (k.created_at > max) max = k.created_at;
  }
  return max;
}

/**
 * Ocenia JEDEN scalony wniosek od kogos z zewnatrz.
 *
 * @param {{number:number, title:string, user:{login:string,type:string}, created_at:string, merged_at:string}} pr
 * @param {Array<{user:{login:string,type:string}, created_at:string, body:string}>} komentarze
 * @param {Array<{user:{login:string,type:string}, submitted_at:string, body:string, state:string}>} recenzje
 * @param {string} owner
 * @param {string} ackMarker
 * @param {number} teraz - Date.now()
 */
export function ocenWklad(pr, komentarze, recenzje, owner, ackMarker, teraz) {
  let potwierdzone = false;
  for (const k of komentarze || []) {
    if (jestNaszymSlowem(k.user && k.user.login, k.body, owner, ackMarker)) {
      potwierdzone = true;
      break;
    }
  }
  if (!potwierdzone) {
    // Recenzja z trescia jest podziekowaniem tak samo jak komentarz - i to
    // nie jest szczegol. Trzy wklady @slegarraga (#83, #84, #85) nie maja
    // ani jednego zwyklego komentarza od nas, tylko recenzje z trescia.
    // Bramka liczaca wylacznie komentarze zglosilaby je jako dlug i tym
    // samym nauczyla czytelnika, ze ta lista klamie.
    //
    // Pusta akceptacja to co innego: APPROVED bez tresci jest mechanika
    // scalania, nie slowem powiedzianym czlowiekowi.
    for (const r of recenzje || []) {
      if (jestNaszymSlowem(r.user && r.user.login, r.body, owner, ackMarker)) {
        potwierdzone = true;
        break;
      }
    }
  }

  // ocenWatek chce watku i list komentarzy - dla PR-a dziala tak samo, bo
  // pull request jest u GitHuba zgloszeniem.
  const { czeka, ostatniZewnetrzny } =
    ocenWatek(pr, komentarze, recenzje, owner, ackMarker);

  return {
    numer: pr.number,
    autor: pr.user.login,
    tytul: pr.title || '',
    mergedAt: pr.merged_at,
    dniOdScalenia: dniOd(pr.merged_at, teraz),
    // Dojrzaly = minela doba od scalenia. Przed nia nie ma dlugu, jest
    // swiezy merge i ktos wlasnie pisze odpowiedz.
    dojrzaly: godzinOd(pr.merged_at, teraz) >= PROGI.potwierdzenieH,
    potwierdzone,
    ostatnieSlowoIch: czeka,
    ostatniZewnetrzny,
    ostatniaAktywnosc: ostatniaAktywnoscAutora(pr, komentarze, owner),
  };
}

/**
 * Sklada oceny pojedynczych wkladow w jeden obraz opieki nad kontrybutorami.
 *
 * @param {Array<ReturnType<typeof ocenWklad>>} wklady
 * @param {number} teraz
 * @param {typeof PROGI} progi
 */
export function ocenOpieke(wklady, teraz, progi = PROGI) {
  const wgDaty = (a, b) => (a.mergedAt < b.mergedAt ? -1 : 1);

  const bezPotwierdzenia = wklady
    .filter((w) => w.dojrzaly && !w.potwierdzone)
    .sort(wgDaty);

  // Wklad bez ani jednego naszego slowa jest juz na liscie wyzej - ten sam
  // czlowiek nie ma sie pojawiac dwa razy pod dwoma naglowkami, bo wtedy
  // dlug wyglada na wiekszy, niz jest, i lista traci wiarygodnosc.
  const ostatnieSlowoIch = wklady
    .filter((w) => w.dojrzaly && w.potwierdzone && w.ostatnieSlowoIch)
    .sort(wgDaty);

  const perOsoba = new Map();
  for (const w of wklady) {
    const p = perOsoba.get(w.autor) || { wkladow: 0, ostatnia: '' };
    p.wkladow++;
    if (w.ostatniaAktywnosc > p.ostatnia) p.ostatnia = w.ostatniaAktywnosc;
    perOsoba.set(w.autor, p);
  }

  const usypiajacy = [...perOsoba.entries()]
    .map(([login, p]) => ({ login, wkladow: p.wkladow, ostatnia: p.ostatnia, dni: dniOd(p.ostatnia, teraz) }))
    .filter((p) => p.dni >= progi.uspienieDni)
    .sort((a, b) => b.dni - a.dni);

  // Retencja liczona z tego, co widac: ilu ludzi wrocilo po drugi wklad.
  // To jest liczba, nie prognoza. Nie mowi nic o tym, DLACZEGO ktos nie
  // wrocil, i nie wolno jej tak uzywac.
  const kontrybutorow = perOsoba.size;
  const powracajacych = [...perOsoba.values()].filter((p) => p.wkladow > 1).length;

  return {
    bezPotwierdzenia,
    ostatnieSlowoIch,
    usypiajacy,
    retencja: { kontrybutorow, powracajacych },
    // JEDYNA liczba, ktora zaklada albo zamyka zgloszenie. Uspienie i
    // retencja sa kontekstem i celowo NIE licza sie do dlugu: kolejka do
    // polowy wypelniona rzeczami, ktorych nie da sie zalatwic, przestaje
    // byc czytana - a to juz kosztowalo ten projekt kolejke `outreach`.
    dlug: bezPotwierdzenia.length + ostatnieSlowoIch.length,
  };
}
