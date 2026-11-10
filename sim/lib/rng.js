// @ts-check
/**
 * rng.js — Deterministischer Zufallsgenerator (sfc32). Sein Zustand liegt in einem Objekt
 *          `{rng: [...]}`: im Spielzustand (state.rng) oder im eigenen Zufall des Kartengenerators.
 *
 * ZWECK:    Jeder Zufall der Simulation kommt von hier. Gleicher Seed + gleiche Befehle
 *           → auf jedem Rechner exakt dieselben Würfe. Das ist die Grundlage für
 *           Replays, Tests und die spätere Client-Vorhersage im Multiplayer.
 * LIEST:    state.rng
 * SCHREIBT: state.rng (jeder Wurf rückt den Generator weiter)
 * REGEL:    CLAUDE.md Regeln 2+3 (kein Math.random, nur Ganzzahlen)
 * DEBUG:    `ek.state.rng` zeigt die vier inneren Zahlen. Ändern sie sich zwischen zwei
 *           Läufen mit gleichem Seed unterschiedlich, hat jemand zusätzlich gewürfelt.
 *
 * Algorithmus: sfc32 (Chris Doty-Humphrey) + splitmix32 zum Vorbereiten des Seeds.
 * Quelle: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 * Beide nutzen nur Ganzzahl-Operationen (|0, >>>, Math.imul), die in allen
 * JavaScript-Engines bitgenau gleich rechnen.
 */

/**
 * Alles, was einen Zufallszustand trägt: der Spielzustand (state) oder ein eigener
 * Zufall, z. B. der des Kartengenerators ({rng: rngAusSeed(...)}).
 * @typedef {{rng: number[]}} RngTraeger
 */

/**
 * splitmix32: macht aus einer Zahl eine gut durchmischte 32-Bit-Zahl.
 * WARUM: sfc32 braucht vier „zufällig aussehende“ Startwerte. Direkt 1, 2, 3, 4 zu
 * nehmen, würde die ersten Würfe sehr ähnlich machen.
 * @param {number} a  beliebige Ganzzahl
 * @returns {number} uint32 (0 … 4.294.967.295)
 */
function splitmix32(a) {
  a = (a + 0x9e3779b9) | 0;
  let t = a ^ (a >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  return (t ^ (t >>> 15)) >>> 0;
}

/**
 * Erzeugt den Startzustand des Generators aus einem Seed.
 * @param {number} seed  beliebige Ganzzahl (z. B. 12345)
 * @returns {number[]} vier uint32-Werte für state.rng
 */
export function rngAusSeed(seed) {
  const a = splitmix32(seed);
  const b = splitmix32(a);
  const c = splitmix32(b);
  const d = splitmix32(c);
  const zustand = { rng: [a, b, c, d] };
  // WARUM 15 Leerwürfe: sfc32 braucht ein paar Runden, bis die Startwerte „verwischt“
  // sind (Empfehlung des Autors). Kostet nichts, macht die ersten Würfe besser.
  for (let i = 0; i < 15; i++) naechsteZahl(zustand.rng);
  return zustand.rng;
}

/**
 * Ein Schritt sfc32 auf einem rng-Array. Verändert das Array direkt.
 * @param {number[]} r  state.rng
 * @returns {number} uint32
 */
function naechsteZahl(r) {
  let a = r[0], b = r[1], c = r[2], d = r[3];
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  // >>> 0 macht alle Werte positiv. WARUM: Dann stehen im JSON keine negativen Zahlen,
  // und der Hash ist unabhängig davon, wie man die Bits liest.
  r[0] = a >>> 0; r[1] = b >>> 0; r[2] = c >>> 0; r[3] = d >>> 0;
  return t >>> 0;
}

/**
 * Würfelt eine 32-Bit-Zufallszahl und rückt den Generator im Zustand weiter.
 * @param {RngTraeger} state
 * @returns {number} uint32
 */
export function rngZahl(state) {
  return naechsteZahl(state.rng);
}

/**
 * Würfelt eine Ganzzahl im Bereich [min, max] (beide eingeschlossen).
 * WARUM Modulo: Einfach und deterministisch. Die winzige Ungleichverteilung
 * (< 0,0001 % bei Bereichen bis 4000) spielt für ein Spiel keine Rolle.
 * @param {RngTraeger} state
 * @param {number} min
 * @param {number} max  muss >= min sein
 * @returns {number}
 */
export function rngBereich(state, min, max) {
  const spanne = max - min + 1;
  return min + (rngZahl(state) % spanne);
}

/**
 * Würfelt „ja“ mit einer Wahrscheinlichkeit in Prozent.
 * @param {RngTraeger} state
 * @param {number} prozent  0 = nie, 100 = immer
 * @returns {boolean}
 */
export function rngProzent(state, prozent) {
  return rngBereich(state, 1, 100) <= prozent;
}

/**
 * Wählt einen Index anhand von Gewichten (relative Häufigkeiten).
 * Beispiel: [40, 30, 0] → Index 0 in 4 von 7 Fällen, Index 1 in 3 von 7, Index 2 nie.
 * @param {RngTraeger} state
 * @param {number[]} gewichte  nicht-negative Ganzzahlen, Summe > 0
 * @returns {number} gewählter Index
 */
export function rngGewichtet(state, gewichte) {
  let summe = 0;
  for (const g of gewichte) summe += g;
  let wurf = rngBereich(state, 0, summe - 1);
  for (let i = 0; i < gewichte.length; i++) {
    if (wurf < gewichte[i]) return i;
    wurf -= gewichte[i];
  }
  return gewichte.length - 1; // nur erreichbar bei fehlerhaften Gewichten
}
