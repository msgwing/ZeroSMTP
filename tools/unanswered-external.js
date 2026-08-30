// Decyduje, czy watek (issue albo PR) czeka teraz na PRAWDZIWA odpowiedz
// kogos z naszej strony (`owner` = login wlasciciela repo, ktorym dziala caly
// zespol). Wydzielone z .github/workflows/ready-for-approval.yml, zeby dalo
// sie to przetestowac raz (`tools/unanswered-external.test.js`), zamiast
// ufac logice sklejonej wewnatrz YAML.
//
// Mechanika naprawiona 2026-08-30, patrz #265: stara wersja pytala
// "czy AUTOR ZGLOSZENIA jest czlowiekiem z zewnatrz, i czy KIEDYKOLWIEK
// odpowiedzielismy gdziekolwiek w tym watku". #265 zostalo otwarte przez
// wlasciciela (`msgwing`), wiec nie przechodzilo nawet pierwszego warunku -
// mimo ze ostatni komentarz, od prawdziwego czlowieka z zewnatrz
// (`k4its1t`, authorAssociation: NONE), czekal 6 dni bez odpowiedzi.
//
// Wlasciwe pytanie brzmi: kto napisal OSTATNIA rzecz w tym watku - my, czy
// ktos z zewnatrz - niezaleznie od tego, kto go otworzyl i czy odpowiadalismy
// wczesniej.

export function jestZewnetrzny(login, typ, owner) {
  if (!login) return false;
  if (login === owner) return false;
  if (typ === 'Bot') return false;
  if (/\[bot\]$/.test(login)) return false;
  return true;
}

/**
 * @param {{number:number, user:{login:string,type:string}, created_at:string, pull_request?:object}} watek
 * @param {Array<{user:{login:string,type:string}, created_at:string, body:string}>} komentarze
 * @param {Array<{user:{login:string,type:string}, submitted_at:string}>} recenzje - tylko PR-y; puste dla issue
 * @param {string} owner - login wlasciciela repo
 * @param {string} ackMarker - fragment tekstu wlasnego automatycznego
 *   potwierdzenia; taki komentarz nie liczy sie jako prawdziwa odpowiedz,
 *   zeby watek nie zostal cichaczem uznany za zalatwiony przez wlasny bot
 * @returns {{czeka:boolean, ostatniZewnetrzny:({at:string,autor:string}|null), ostatniNasz:(string|null), jujAcked:boolean}}
 */
export function ocenWatek(watek, komentarze, recenzje, owner, ackMarker) {
  let ostatniZewnetrzny = jestZewnetrzny(
    watek.user && watek.user.login, watek.user && watek.user.type, owner)
    ? { at: watek.created_at, autor: watek.user.login }
    : null;
  let ostatniNasz = null;
  let ostatniAck = null;

  for (const k of komentarze || []) {
    const login = k.user && k.user.login;
    const typ = k.user && k.user.type;
    if (login === owner) {
      if (!ostatniNasz || k.created_at > ostatniNasz) ostatniNasz = k.created_at;
    } else if (jestZewnetrzny(login, typ, owner)) {
      if (!ostatniZewnetrzny || k.created_at > ostatniZewnetrzny.at) {
        ostatniZewnetrzny = { at: k.created_at, autor: login };
      }
    } else if ((typ === 'Bot' || /\[bot\]$/.test(login)) &&
               (k.body || '').includes(ackMarker)) {
      if (!ostatniAck || k.created_at > ostatniAck) ostatniAck = k.created_at;
    }
  }

  // Recenzja PR-a (zatwierdzenie, prosba o zmiany, komentarz recenzyjny) jest
  // odpowiedzia tak samo jak zwykly komentarz - GitHub liczy je osobno.
  for (const r of recenzje || []) {
    if (r.user && r.user.login === owner && r.submitted_at) {
      if (!ostatniNasz || r.submitted_at > ostatniNasz) ostatniNasz = r.submitted_at;
    }
  }

  const czeka = !!ostatniZewnetrzny &&
    (!ostatniNasz || ostatniZewnetrzny.at > ostatniNasz);
  const jujAcked = czeka && !!ostatniAck && ostatniAck > ostatniZewnetrzny.at;

  return { czeka, ostatniZewnetrzny, ostatniNasz, jujAcked };
}
