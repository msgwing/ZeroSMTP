import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ocenWklad, ocenOpieke, jestNaszymSlowem, PROGI } from './contributor-care.js';

const OWNER = 'msgwing';
const ACK = 'Ten komentarz zostal dodany automatycznie';

// TERAZ ustawione na chwile pomiaru, zeby wieki liczyly sie tak jak wtedy.
const TERAZ = new Date('2026-09-01T19:00:00Z').getTime();

// Dane ponizej sa PRAWDZIWE - odczytane 2026-09-01 przez
//   gh api repos/msgwing/ZeroSMTP/issues/<n>/comments
//   gh api repos/msgwing/ZeroSMTP/pulls/<n>/reviews
// dla wszystkich 14 scalonych wnioskow od ludzi z zewnatrz. Tresci sa
// skrocone do dlugosci, bo liczy sie tylko kto i kiedy, oraz czy tresc byla
// niepusta.
const k = (login, at, body) => ({ user: { login, type: 'User' }, created_at: at, body });
const r = (login, at, state, body) => ({ user: { login, type: 'User' }, submitted_at: at, state, body });
const pr = (numer, autor, utworzony, scalony, tytul) => ({
  number: numer,
  title: tytul || 'x',
  user: { login: autor, type: 'User' },
  created_at: utworzony,
  merged_at: scalony,
  pull_request: {},
});

test('#238: scalony 9 dni temu, ZERO komentarzy i ZERO recenzji - dlug', () => {
  const w = ocenWklad(
    pr(238, 'Mohitingale13', '2026-08-23T10:08:28Z', '2026-08-23T12:22:19Z'),
    [], [], OWNER, ACK, TERAZ);

  assert.equal(w.potwierdzone, false,
    'Praca zostala przyjeta i nikt nie powiedzial ani slowa. Ten wklad byl ' +
    'niewidoczny dla kazdego dotychczasowego przegladu, bo scalony PR jest ' +
    'zamkniety, a `czeka-czlowiek` pyta wylacznie o state:open.');
  assert.equal(w.dojrzaly, true);
  assert.equal(w.dniOdScalenia, 9);
});

test('#245: drugi taki sam przypadek tego samego dnia', () => {
  const w = ocenWklad(
    pr(245, 'Mohitingale13', '2026-08-23T10:21:58Z', '2026-08-23T12:24:47Z'),
    [], [], OWNER, ACK, TERAZ);
  assert.equal(w.potwierdzone, false);
});

test('#83 @slegarraga: sama recenzja z trescia, zero komentarzy - NIE dlug', () => {
  const w = ocenWklad(
    pr(83, 'slegarraga', '2026-08-06T05:49:29Z', '2026-08-11T18:28:53Z'),
    [],
    [
      r('msgwing', '2026-08-09T11:56:06Z', 'CHANGES_REQUESTED', 'x'.repeat(3156)),
      r('msgwing', '2026-08-11T18:17:06Z', 'APPROVED', 'x'.repeat(139)),
      r('msgwing', '2026-08-11T18:28:50Z', 'APPROVED', 'x'.repeat(100)),
    ],
    OWNER, ACK, TERAZ);

  assert.equal(w.potwierdzone, true,
    'Bramka liczaca wylacznie komentarze zglosilaby trzy wklady tego ' +
    'czlowieka jako niepotwierdzone. Recenzja z trescia jest rozmowa.');
  assert.equal(w.ostatnieSlowoIch, false);
});

test('pusta akceptacja NIE jest slowem do czlowieka', () => {
  const w = ocenWklad(
    pr(999, 'ktos', '2026-08-01T00:00:00Z', '2026-08-01T01:00:00Z'),
    [], [r('msgwing', '2026-08-01T02:00:00Z', 'APPROVED', '')],
    OWNER, ACK, TERAZ);
  assert.equal(w.potwierdzone, false,
    'APPROVED bez tresci to mechanika scalania, nie podziekowanie.');
});

