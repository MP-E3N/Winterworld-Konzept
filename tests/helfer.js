// @ts-check
/**
 * helfer.js — Gemeinsame Bausteine für Tests (keine Tests selbst).
 *
 * ZWECK:    Eine Testwelt mit einem Koloss anlegen und ihn eine Weile fahren lassen, ohne
 *           dass jeder Test das neu schreiben muss.
 */

import { neuerZustand } from '../sim/zustand.js';
import { befehlAnwenden } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { kolossVon } from '../sim/abfragen.js';
import { UM_PRO_METER } from '../data/koloss.js';

/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {import('../sim/types.js').Koloss} Koloss */

/**
 * Neue Welt mit einem beigetretenen Spieler 0.
 * @param {number} [seed=1]
 * @returns {{state: Zustand, k: Koloss}}
 */
export function testwelt(seed = 1) {
  const state = neuerZustand(seed);
  const erg = befehlAnwenden(state, { art: 'BEITRETEN', spieler: 0, name: 'Test' });
  if (!erg.ok) throw new Error(erg.grund);
  return { state, k: /** @type {Koloss} */ (kolossVon(state, 0)) };
}

/**
 * Setzt Gas/Lenkung/Druck über echte Befehle und fährt n Ticks.
 * @param {Zustand} state
 * @param {{gas?: number, lenkung?: number, druck?: number}} steuer
 * @param {number} ticks
 */
export function fahre(state, steuer, ticks) {
  if (steuer.druck !== undefined) pflicht(befehlAnwenden(state, { art: 'DRUCK', spieler: 0, stufe: steuer.druck }));
  pflicht(befehlAnwenden(state, { art: 'STEUERN', spieler: 0, gas: steuer.gas ?? 0, lenkung: steuer.lenkung ?? 0 }));
  for (let i = 0; i < ticks; i++) tickAusfuehren(state);
}

/**
 * Setzt den Koloss für einen Test an eine bestimmte Stelle (Meter). NUR in Tests erlaubt.
 * @param {Koloss} k
 * @param {number} xM
 * @param {number} yM
 * @param {number} [h]  Richtung
 */
export function setzeAn(k, xM, yM, h = k.h) {
  k.x = xM * UM_PRO_METER; k.y = yM * UM_PRO_METER; k.h = h; k.vx = 0; k.vy = 0; k.dreh = 0;
}

/** @param {import('../sim/types.js').BefehlsErgebnis} erg */
function pflicht(erg) {
  if (!erg.ok) throw new Error(erg.grund);
}
