// @ts-check
/**
 * abfragen.js — Reine Lese-Funktionen über den Zustand (ändern nie etwas).
 *
 * ZWECK:    Was Simulation, Oberfläche und Darstellung gleichermaßen brauchen, steht hier genau
 *           einmal (Lehre aus Kronwege: „eine Rechnung, eine Stelle“).
 * LIEST:    state.spieler, state.kolosse
 * SCHREIBT: —
 */

import { UM_PRO_METER, SCHUB, SCHUB_RUECKWAERTS, TELEGRAF, TEMPO_EIN_KMH, TELEGRAF_STOPP, RUMPF_VOR_DREHPUNKT_M } from '../data/koloss.js';
import { WAREN, LADERAUM_KG, GEWICHT_BREMST_PROMILLE, STAND_TEMPO, BERGEN_REICHWEITE_M } from '../data/fundstellen.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { untergrundAn } from './welt/untergrund.js';
import { cosW, sinW, teile, TRIG_EINS } from './lib/winkel.js';

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
 * Vollgas erreicht (µm/Tick, Betrag). Gleichgewicht Schub = Widerstand (siehe sim/koloss/fahren.js).
 * Für die Anzeige: Verlangt der Telegraf mehr, ist der Kessel überlastet.
 * @param {number} seed  Welt-Seed
 * @param {Koloss} k
 * @param {boolean} [rueckwaerts=false]
 * @returns {number}
 */
export function hoechstTempo(seed, k, rueckwaerts = false) {
  const u = UNTERGRUND[untergrundAn(seed, k.x, k.y)];
  const schub = schubMitLadung(k, rueckwaerts ? (k.druck > 0 ? SCHUB_RUECKWAERTS : 0) : SCHUB[k.druck]);
  return teile(schub * u.zug * 4096, u.widerstand * 100);
}

/**
 * Zieltempo der aktuellen Telegrafen-Stellung (µm/Tick, < 0 = rückwärts).
 * @param {Koloss} k
 * @returns {number}
 */
export function telegrafZiel(k) {
  return TELEGRAF[k.telegraf].kmh * TEMPO_EIN_KMH;
}

/**
 * Kessel überlastet: Der Telegraf verlangt mehr Tempo, als der Kessel auf diesem Boden schafft
 * (die Anzeige lässt dann die Manometer-Nadel zittern). Handgas zählt nicht.
 * @param {number} seed @param {Koloss} k
 * @returns {boolean}
 */
export function kesselUeberlastet(seed, k) {
  const ziel = telegrafZiel(k);
  if (k.gas !== 0 || ziel === 0) return false;
  return Math.abs(ziel) > hoechstTempo(seed, k, ziel < 0);
}

// ── Bergen und Laderaum (M3) ──────────────────────────────

/**
 * Rumpfmitte (µm). Die Position im Zustand ist der Drehpunkt; der Rumpf liegt
 * RUMPF_VOR_DREHPUNKT_M davor (E-011). Reichweite des Trupps zählt ab hier.
 * @param {Koloss} k
 * @returns {{x: number, y: number}}
 */
export function rumpfMitte(k) {
  const vor = RUMPF_VOR_DREHPUNKT_M * UM_PRO_METER;
  return { x: k.x + teile(vor * cosW(k.h), TRIG_EINS), y: k.y + teile(vor * sinW(k.h), TRIG_EINS) };
}

/**
 * Steht der Koloss so, dass ein Trupp aussteigen kann? Telegraf auf „Stopp“, kein Handgas und
 * (fast) kein Tempo (Nutzerentscheidung M3: Bergen nur im Stand).
 * @param {Koloss} k
 * @returns {boolean}
 */
export function kolossSteht(k) {
  return k.telegraf === TELEGRAF_STOPP && k.gas === 0 && Math.abs(k.vx) <= STAND_TEMPO && Math.abs(k.vy) <= STAND_TEMPO;
}

/**
 * Liegt ein Punkt in Reichweite des Trupps (ab Rumpfmitte)?
 * WARUM erst die Kästchen-Probe: Quadrate weit entfernter Punkte in µm wären keine sicheren
 * Ganzzahlen mehr. Gerechnet wird in mm.
 * @param {Koloss} k
 * @param {number} x @param {number} y  µm
 * @returns {boolean}
 */
export function inReichweite(k, x, y) {
  const m = rumpfMitte(k);
  const r = BERGEN_REICHWEITE_M * 1000; // mm
  const dx = teile(x - m.x, 1000), dy = teile(y - m.y, 1000);
  if (Math.abs(dx) > r || Math.abs(dy) > r) return false;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Was in einer Fundstelle noch liegt (kg): Eintrag in der Änderungsliste, sonst die Anfangsmenge.
 * @param {Zustand} state
 * @param {{id: number, menge: number}} f  Fundstelle (sim/welt/fundstellen.js)
 * @returns {number}
 */
export function fundRest(state, f) {
  for (const g of state.geborgen) if (g.fund === f.id) return g.rest;
  return f.menge;
}

/**
 * Gesamtgewicht im Laderaum (kg).
 * @param {Koloss} k
 * @returns {number}
 */
export function ladungKg(k) {
  let summe = 0;
  for (const w of WAREN) summe += k.ladung[w.ware];
  return summe;
}

/**
 * Freier Platz im Laderaum (kg).
 * @param {Koloss} k
 * @returns {number}
 */
export function ladungFrei(k) {
  return LADERAUM_KG - ladungKg(k);
}

/**
 * Schub nach Abzug für das Gewicht der Ladung: linear bis GEWICHT_BREMST_PROMILLE bei vollem
 * Laderaum. Leer = genau der volle Schub (Fahrwerte und Replays aus M1/M2 bleiben gleich).
 * @param {Koloss} k
 * @param {number} schub  µm/Tick²
 * @returns {number}
 */
export function schubMitLadung(k, schub) {
  const abzug = teile(ladungKg(k) * GEWICHT_BREMST_PROMILLE, LADERAUM_KG);
  return teile(schub * (1000 - abzug), 1000);
}

/**
 * Der Bergungstrupp eines Kolosses.
 * @param {Zustand} state
 * @param {Koloss} k
 * @returns {import('./types.js').Trupp}
 */
export function truppVon(state, k) {
  return state.trupps[k.trupp];
}
