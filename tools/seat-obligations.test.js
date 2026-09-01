import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  slad, ocenObowiazek, raport, wymagaRecenzji, NIEOBSERWOWALNE,
} from './seat-obligations.js';

const OWNER = 'msgwing';
const TERAZ = Date.parse('2026-09-01T19:00:00Z');

// Dane ponizej sa prawdziwe - `gh api repos/msgwing/ZeroSMTP/pulls/<n>` oraz
// `.../reviews` w dniu zbudowania tej bramki. To jest test retrospektywny,
// ktorego ta firma wymaga przy kazdej bramce: gdyby istniala wczesniej, czy
// zlapalaby zdarzenie, ktore ja wymusilo?

const pr = (n, autor, mergedAt, akty = []) => ({
  seat: 'change-board',
  przedmiot: 'PR #' + n,
  trigger: 'scalony',
  wyzwolonyAt: mergedAt,
  terminAt: mergedAt,
  autor,
  akty,
  owner: OWNER,
});

const SZESC = [
  pr(390, 'k4its1t', '2026-08-31T17:11:42Z'),
  pr(394, 'msgwing', '2026-08-31T17:14:33Z'),
  pr(396, 'msgwing', '2026-08-31T17:25:03Z'),
  pr(397, 'msgwing', '2026-08-31T17:35:30Z'),
  pr(399, 'msgwing', '2026-08-31T17:49:04Z'),
  pr(405, 'msgwing', '2026-09-01T18:14:01Z'),
];

test('2026-09-01 retrospektywnie: szesc scalonych PR-ow, zero recenzji - MUSZA zostac zlapane', () => {
  const { zwloki, poEtacie } = raport(SZESC, TERAZ);

  assert.equal(zwloki.length, 6,
    'To jest zdarzenie, ktore wymusilo ta bramke. Wlasciciel policzyl je ' +
    'recznie, bo zaden przyrzad w tej firmie go nie widzial.');
  assert.equal(poEtacie['change-board'], 6);
  assert.deepEqual(zwloki.map((z) => z.przedmiot).sort(),
    ['PR #390', 'PR #394', 'PR #396', 'PR #397', 'PR #399', 'PR #405']);
});

test('#390 od czlowieka z zewnatrz wazy tyle samo - bramka nie patrzy na autora', () => {
  const { zwloki } = raport([SZESC[0]], TERAZ);
  assert.equal(zwloki.length, 1);
  assert.equal(zwloki[0].autor, 'k4its1t',
    'PR z cudzego forka uruchamiany na naszych runnerach nie moze byc ' +
    'traktowany lagodniej niz nasz wlasny.');
});

// Jedyna recenzja w calej historii tego repozytorium (60 sprawdzonych PR-ow)
// jest od bota skanujacego kod. Policzenie jej jako "etat spojrzal" zamieniloby
// te bramke w zielone swiatlo dla dokladnie tej ciszy, ktora ma wykrywac.
//
// Uczciwie o tym, co ten test sprawdza: wyklucza go warunek `login === owner`,
// a nie zadna osobna straz na boty. Zostalo to ustalone celowym zepsuciem -
// po usunieciu OBU straz na boty test dalej przechodzil, wiec straze byly
// martwe i zostaly usuniete. Test zostaje jako test ZACHOWANIA (bot nie liczy
// sie jako spojrzenie), nie jako dowod na istnienie mechanizmu.
test('#331 retrospektywnie: recenzja od bota NIE jest spojrzeniem etatu', () => {
  const o = pr(331, 'msgwing', '2026-08-29T17:13:09Z', [
    { login: 'github-advanced-security[bot]', typ: 'Bot', at: '2026-08-29T12:25:49Z' },
  ]);
  const w = ocenObowiazek(o, TERAZ);
  assert.equal(w.zwloka, true, 'Bot to nie etat.');
  assert.equal(w.akt, null);
});

test('recenzja od nas przed scaleniem - brak zwloki, brak spoznienia', () => {
  const o = pr(500, 'msgwing', '2026-09-01T12:00:00Z', [
    { login: OWNER, typ: 'User', at: '2026-09-01T11:00:00Z' },
  ]);
  const w = ocenObowiazek(o, TERAZ);
  assert.equal(w.zwloka, false);
  assert.equal(w.spozniony, false);
  assert.equal(w.akt.login, OWNER);
});

// "Spojrzal po scaleniu" to nie to samo co "nie spojrzal" i nie to samo co
// "spojrzal". Trzeci stan istnieje, bo bez niego wpis w kolejce nigdy nie
// znika i kolejka przestaje byc kolejka pracy.
test('recenzja po scaleniu - spozniona, ale kolejka sie oczyszcza', () => {
  const o = pr(501, 'msgwing', '2026-09-01T12:00:00Z', [
    { login: OWNER, typ: 'User', at: '2026-09-01T14:00:00Z' },
  ]);
  const w = ocenObowiazek(o, TERAZ);
  assert.equal(w.zwloka, false);
  assert.equal(w.spozniony, true);
  const r = raport([o], TERAZ);
  assert.equal(r.zwloki.length, 0);
  assert.equal(r.spoznione.length, 1);
});

