// @ts-check
/**
 * replay.js — Spielt eine aufgezeichnete Partie nach.
 *
 * ZWECK:    Gleicher Seed + gleiche Befehle zu gleichen Ticks → exakt gleicher Zustand.
 *           Damit prüfen Tests, dass eine Änderung das Fahrverhalten nicht aus Versehen
 *           verändert hat (tests/replays/*.json).
 * LIEST:    das Protokoll
 * SCHREIBT: einen neuen Zustand
 * REGEL:    KONZEPT.md §8 Regel 3
 * DEBUG:    Weicht der Hash ab? `node tools/replay-aufnehmen.js` NUR bei absichtlicher
 *           Regeländerung neu aufnehmen und das in der Commit-Nachricht sagen.
 */

import { neuerZustand } from './zustand.js';
import { befehlAnwenden } from './befehle.js';
import { tickAusfuehren } from './tick.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').ProtokollEintrag} ProtokollEintrag */

/**
 * Tiefe Kopie eines Zustands (reines JSON).
 * @param {Zustand} state
 * @returns {Zustand}
 */
export function kopie(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Spielt ein Protokoll ab.
 * @param {number} seed
 * @param {ProtokollEintrag[]} protokoll  nach Tick sortiert
 * @param {number} ticks  so viele Ticks insgesamt ausführen
 * @returns {Zustand}
 */
export function replayAbspielen(seed, protokoll, ticks) {
  return weiterSpielen(neuerZustand(seed), protokoll, ticks);
}

/**
 * Spielt ein Protokoll auf einem vorhandenen Zustand weiter (z. B. nach dem Laden).
 * Befehle mit Tick < state.tick werden übersprungen.
 * @param {Zustand} state  wird verändert
 * @param {ProtokollEintrag[]} protokoll  nach Tick sortiert
 * @param {number} ticks  bis zu diesem Tick laufen
 * @returns {Zustand} derselbe Zustand
 */
export function weiterSpielen(state, protokoll, ticks) {
  let i = 0;
  while (i < protokoll.length && protokoll[i].tick < state.tick) i += 1;
  while (state.tick < ticks) {
    // Alle Befehle für diesen Tick vor dem Tick anwenden (wie in netz/lokal.js).
    while (i < protokoll.length && protokoll[i].tick === state.tick) {
      befehlAnwenden(state, protokoll[i].befehl);
      i += 1;
    }
    tickAusfuehren(state);
  }
  return state;
}
