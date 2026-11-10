// @ts-check
/**
 * untergrund.js — Welcher Untergrund liegt an einer Stelle?
 *
 * ZWECK:    Die einzige Frage, die die Fahrphysik an die Welt stellt. In M1 antworten feste
 *           Testflächen (data/testgelaende.js), ab M2 der Seed-Generator — die Schnittstelle
 *           `untergrundAn(x, y)` bleibt dabei gleich.
 * LIEST:    data/testgelaende.js
 * SCHREIBT: —
 * REGEL:    KONZEPT.md §5
 * DEBUG:    `ek.untergrund()` zeigt den Untergrund unter dem eigenen Koloss.
 */

import { TESTFLAECHEN } from '../../data/testgelaende.js';
import { PACKSCHNEE } from '../../data/untergrund.js';
import { teile } from '../lib/winkel.js';

/**
 * @param {number} x  µm
 * @param {number} y  µm
 * @returns {number}  Untergrund-ID (Index in data/untergrund.js UNTERGRUND)
 */
export function untergrundAn(x, y) {
  // In Millimeter rechnen: Quadrate bleiben bis ~90 km Abstand unter 2^53 (exakt).
  // GRENZE: Für M1 reicht das; der M2-Generator fragt Chunk-Zellen statt Kreise ab.
  const xmm = teile(x, 1000);
  const ymm = teile(y, 1000);
  let ergebnis = PACKSCHNEE;
  for (const f of TESTFLAECHEN) {
    const dx = xmm - f.x * 1000;
    const dy = ymm - f.y * 1000;
    const r = f.r * 1000;
    if (dx * dx + dy * dy <= r * r) ergebnis = f.untergrund; // spätere Fläche gewinnt
  }
  return ergebnis;
}