// Karencja: obowiazek z terminem w przyszlosci nie jest jeszcze zwloka.
// Bez tego kazde zgloszenie `do-akceptacji` bylo by breachem w sekundzie,
// w ktorej dostaje etykiete.
test('termin jeszcze nie minal - to nie jest zwloka', () => {
  const o = {
    seat: 'change-board', przedmiot: 'zgloszenie #999', trigger: 'do-akceptacji',
    wyzwolonyAt: '2026-09-01T18:00:00Z',
    terminAt: '2026-09-02T18:00:00Z',
    akty: [], owner: OWNER,
  };
  assert.equal(ocenObowiazek(o, TERAZ).zwloka, false);
  assert.equal(ocenObowiazek(o, Date.parse('2026-09-03T00:00:00Z')).zwloka, true);
});

test('najwczesniejszy akt wygrywa - pytanie brzmi kiedy KTOS PIERWSZY spojrzal', () => {
  const o = pr(502, 'msgwing', '2026-09-01T12:00:00Z', [
    { login: OWNER, typ: 'User', at: '2026-09-01T15:00:00Z' },
    { login: OWNER, typ: 'User', at: '2026-09-01T10:00:00Z' },
  ]);
  assert.equal(ocenObowiazek(o, TERAZ).akt.at, '2026-09-01T10:00:00Z');
  assert.equal(ocenObowiazek(o, TERAZ).spozniony, false);
});

test('slad: obcy login nie jest naszym aktem', () => {
  assert.equal(slad({ login: OWNER, typ: 'User', at: 'x' }, OWNER), true);
  assert.equal(slad({ login: 'k4its1t', typ: 'User', at: 'x' }, OWNER), false);
  assert.equal(slad({ login: 'dependabot[bot]', typ: 'User', at: 'x' }, OWNER), false);
  assert.equal(slad({ login: 'github-actions[bot]', typ: 'Bot', at: 'x' }, OWNER), false);
  // Przypadku `{login: OWNER, typ: 'Bot'}` tu nie ma celowo: nie istnieje.
  // `msgwing` jest kontem czlowieka, a kazdy nasz bot ma wlasny login. Test
  // na stan, ktory nie moze zajsc, wymusza martwy kod w module.
  assert.equal(slad(null, OWNER), false);
  assert.equal(slad({ login: OWNER, typ: 'User' }, OWNER), false);
});

// Zasieg musi byc czescia wyniku, nie przypisem. Raport, ktory milczy
// o etatach spoza zasiegu, klamie przez pominiecie - to jest DOCTRINE §5.
test('lista etatow poza zasiegiem jest niepusta i kazda pozycja ma powod', () => {
  assert.ok(NIEOBSERWOWALNE.length > 0);
  for (const e of NIEOBSERWOWALNE) {
    assert.ok(e.seat && e.powod, 'etat bez powodu jest ozdoba, nie zasiegiem');
  }
});

test('pusta lista obowiazkow to pusty raport, nie wyjatek', () => {
  const r = raport([], TERAZ);
  assert.deepEqual(r.zwloki, []);
  assert.deepEqual(r.spoznione, []);
  assert.deepEqual(r.poEtacie, {});
  assert.deepEqual(raport(undefined, TERAZ).zwloki, []);
});

// Szew dla `change-board`. Testowany jest MECHANIZM konsumpcji, nie tresc
// polityki - tresc nalezy do tamtego etatu i moze sie zmieniac bez ruszania
// tej bramki.
test('bez polityki bramka melduje kazdy scalony PR - domysl w strone halasu', () => {
  assert.equal(wymagaRecenzji({ autor: 'msgwing', etykiety: [] }, null, OWNER), true);
  assert.equal(wymagaRecenzji({ autor: 'k4its1t', etykiety: [] }, undefined, OWNER), true);
});

test('z polityka: etykieta kwalifikuje, jej brak nie', () => {
  const pol = { etykiety: ['ci', 'security'] };
  assert.equal(wymagaRecenzji({ autor: OWNER, etykiety: ['ci'] }, pol, OWNER), true);
  assert.equal(wymagaRecenzji({ autor: OWNER, etykiety: ['docs'] }, pol, OWNER), false);
});

test('z polityka: PR z zewnatrz kwalifikuje sie zawsze, chyba ze wprost wylaczone', () => {
  const pol = { etykiety: [] };
  assert.equal(wymagaRecenzji({ autor: 'k4its1t', etykiety: [] }, pol, OWNER), true,
    '#390 przyszedl z cudzego forka i uruchamial sie na naszych runnerach.');
  assert.equal(
    wymagaRecenzji({ autor: 'k4its1t', etykiety: [] },
      { etykiety: [], zewnetrzniZawsze: false }, OWNER), false);
});
