import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ocenWatek, jestZewnetrzny } from './unanswered-external.js';

const OWNER = 'msgwing';
const ACK = 'Ten komentarz zostal dodany automatycznie';

// Dane ponizej sa prawdziwe - pobrane z `gh issue view 265 --json ...` w dniu
// naprawy. To jest retrospektywny test wymagany przy tej zmianie: gdyby ta
// bramka istniala wczesniej, czy zlapalaby #265?

test('#265 retrospektywnie: stan sprzed odpowiedzi wlasciciela - MUSI zostac zlapane', () => {
  const watek = {
    number: 265,
    user: { login: 'msgwing', type: 'User' },     // zgloszenie otworzyl WLASCICIEL
    created_at: '2026-08-23T12:33:41Z',
  };
  const komentarze = [
    { user: { login: 'k4its1t', type: 'User' }, created_at: '2026-08-24T09:57:16Z', body: '...' },
    { user: { login: 'k4its1t', type: 'User' }, created_at: '2026-08-24T09:59:37Z', body: '...' },
    // Zero komentarzy od wlasciciela w tym oknie - dokladnie stan trwajacy
    // od 2026-08-24 09:59 do 2026-08-30 15:39 (szesc dni).
  ];

  const wynik = ocenWatek(watek, komentarze, [], OWNER, ACK);

  assert.equal(
    wynik.czeka, true,
    'Stara logika ("czy autor ZGLOSZENIA jest z zewnatrz") przegapila #265 ' +
    'przez 6 dni, bo zgloszenie otworzyl wlasciciel. Ta bramka patrzy na ' +
    'OSTATNI komentarz, nie na autora zgloszenia.');
  assert.equal(wynik.ostatniZewnetrzny.autor, 'k4its1t');
});

test('#265 retrospektywnie: po prawdziwej odpowiedzi wlasciciela - rozwiazane', () => {
  const watek = {
    number: 265,
    user: { login: 'msgwing', type: 'User' },
    created_at: '2026-08-23T12:33:41Z',
  };
  const komentarze = [
    { user: { login: 'k4its1t', type: 'User' }, created_at: '2026-08-24T09:57:16Z', body: '...' },
    { user: { login: 'k4its1t', type: 'User' }, created_at: '2026-08-24T09:59:37Z', body: '...' },
    { user: { login: 'msgwing', type: 'User' }, created_at: '2026-08-30T15:39:14Z', body: '...' },
  ];

  const wynik = ocenWatek(watek, komentarze, [], OWNER, ACK);

  assert.equal(wynik.czeka, false, 'ostatni komentarz jest teraz nasz - nic nie czeka');
});

test('zepsute celowo: druga wiadomosc po naszej JEDYNEJ odpowiedzi - stara logika ("czy KIEDYKOLWIEK odpowiedzielismy") mylila sie tutaj tak samo jak w #265', () => {
  const watek = {
    number: 999,
    user: { login: 'ktos-z-zewnatrz', type: 'User' },
    created_at: '2026-08-01T00:00:00Z',
  };
  const komentarze = [
    { user: { login: OWNER, type: 'User' }, created_at: '2026-08-01T01:00:00Z', body: 'odpowiedz' },
    { user: { login: 'ktos-z-zewnatrz', type: 'User' }, created_at: '2026-08-10T00:00:00Z', body: 'a co z tym drugim pytaniem?' },
  ];

  const wynik = ocenWatek(watek, komentarze, [], OWNER, ACK);

  assert.equal(
    wynik.czeka, true,
    'druga wiadomosc, zadana po naszej jedynej odpowiedzi, zostaje bez ' +
    'odpowiedzi - "odpowiedzielismy kiedykolwiek" nie jest tym samym co ' +
    '"odpowiedzielismy na to ostatnie".');
});

test('wlasny automatyczny komentarz potwierdzajacy nie liczy sie jako odpowiedz, ale nie dubluje sie', () => {
  const watek = {
    number: 1,
    user: { login: 'ktos-z-zewnatrz', type: 'User' },
    created_at: '2026-08-01T00:00:00Z',
  };
  const komentarze = [
    {
      user: { login: 'github-actions[bot]', type: 'Bot' },
      created_at: '2026-08-01T05:00:00Z',
      body: ACK + ' po 4 godzinach bez odpowiedzi z naszej strony.',
    },
  ];

  const wynik = ocenWatek(watek, komentarze, [], OWNER, ACK);

  assert.equal(wynik.czeka, true, 'potwierdzenie to nie odpowiedz - watek nadal czeka na prawdziwa');
  assert.equal(wynik.jujAcked, true, 'ale juz raz potwierdzone - nie trzeba dublowac komentarza');
});

test('bot niebedacy naszym potwierdzeniem (np. dependabot) nie liczy sie ani jako odpowiedz, ani jako czlowiek z zewnatrz', () => {
  const watek = {
    number: 2,
    user: { login: OWNER, type: 'User' },
    created_at: '2026-08-01T00:00:00Z',
  };
  const komentarze = [
    { user: { login: 'dependabot[bot]', type: 'Bot' }, created_at: '2026-08-02T00:00:00Z', body: 'Superseded by #3.' },
  ];

  const wynik = ocenWatek(watek, komentarze, [], OWNER, ACK);

  assert.equal(wynik.czeka, false, 'zaden prawdziwy czlowiek z zewnatrz nic tu nie napisal');
});

test('recenzja PR-a (bez zwyklego komentarza) liczy sie jako nasza odpowiedz', () => {
  const watek = {
    number: 3,
    user: { login: 'kontrybutor', type: 'User' },
    created_at: '2026-08-01T00:00:00Z',
    pull_request: {},
  };
  const recenzje = [{ user: { login: OWNER, type: 'User' }, submitted_at: '2026-08-01T06:00:00Z' }];

  const wynik = ocenWatek(watek, [], recenzje, OWNER, ACK);

  assert.equal(wynik.czeka, false);
});

test('jestZewnetrzny odrzuca wlasciciela i boty, przyjmuje prawdziwych ludzi', () => {
  assert.equal(jestZewnetrzny(OWNER, 'User', OWNER), false);
  assert.equal(jestZewnetrzny('cos[bot]', 'User', OWNER), false);
  assert.equal(jestZewnetrzny('ktos', 'Bot', OWNER), false);
  assert.equal(jestZewnetrzny('k4its1t', 'User', OWNER), true);
});

test('brak jakiejkolwiek aktywnosci od zewnetrznego czlowieka - nic nie czeka', () => {
  const watek = {
    number: 4,
    user: { login: OWNER, type: 'User' },
    created_at: '2026-08-01T00:00:00Z',
  };
  const wynik = ocenWatek(watek, [], [], OWNER, ACK);
  assert.equal(wynik.czeka, false);
});
