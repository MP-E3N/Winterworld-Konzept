// @ts-check
/**
 * befehle-siedlung.js — Befehle in der Siedlung: EINLAGERN, AUSLAGERN (Depot) und CREW (anheuern/absetzen).
 *
 * ZWECK:    Teil von sim/befehle.js (dort ruft befehlPruefen/befehlAnwenden diese Funktionen auf).
 *           Nutzerentscheidung M4d: Die Siedlung ist ein Depot ohne Tausch; Leute lassen sich ersetzen
 *           und über die Startzahl hinaus anheuern (bis zu den Kojen). Alles nur im Stand in der Siedlung.
 * LIEST:    Koloss (Lage, Lager, Crew), state.depots
 * SCHREIBT: Lager (über sim/koloss/lager.js einlagern), Depot (über sim/siedlung.js depotBuchen), k.crew
 * REGEL:    docs/specs/M4d-siedlung.md, CLAUDE.md Regel 1
 * DEBUG:    Abgelehnte Befehle stehen mit Grund in der Konsole. Tests: tests/siedlung.test.js.
 */

import { siedlungImStand, depotMenge, depotBuchen } from './siedlung.js';
import { lagerMenge, lagerFrei, passtIns, einlagern } from './koloss/lager.js';
import { ganzImBereich } from './befehle-lager.js';
import { LAGER } from '../data/fundstellen.js';
import { KOJEN } from '../data/siedlungen.js';
import { VOLL } from '../data/crew.js';
import { teile } from './lib/winkel.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Koloss} Koloss */
/** @typedef {import('./types.js').Befehl} Befehl */

const SIEDLUNG_ARTEN = ['EINLAGERN', 'AUSLAGERN', 'CREW'];
const GRUPPEN = ['heizer', 'arbeiter'];

/**
 * Gehört der Befehl hierher?
 * @param {Befehl} b
 * @returns {boolean}
 */
export function istSiedlungsBefehl(b) {
  return SIEDLUNG_ARTEN.includes(b.art);
}

/**
 * Prüft einen Siedlungs-Befehl.
 * @param {Zustand} state @param {Befehl} b @param {Koloss} k
 * @returns {string | null}
 */
export function siedlungsBefehlPruefen(state, b, k) {
  const s = siedlungImStand(k);
  if (s < 0) return 'nicht im Stand in einer Siedlung';
  if (b.art === 'EINLAGERN' || b.art === 'AUSLAGERN') {
    if (!ganzImBereich(b.lager, 0, LAGER.length - 1) || !passtIns(b.lager, b.ware)) return 'Ware gehört nicht in dieses Lager';
    if (b.art === 'EINLAGERN') {
      return ganzImBereich(b.kg, 1, lagerMenge(k, b.lager, b.ware)) ? null : 'so viel ist nicht an Bord';
    }
    if (!ganzImBereich(b.kg, 1, depotMenge(state, s, b.spieler, b.ware))) return 'so viel ist nicht im Depot';
    return lagerFrei(k, b.lager) >= b.kg ? null : 'Lager voll';
  }
  if (b.art === 'CREW') {
    if (!GRUPPEN.includes(b.gruppe)) return 'unbekannte Gruppe';
    const leute = k.crew.heizer + k.crew.arbeiter + k.crew.passagiere;
    if (b.anzahl === 1) return leute < KOJEN ? null : 'alle Kojen belegt';
    if (b.anzahl === -1) {
      if (k.crew[b.gruppe] <= 0) return 'niemand in dieser Gruppe';
      return k.crew.heizer + k.crew.arbeiter > 1 ? null : 'einer muss an Bord bleiben';
    }
    return 'anzahl muss +1 oder −1 sein';
  }
  return 'unbekannter Befehl';
}

/**
 * Wendet einen (schon geprüften) Siedlungs-Befehl an.
 * @param {Zustand} state @param {Befehl} b @param {Koloss} k
 */
export function siedlungsBefehlAnwenden(state, b, k) {
  const s = siedlungImStand(k);
  if (b.art === 'EINLAGERN') {
    einlagern(k, b.lager, b.ware, -b.kg);
    depotBuchen(state, s, b.spieler, b.ware, b.kg);
  } else if (b.art === 'AUSLAGERN') {
    depotBuchen(state, s, b.spieler, b.ware, -b.kg);
    einlagern(k, b.lager, b.ware, b.kg);
  } else if (b.art === 'CREW') {
    if (b.anzahl === 1) anheuern(k, b.gruppe);
    else k.crew[b.gruppe] -= 1; // bleibt in der Siedlung; die Werte der übrigen ändern sich nicht
  }
}

/**
 * Ein neuer Mann kommt gesund, satt und zufrieden an Bord. WARUM mischen: Die Crew hat gemeinsame
 * Werte (E-018) — einer mehr zieht den Durchschnitt anteilig nach oben.
 * @param {Koloss} k @param {'heizer' | 'arbeiter'} gruppe
 */
function anheuern(k, gruppe) {
  const c = k.crew;
  const n = c.heizer + c.arbeiter + c.passagiere;
  c.satt = teile(c.satt * n + VOLL, n + 1);
  c.gesundheit = teile(c.gesundheit * n + VOLL, n + 1);
  c.moral = teile(c.moral * n + VOLL, n + 1);
  c[gruppe] += 1;
}