test('#362 @lesbass: jedyny komentarz jest od INNEGO kontrybutora, nie od nas', () => {
  const w = ocenWklad(
    pr(362, 'lesbass', '2026-08-30T10:42:24Z', '2026-08-30T12:07:20Z'),
    [k('Mohitingale13', '2026-08-30T11:54:08Z', 'x'.repeat(747))],
    [], OWNER, ACK, TERAZ);

  assert.equal(w.potwierdzone, false,
    'Watek ma komentarz, wiec z listy "0 komentarzy" wypadal. Ale ten ' +
    'komentarz napisal inny czlowiek z zewnatrz - @lesbass nie uslyszal od ' +
    'nas niczego.');
  assert.equal(w.ostatnieSlowoIch, true);
  assert.equal(w.ostatniZewnetrzny.autor, 'Mohitingale13');
});

test('#369: ostatnie slowo autora, zero slow od nas', () => {
  const w = ocenWklad(
    pr(369, 'Mohitingale13', '2026-08-30T12:27:39Z', '2026-08-30T14:54:06Z'),
    [k('Mohitingale13', '2026-08-30T12:29:49Z', 'x'.repeat(370))],
    [], OWNER, ACK, TERAZ);
  assert.equal(w.potwierdzone, false);
  assert.equal(w.ostatnieSlowoIch, true);
});

test('#300: rozmawialismy, ale ostatnie slowo zostalo jego', () => {
  const w = ocenWklad(
    pr(300, 'Mohitingale13', '2026-08-26T05:33:00Z', '2026-08-26T21:15:29Z'),
    [
      k('msgwing', '2026-08-26T21:15:26Z', 'x'.repeat(1810)),
      k('Mohitingale13', '2026-08-27T18:12:17Z', 'x'.repeat(865)),
      k('msgwing', '2026-08-30T10:02:59Z', 'x'.repeat(1734)),
      k('Mohitingale13', '2026-08-30T11:27:08Z', 'x'.repeat(281)),
      k('msgwing', '2026-08-30T11:51:01Z', 'x'.repeat(337)),
      k('Mohitingale13', '2026-08-30T12:34:02Z', 'x'.repeat(448)),
    ],
    [], OWNER, ACK, TERAZ);

  assert.equal(w.potwierdzone, true, 'Podziekowanie bylo.');
  assert.equal(w.ostatnieSlowoIch, true, 'A mimo to ostatnie slowo jest jego.');
});

test('#390 @k4its1t: retrospektywnie - przed podziekowaniem dlug, po nim nie', () => {
  const wniosek = pr(390, 'k4its1t', '2026-08-31T11:51:11Z', '2026-08-31T17:11:42Z');

  // Stan przez pierwsze 25 godzin po scaleniu: zero komentarzy.
  const przed = ocenWklad(wniosek, [], [], OWNER, ACK,
    new Date('2026-09-01T18:00:00Z').getTime());
  assert.equal(przed.dojrzaly, true,
    'Doba minela, wiec ta bramka upomnialaby sie o #390 zanim ktokolwiek ' +
    'zauwazyl go recznie.');
  assert.equal(przed.potwierdzone, false);

  const po = ocenWklad(wniosek,
    [
      k('msgwing', '2026-09-01T18:23:49Z', 'x'.repeat(1484)),
      k('msgwing', '2026-09-01T18:25:38Z', 'x'.repeat(1235)),
    ],
    [], OWNER, ACK, TERAZ);
  assert.equal(po.potwierdzone, true);
  assert.equal(po.ostatnieSlowoIch, false);
});

test('swiezo scalony wklad nie jest jeszcze dlugiem', () => {
  const w = ocenWklad(
    pr(500, 'ktos', '2026-09-01T16:00:00Z', '2026-09-01T17:00:00Z'),
    [], [], OWNER, ACK, TERAZ);
  assert.equal(w.dojrzaly, false,
    'Dwie godziny po scaleniu ktos wlasnie pisze odpowiedz. Bramka, ktora ' +
    'krzyczy natychmiast, uczy zeby jej nie czytac.');
});

