// @ts-check
/**
 * hash.js — Prüfsumme über den kompletten Spielzustand.
 *
 * ZWECK:    Zwei Zustände sind genau dann gleich, wenn ihr Hash gleich ist (praktisch).
 *           Damit prüfen Tests den Determinismus, Replays erkennen Regressionen, und
 *           im Multiplayer vergleichen Rechner später einmal pro Spieltag ihren Stand.
 * LIEST:    den übergebenen Wert (meist den ganzen state)
 * SCHREIBT: —
 * REGEL:    KONZEPT.md §8 (Determinismus)
 * DEBUG:    `ek.hash()` in der Konsole. Zwei Browser-Tabs mit gleichem Seed und gleichen
 *           Eingaben müssen denselben Hash zeigen.
 *
 * Verfahren: kanonisches JSON (Objekt-Schlüssel alphabetisch sortiert) → FNV-1a 32 Bit.
 * WARUM kanonisch: `JSON.stringify` übernimmt die Reihenfolge, in der Schlüssel angelegt
 * wurden. Zwei inhaltlich gleiche Zustände könnten sonst verschiedene Hashes haben.
 */

/**
 * Wandelt einen Wert in JSON mit alphabetisch sortierten Objekt-Schlüsseln um.
 * Arrays behalten ihre Reihenfolge (die ist bei uns bedeutsam: Index = ID).
 * @param {unknown} wert  reiner JSON-Wert
 * @returns {string}
 */
export function kanonischesJson(wert) {
  if (wert === null || typeof wert !== 'object') return JSON.stringify(wert);
  if (Array.isArray(wert)) return '[' + wert.map(kanonischesJson).join(',') + ']';
  const obj = /** @type {Record<string, unknown>} */ (wert);
  const teile = Object.keys(obj).sort().map((k) => JSON.stringify(k) + ':' + kanonischesJson(obj[k]));
  return '{' + teile.join(',') + '}';
}

/**
 * FNV-1a-Hash (32 Bit) eines Textes.
 * @param {string} text
 * @returns {number} uint32
 */
function fnv1a(text) {
  let h = 0x811c9dc5; // FNV-Startwert („offset basis“)
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV-Primzahl; Math.imul = exakte 32-Bit-Multiplikation
  }
  return h >>> 0;
}

/**
 * Hash eines Zustands als 8-stelliger Hex-Text, z. B. "3fa4c2d1".
 * @param {unknown} state
 * @returns {string}
 */
export function zustandsHash(state) {
  return fnv1a(kanonischesJson(state)).toString(16).padStart(8, '0');
}
