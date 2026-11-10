// @ts-check
/**
 * abfragen.js — Reine Lese-Funktionen über den Zustand (ändern nie etwas).
 *
 * ZWECK:    Was Simulation, Oberfläche und Darstellung gleichermaßen brauchen, steht hier genau
 *           einmal (Lehre aus Kronwege: „eine Rechnung, eine Stelle“).
 * LIEST:    state.spieler, state.kolosse
 * SCHREIBT: —
 */

import {
  UM_PRO_METER, SCHUB, SCHUB_RUECKWAERTS, TELEGRAF, TEMPO_EIN_KMH, TELEGRAF_STOPP, RUMPF_VOR_DREHPUNKT_M, DAMPF_MAX, DAMPF_JE_STUFE,
} from '../data/koloss.js';
import { STAND_TEMPO, BERGEN_REICHWEITE_M } from '../data/fundstellen.js';
import { TEMP_START, TEMP_RING, RING_KALT_M, TEMP_NACHT, WINDKAELTE_PROMILLE } from '../data/klima.js';
import { dunkelheit } from './wetter/tag.js';
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
 * Zieltempo der aktuellen Telegrafen-Stellung (µm/Tick, < 0 = rückwärts).
 * @param {Koloss} k
 * @returns {number}
 */
export function telegrafZiel(k) {
  return TELEGRAF[k.telegraf].kmh * TEMPO_EIN_KMH;
}

// ── Bergen (M3) ─────────────── ──────────────────────────────

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
 * Der Bergungstrupp eines Kolosses.
 * @param {Zustand} state
 * @param {Koloss} k
 * @returns {import('./types.js').Trupp}
 */
export function truppVon(state, k) {
  return state.trupps[k.trupp];
}

// ── Kessel und Kälte (M4a) ────────────────────────────────

/**
 * Wert zwischen zwei Tabelleneinträgen, gleitend nach einer Stufe in DAMPF_JE_STUFE-Teilen.
 * @param {readonly number[]} tabelle  ein Wert je Stufe
 * @param {number} wert  0 … (Stufen − 1) × DAMPF_JE_STUFE
 * @returns {number}
 */
export function nachStufe(tabelle, wert) {
  const stufe = Math.min(tabelle.length - 1, Math.floor(wert / DAMPF_JE_STUFE));
  if (stufe >= tabelle.length - 1) return tabelle[tabelle.length - 1];
  return tabelle[stufe] + teile((tabelle[stufe + 1] - tabelle[stufe]) * (wert - stufe * DAMPF_JE_STUFE), DAMPF_JE_STUFE);
}

/**
 * Höchster Schub vorwärts beim jetzigen Dampfvorrat (µm/Tick², ohne Abzug für Ladung).
 * WARUM linear zum Druck (Spieltest M4a): Voller Kessel = volle Kraft, egal wie stark das Feuer
 * gerade ist. Wer mehr verlangt, als das Feuer nachliefert, leert den Vorrat — der Druck fällt,
 * der Schub mit ihm, bis Tempo und Feuer wieder zusammenpassen.
 * @param {Koloss} k
 * @returns {number}
 */
export function kesselSchub(k) {
  return teile(SCHUB[SCHUB.length - 1] * k.dampf, DAMPF_MAX);
}

/**
 * Höchster Schub rückwärts: braucht mindestens eine Manometer-Stufe Dampf, darunter anteilig weniger.
 * @param {Koloss} k
 * @returns {number}
 */
export function kesselSchubRueckwaerts(k) {
  return teile(SCHUB_RUECKWAERTS * Math.min(k.dampf, DAMPF_JE_STUFE), DAMPF_JE_STUFE);
}

/**
 * Außentemperatur am Koloss (Zehntel °C): kälter nach außen, nachts und bei Wind.
 * @param {Zustand} state
 * @param {Koloss} k
 * @returns {number}
 */
export function aussenTemperatur(state, k) {
  const weiteM = teile(Math.max(Math.abs(k.x), Math.abs(k.y)), UM_PRO_METER);
  const ring = teile(TEMP_RING * Math.min(weiteM, RING_KALT_M), RING_KALT_M);
  const nacht = teile(TEMP_NACHT * dunkelheit(state.tick), 1000);
  const wind = -teile(state.wetter.windStaerke * WINDKAELTE_PROMILLE, 1000);
  return TEMP_START + ring + nacht + wind;
}