test('wlasne automatyczne potwierdzenie nie zamyka dlugu', () => {
  assert.equal(jestNaszymSlowem(OWNER, ACK + ' po 4 godzinach', OWNER, ACK), false);
  assert.equal(jestNaszymSlowem(OWNER, 'Dziekujemy, to pierwszy raport dla tej wersji.', OWNER, ACK), true);
  assert.equal(jestNaszymSlowem('Mohitingale13', 'dzieki!', OWNER, ACK), false);
});

// --- Caly stan repozytorium, zmierzony 2026-09-01 ---------------------------
// Wszystkie 14 scalonych wnioskow od ludzi z zewnatrz. Zapytanie, ktore je
// wylonilo (i ktorego wynik zgadza sie co do numeru z niezaleznym
// `gh pr list --state merged`):
//   gh api -X GET search/issues -f q='repo:msgwing/ZeroSMTP is:pr is:merged
//     -author:msgwing -author:app/dependabot'

const WSZYSTKIE = [
  [pr(83, 'slegarraga', '2026-08-06T05:49:29Z', '2026-08-11T18:28:53Z'), [],
    [r('msgwing', '2026-08-09T11:56:06Z', 'CHANGES_REQUESTED', 'x'.repeat(3156)),
     r('msgwing', '2026-08-11T18:28:50Z', 'APPROVED', 'x'.repeat(100))]],
  [pr(84, 'slegarraga', '2026-08-06T15:52:48Z', '2026-08-11T19:07:06Z'),
    [k('msgwing', '2026-08-11T18:20:02Z', 'x'.repeat(979))],
    [r('msgwing', '2026-08-11T19:07:03Z', 'APPROVED', 'x'.repeat(430))]],
  [pr(85, 'slegarraga', '2026-08-06T16:18:41Z', '2026-08-11T18:17:04Z'),
    [k('msgwing', '2026-08-29T12:00:06Z', 'x'.repeat(1210))],
    [r('msgwing', '2026-08-11T18:17:00Z', 'APPROVED', 'x'.repeat(139))]],
  [pr(223, 'Mohitingale13', '2026-08-22T18:01:22Z', '2026-08-23T09:39:21Z'),
    [k('msgwing', '2026-08-23T09:28:28Z', 'x'.repeat(1683))], []],
  [pr(230, 'Mohitingale13', '2026-08-22T18:50:28Z', '2026-08-23T09:41:49Z'),
    [k('msgwing', '2026-08-23T09:43:18Z', 'x'.repeat(1269))], []],
  [pr(238, 'Mohitingale13', '2026-08-23T10:08:28Z', '2026-08-23T12:22:19Z'), [], []],
  [pr(245, 'Mohitingale13', '2026-08-23T10:21:58Z', '2026-08-23T12:24:47Z'), [], []],
  [pr(252, 'Mohitingale13', '2026-08-23T10:54:01Z', '2026-08-23T12:26:36Z'),
    [k('msgwing', '2026-08-23T12:27:05Z', 'x'.repeat(1426)),
     k('Mohitingale13', '2026-08-23T13:32:53Z', 'x'.repeat(536)),
     k('msgwing', '2026-08-25T19:43:19Z', 'x'.repeat(1786))], []],
  [pr(300, 'Mohitingale13', '2026-08-26T05:33:00Z', '2026-08-26T21:15:29Z'),
    [k('msgwing', '2026-08-26T21:15:26Z', 'x'.repeat(1810)),
     k('Mohitingale13', '2026-08-30T12:34:02Z', 'x'.repeat(448))], []],
  [pr(310, 'TrueFurina', '2026-08-27T16:45:35Z', '2026-08-27T19:32:41Z'),
    [k('msgwing', '2026-08-27T19:07:15Z', 'x'.repeat(1690))], []],
  [pr(362, 'lesbass', '2026-08-30T10:42:24Z', '2026-08-30T12:07:20Z'),
    [k('Mohitingale13', '2026-08-30T11:54:08Z', 'x'.repeat(747))], []],
  [pr(368, 'Mohitingale13', '2026-08-30T12:16:19Z', '2026-08-30T14:52:12Z'), [], []],
  [pr(369, 'Mohitingale13', '2026-08-30T12:27:39Z', '2026-08-30T14:54:06Z'),
    [k('Mohitingale13', '2026-08-30T12:29:49Z', 'x'.repeat(370))], []],
  [pr(390, 'k4its1t', '2026-08-31T11:51:11Z', '2026-08-31T17:11:42Z'),
    [k('msgwing', '2026-09-01T18:23:49Z', 'x'.repeat(1484))], []],
];

