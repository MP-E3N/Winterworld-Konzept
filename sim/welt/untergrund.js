// @ts-check
/**
 * untergrund.js — Welcher Untergrund liegt an einer Stelle? Ist sie befahrbar?
 *
 * ZWECK:    Die einzigen Fragen, die Physik und Anzeige an die Welt stellen. Dahinter steckt der
 *           Generator (sim/welt/generator.js) auf 25 cm genau; Seed 0 = Testgelände.
 * LIEST:    sim/welt/generator.js, data/untergrund.js
 * SCHREIBT: —
 * REGEL:    KONZEPT.md §5, docs/specs/M2-welt.md
 * DEBUG:    `ek.untergrund()` zeigt den Untergrund unter dem eigenen Koloss.
 *
 * WARUM ohne Zwischenspeicher: Pro Tick und Koloss sind es gut zwanzig Abfragen (Kollision), jede
 * kostet ~1 µs. Ein Speicher lohnt erst, wenn viele Kolosse oder KI-Wegsuche dazukommen.
 */

import { gelaendeAn } from './generator.js';
import { UNTERGRUND } from '../../data/untergrund.js';
import { FEIN_UM } from '../../data/welt.js';

/**
 * @param {number} seed
 * @param {number} x  µm
 * @param {number} y  µm
 * @returns {number}  Untergrund-ID (Index in data/untergrund.js UNTERGRUND)
 */
export function untergrundAn(seed, x, y) {
  return Math.floor(gelaendeAn(seed, Math.floor(x / FEIN_UM), Math.floor(y / FEIN_UM)) / 65536);
}

/**
 * @param {number} seed
 * @param {number} x  µm
 * @param {number} y  µm
 * @returns {boolean}
 */
export function befahrbarAn(seed, x, y) {
  return UNTERGRUND[untergrundAn(seed, x, y)].befahrbar;
}
