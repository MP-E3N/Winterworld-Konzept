// @ts-check
/**
 * abfragen.js — Reine Lese-Funktionen über den Zustand (ändern nie etwas).
 *
 * ZWECK:    Was Simulation, Oberfläche und Darstellung gleichermaßen brauchen, steht hier genau
 *           einmal (Lehre aus Kronwege: „eine Rechnung, eine Stelle“).
 * LIEST:    state.spieler, state.kolosse
 * SCHREIBT: —
 */

import { UM_PRO_METER, SCHUB } from '../data/koloss.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { untergrundAn } from './welt/untergrund.js';
import { cosW, sinW, teile } from './lib/winkel.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Koloss} Koloss */

/**
 * Der Koloss eines Spielers.
 * @param {Zustand} state
 * @param {number} spieler
 * @returns {Koloss | null}  null = Spieler ist (noch) nicht beigetreten
 */
export function kolossVon(state, spieler) {
  const sp = state.spieler[spieler];
  return sp ? state.kolosse[sp.koloss] : null;
}

/**
 * Tempo in Fahrtrichtung (µm/Tick, negativ = rückwärts).
 * @param {Koloss} k
 * @returns {number}
 */
export function laengsTempo(k) {
  return teile(k.vx * cosW(k.h) + k.vy * sinW(k.h), 16384);
}

/**
 * Tempo quer zur Fahrtrichtung (µm/Tick, + = nach rechts rutschen).
 * @param {Koloss} k
 * @returns {number}
 */
export function querTempo(k) {
  return teile(-k.vx * sinW(k.h) + k.vy * cosW(k.h), 16384);
}

/**
 * Tempo in km/h zum Anzeigen (Kommazahl erlaubt — nur für die Oberfläche).
 * @param {number} umProTick
 * @returns {number}
 */
export function alsKmh(umProTick) {
  return (umProTick * 72) / 1000000;
}

/**
 * µm → Meter (Kommazahl, nur für Darstellung und Anzeige).
 * @param {number} um
 * @returns {number}
 */
export function alsMeter(um) {
  return um / UM_PRO_METER;
}

/**
 * Höchsttempo, das der Kessel auf der aktuellen Druckstufe und dem Boden unter dem Koloss mit
 * Vollgas erreicht (µm/Tick). Gleichgewicht Schub = Widerstand (siehe sim/koloss/fahren.js).
 * Für die Anzeige: Will „Tempo halten“ mehr, ist der Kessel überlastet.
 * @param {Koloss} k
 * @returns {number}
 */
export function hoechstTempo(k) {
  const u = UNTERGRUND[untergrundAn(k.x, k.y)];
  return teile(SCHUB[k.druck] * u.zug * 4096, u.widerstand * 100);
}
