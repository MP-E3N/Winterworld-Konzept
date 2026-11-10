// @ts-check
/**
 * bergen.js — Bergungstrupps arbeiten an Fundstellen oder nehmen Abgeworfenes wieder auf (ein Tick).
 *
 * ZWECK:    Jeder Trupp mit Auftrag schafft pro Tick so viel Arbeit, wie er Leute hat. Ist ein Stück
 *           fertig (z. B. 500 kg Kohle), kommt es ins passende Lager (sim/koloss/lager.js zielLager)
 *           und wird vom Ziel abgezogen. Fährt der Koloss los oder ist das Ziel außer Reichweite,
 *           kehrt der Trupp zurück; ist es leer oder das Lager voll, ebenfalls.
 *           Ziele: Fundstellen aus dem Seed (trupp.fund) oder Abwürfe (trupp.abwurf, Spieltest M4a).
 * LIEST:    state.trupps, state.kolosse, state.geborgen, state.abwuerfe, Fundstellen aus dem Seed
 * SCHREIBT: trupp.fund/.abwurf/.fortschritt, Lager des Kolosses, state.geborgen, abwurf.kg
 * REGEL:    docs/specs/M3-fundstellen.md, CLAUDE.md Regeln 3+5 (Ganzzahlen, feste Reihenfolge)
 * DEBUG:    F3 zeigt den Trupp. `ek.funde()` zeigt, was in den Fundstellen noch liegt.
 *           Tests: tests/bergen.test.js, tests/lager.test.js.
 */

import { fundstelleMitId } from './welt/fundstellen.js';
import { kolossSteht, inReichweite, fundRest } from './abfragen.js';
import { zielLager, lagerFrei, einlagern } from './koloss/lager.js';
import { FUNDARTEN, ABWURF_ARBEIT_PROZENT } from '../data/fundstellen.js';
import { teile } from './lib/winkel.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Trupp} Trupp */

/**
 * Woran ein Trupp gerade arbeitet — Fundstelle oder Abwurf, auf dieselbe Form gebracht.
 * @typedef {{x: number, y: number, ware: string, stueckKg: number, arbeit: number, rest: number, abziehen: (kg: number) => void}} Ziel
 */

/**
 * Ein Tick Bergen für alle Trupps (in ID-Reihenfolge).
 * @param {Zustand} state
 */
export function bergenSchritt(state) {
  for (const t of state.trupps) {
    if (t.fund < 0 && t.abwurf < 0) continue;
    const k = state.kolosse[t.koloss];
    const z = truppZiel(state, t);
    // Nutzerentscheidung M3: nur im Stand. Wer losfährt, lässt den Trupp nicht draußen stehen.
    if (!z || !kolossSteht(k) || !inReichweite(k, z.x, z.y)) { zurueck(t); continue; }
    const lager = zielLager(k, z.ware);
    if (z.rest <= 0 || lagerFrei(k, lager) < Math.min(z.stueckKg, z.rest)) { zurueck(t); continue; }

    t.fortschritt += t.leute;
    if (t.fortschritt < z.arbeit) continue;
    // Ein Stück ist fertig: ins Lager damit.
    t.fortschritt = 0;
    const stueck = Math.min(z.stueckKg, z.rest);
    einlagern(k, lager, z.ware, stueck);
    z.abziehen(stueck);
    if (z.rest - stueck <= 0 || lagerFrei(k, lager) < Math.min(z.stueckKg, z.rest - stueck)) zurueck(t);
  }
}

/**
 * Das Ziel eines Trupps (oder null, wenn es das nicht mehr gibt).
 * @param {Zustand} state
 * @param {Trupp} t
 * @returns {Ziel | null}
 */
export function truppZiel(state, t) {
  if (t.abwurf >= 0) {
    const a = state.abwuerfe[t.abwurf];
    if (!a) return null;
    const art = FUNDARTEN.find((f) => f.ware === a.ware) ?? FUNDARTEN[0];
    return {
      x: a.x, y: a.y, ware: a.ware, stueckKg: art.stueckKg, arbeit: teile(art.arbeit * ABWURF_ARBEIT_PROZENT, 100), rest: a.kg,
      abziehen: (kg) => { a.kg -= kg; },
    };
  }
  const f = fundstelleMitId(state.seed, t.fund);
  if (!f) return null;
  const art = FUNDARTEN[f.art];
  return {
    x: f.x, y: f.y, ware: art.ware, stueckKg: art.stueckKg, arbeit: art.arbeit, rest: fundRest(state, f),
    abziehen: (kg) => restSetzen(state, f.id, fundRest(state, f) - kg),
  };
}

/**
 * Trupp kehrt an Bord zurück (wartet). Ein halb fertiges Stück ist verloren.
 * @param {Trupp} t
 */
function zurueck(t) {
  t.fund = -1;
  t.abwurf = -1;
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
