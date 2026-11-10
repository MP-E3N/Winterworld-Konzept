// @ts-check
/**
 * rauschen.js — Ganzzahl-Rauschen für den Weltgenerator.
 *
 * ZWECK:    Liefert „natürlich“ wirkende, weiche Zufallsfelder (Höhen, Seen, Wehen) aus dem Seed.
 *           Nur Ganzzahl-Rechnung (Math.imul, >>>, Math.floor auf exakten Werten) → jeder Rechner
 *           erzeugt bitgenau dieselbe Welt. Wichtig, weil Fels und Schlucht Spielregeln sind
 *           (Kollision) — eine abweichende Zelle wäre im Multiplayer ein Desync.
 * LIEST:    —
 * SCHREIBT: —
 * REGEL:    CLAUDE.md Regeln 2+3, docs/specs/M2-welt.md
 * DEBUG:    tests/welt.test.js; Karte als Text: `node tools/welt-ansehen.js <seed>`.
 *
 * Verfahren: Wertrauschen („value noise“). Auf einem groben Gitter bekommt jeder Gitterpunkt
 * einen Zufallswert (Hash aus Seed und Koordinaten). Dazwischen wird geglättet interpoliert.
 * Mehrere Gitter verschiedener Größe übereinander (Oktaven) ergeben grobe Formen mit feinem Rand.
 */

/** Werte des Rauschens liegen in 0 … RAUSCH_MAX. */
export const RAUSCH_MAX = 65535;

/**
 * Durchmischt Seed und Gitterkoordinaten zu einer 32-Bit-Zahl.
 * @param {number} seed @param {number} x @param {number} y  Ganzzahlen
 * @returns {number} uint32
 */
export function hash2(seed, x, y) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x2545f491);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Glättungskurve 3t² − 2t³ in Festkomma (t und Ergebnis 0 … 65536).
 * WARUM: Lineare Interpolation hätte sichtbare Knicke an den Gitterlinien.
 * @param {number} t
 * @returns {number}
 */
function glatt(t) {
  return Math.floor((t * t * (196608 - 2 * t)) / 4294967296);
}

/**
 * Eine Oktave Wertrauschen.
 * @param {number} seed
 * @param {number} gx @param {number} gy  Zellkoordinaten (Ganzzahl, auch negativ)
 * @param {number} groesse  Gitterabstand in Zellen (≥ 1)
 * @returns {number} 0 … 65535
 */
export function wertRauschen(seed, gx, gy, groesse) {
  const x0 = Math.floor(gx / groesse), y0 = Math.floor(gy / groesse);
  const sx = glatt(Math.floor(((gx - x0 * groesse) * 65536) / groesse));
  const sy = glatt(Math.floor(((gy - y0 * groesse) * 65536) / groesse));
  const a = hash2(seed, x0, y0) & 0xffff, b = hash2(seed, x0 + 1, y0) & 0xffff;
  const c = hash2(seed, x0, y0 + 1) & 0xffff, d = hash2(seed, x0 + 1, y0 + 1) & 0xffff;
  const oben = a + Math.floor(((b - a) * sx) / 65536);
  const unten = c + Math.floor(((d - c) * sx) / 65536);
  return oben + Math.floor(((unten - oben) * sy) / 65536);
}

/**
 * Drei Oktaven (Gewichte 4 : 2 : 1), jede halb so groß wie die vorige.
 * WARUM eigener Seed je Oktave: sonst lägen die Gitterpunkte übereinander und es entstünden Muster.
 * @param {number} seed
 * @param {number} gx @param {number} gy
 * @param {number} groesse  Gitterabstand der gröbsten Oktave (Zellen)
 * @returns {number} 0 … 65535 (in der Mitte gehäuft)
 */
export function schichtRauschen(seed, gx, gy, groesse) {
  const a = wertRauschen(seed, gx, gy, groesse);
  const b = wertRauschen(seed + 101, gx, gy, Math.max(1, groesse >> 1));
  const c = wertRauschen(seed + 202, gx, gy, Math.max(1, groesse >> 2));
  return Math.floor((a * 4 + b * 2 + c) / 7);
}