const oceny = () => WSZYSTKIE.map(
  ([w, kom, rec]) => ocenWklad(w, kom, rec, OWNER, ACK, TERAZ));

test('stan zastany: PIEC wkladow bez ani jednego slowa od nas', () => {
  const o = ocenOpieke(oceny(), TERAZ);

  assert.deepEqual(o.bezPotwierdzenia.map((w) => w.numer), [238, 245, 362, 368, 369],
    'Brief opisujacy to zadanie wymienial jeden zalegly wklad (#368). ' +
    'Recznie znaleziono drugi (#390). Bramka znajduje piec, najstarsze ' +
    'czekaja dziewiec dni - i wszystkie piec byly widoczne przez caly czas ' +
    'dla kazdego, kto zapytalby o rzeczy ZAMKNIETE.');

  assert.deepEqual(o.ostatnieSlowoIch.map((w) => w.numer), [300],
    'Watki, gdzie rozmowa byla, ale ostatnie zdanie zostalo ich. ' +
    '#362 i #369 nie dubluja sie tutaj - sa juz wyzej.');

  assert.equal(o.dlug, 6);
});

test('retencja: 2 z 5 kontrybutorow wrocilo po drugi wklad', () => {
  const o = ocenOpieke(oceny(), TERAZ);
  assert.deepEqual(o.retencja, { kontrybutorow: 5, powracajacych: 2 });
});

test('uspienie: @slegarraga cichnie od 26 dni i jest jedyny', () => {
  const o = ocenOpieke(oceny(), TERAZ);
  assert.deepEqual(o.usypiajacy.map((p) => [p.login, p.dni]), [['slegarraga', 26]],
    'Liczone od jego OSTATNIEJ wlasnej czynnosci (2026-08-06), nie od ' +
    'naszego scalenia (2026-08-11). Roznica to piec dni.');
});

test('uspienie i retencja NIE podnosza dlugu', () => {
  // Tylko czyste wklady: wszystko potwierdzone, ostatnie slowo nasze,
  // ale autor milczy od pol roku.
  const stary = ocenWklad(
    pr(1, 'ktos-dawny', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
    [k('msgwing', '2026-01-02T01:00:00Z', 'dziekujemy')], [], OWNER, ACK, TERAZ);

  const o = ocenOpieke([stary], TERAZ);
  assert.equal(o.usypiajacy.length, 1, 'Uspienie widac...');
  assert.equal(o.dlug, 0,
    '...ale dlug jest zerowy, wiec zgloszenie sie NIE zaklada. Prog ' +
    'uspienia jest nieskalibrowany (n=2 odstepy od jednej osoby), a kolejka ' +
    'z pozycjami, ktorych nie da sie zalatwic, przestaje byc czytana.');
});

test('czysty stan: zero dlugu, kolejka do zamkniecia', () => {
  const czysty = ocenWklad(
    pr(2, 'ktos', '2026-08-30T00:00:00Z', '2026-08-30T01:00:00Z'),
    [k('msgwing', '2026-08-30T02:00:00Z', 'dziekujemy, to pierwszy taki raport')],
    [], OWNER, ACK, TERAZ);
  const o = ocenOpieke([czysty], TERAZ);
  assert.equal(o.dlug, 0);
  assert.equal(o.bezPotwierdzenia.length, 0);
  assert.equal(o.ostatnieSlowoIch.length, 0);
});

test('progi sa jawne i nie zmienily sie po cichu', () => {
  assert.equal(PROGI.potwierdzenieH, 24);
  assert.equal(PROGI.uspienieDni, 21);
});
