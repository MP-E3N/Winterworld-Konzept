// @ts-check
/**
 * bergen.js — Bergungstrupps arbeiten an Fundstellen (ein Tick).
 *
 * ZWECK:    Jeder Trupp mit Auftrag schafft pro Tick so viel Arbeit, wie er Leute hat. Ist ein Stück
 *           fertig (z. B. 500 kg Kohle), kommt es in den Laderaum und wird von der Fundstelle
 *           abgezogen. Fährt der Koloss los oder ist die Fundstelle außer Reichweite, kehrt der Trupp
 *           zurück; ist sie leer oder der Laderaum voll, ebenfalls.
 * LIEST:    state.trupps, state.kolosse, state.geborgen, Fundstellen aus dem Seed, data/fundstellen.js
 * SCHREIBT: trupp.fund, trupp.fortschritt, koloss.ladung, state.geborgen
 * REGEL:    docs/specs/M3-fundstellen.md, CLAUDE.md Regeln 3+5 (Ganzzahlen, feste Reihenfolge)
 * DEBUG:    F3 zeigt den Trupp. `ek.funde()` zeigt, was in den Fundstellen noch liegt.
 *           Tests: tests/bergen.test.js.
 */

import { fundstelleMitId } from './welt/fundstellen.js';
import { kolossSteht, inReichweite, fundRest, ladungFrei } from './abfragen.js';
import { FUNDARTEN } from '../data/fundstellen.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Trupp} Trupp */

/**
 * Ein Tick Bergen für alle Trupps (in ID-Reihenfolge).
 * @param {Zustand} state
 */
export function bergenSchritt(state) {
  for (const t of state.trupps) {
    if (t.fund < 0) continue;
    const k = state.kolosse[t.koloss];
    const f = fundstelleMitId(state.seed, t.fund);
    // Nutzerentscheidung M3: nur im Stand. Wer losfährt, lässt den Trupp nicht draußen stehen.
    if (!f || !kolossSteht(k) || !inReichweite(k, f.x, f.y)) { zurueck(t); continue; }
    const art = FUNDARTEN[f.art];
    const rest = fundRest(state, f);
    if (rest <= 0 || ladungFrei(k) < art.stueckKg) { zurueck(t); continue; }

    t.fortschritt += t.leute;
    if (t.fortschritt < art.arbeit) continue;
    // Ein Stück ist fertig: in den Laderaum damit.
    t.fortschritt = 0;
    const stueck = Math.min(art.stueckKg, rest);
    k.ladung[art.ware] += stueck;
    restSetzen(state, f.id, rest - stueck);
    if (rest - stueck <= 0 || ladungFrei(k) < art.stueckKg) zurueck(t);
  }
}

/**
 * Trupp kehrt an Bord zurück (wartet). Ein halb fertiges Stück ist verloren.
 * @param {Trupp} t
 */
function zurueck(t) {
  t.fund = -1;
  t.fortschritt = 0;
}

/**
 * Trägt den neuen Rest einer Fundstelle in die Änderungsliste ein.
 * WARUM Liste statt Objekt mit ID als Schlüssel: Listen haben im JSON eine feste Reihenfolge,
 * und der Hash ist kanonisch — so bleibt der Zustand auf allen Rechnern gleich.
 * @param {Zustand} state
 * @param {number} fund  ID
 * @param {number} rest  kg
 */
function restSetzen(state, fund, rest) {
  for (const g of state.geborgen) {
    if (g.fund === fund) { g.rest = rest; return; }
  }
  state.geborgen.push({ fund, rest });
}
