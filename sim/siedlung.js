// @ts-check
/**
 * siedlung.js — Siedlungen: Wo ist man „in der Siedlung“, Gebäude als Hindernisse, Depots, Heimat (M4d).
 *
 * ZWECK:    Eine Stelle für alles, was Simulation, Oberfläche und Speichern über Siedlungen fragen.
 *           Die Siedlungen selbst stehen in data/siedlungen.js (nicht im Zustand), ihre Depots in
 *           state.depots (ein Eintrag je Spieler und Siedlung, angelegt beim ersten Einlagern).
 * LIEST:    data/siedlungen.js, Koloss (Lage, Stand), state.depots
 * SCHREIBT: k.heimat (siedlungSchritt, ein Tick-System), state.depots (nur depotAnlegen/depotBuchen,
 *           aufgerufen von sim/befehle-siedlung.js)
 * REGEL:    docs/specs/M4d-siedlung.md, CLAUDE.md Regeln 1–3
 * DEBUG:    F3-Zeile „Siedlung“. Tests: tests/siedlung.test.js.
 */

import { SIEDLUNGEN, SIEDLUNG_RADIUS_M } from '../data/siedlungen.js';
import { rumpfMitte, kolossSteht } from './abfragen.js';
import { teile } from './lib/winkel.js';

/** @typedef {import('./types.js').Koloss} Koloss */
/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Depot} Depot */

/** Weiter als so weit (m) von einer Siedlungsmitte gibt es keine Gebäude — schnelle Vorprobe. */
const GEBAEUDE_REICHWEITE_M = 80;

// ── Lage ──

/**
 * In welcher Siedlung liegt die Rumpfmitte? (Abstand in mm gerechnet, siehe inReichweite.)
 * @param {Koloss} k
 * @returns {number}  Siedlungs-ID oder −1
 */
export function siedlungVon(k) {
  const m = rumpfMitte(k);
  return siedlungAnPunkt(m.x, m.y, SIEDLUNG_RADIUS_M);
}

/**
 * Liegt ein Punkt (µm) höchstens radiusM von einer Siedlungsmitte?
 * @param {number} x @param {number} y  µm
 * @param {number} radiusM
 * @returns {number}  Siedlungs-ID oder −1
 */
export function siedlungAnPunkt(x, y, radiusM) {
  const r = radiusM * 1000; // mm
  for (let i = 0; i < SIEDLUNGEN.length; i++) {
    const s = SIEDLUNGEN[i];
    const dx = teile(x, 1000) - s.x * 1000, dy = teile(y, 1000) - s.y * 1000;
    if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1;
}

/**
 * Steht der Koloss in einer Siedlung (Telegraf Stopp, kein Tempo)? Nur dann gibt es Depot, Crew und Speichern.
 * @param {Koloss} k
 * @returns {number}  Siedlungs-ID oder −1
 */
export function siedlungImStand(k) {
  return kolossSteht(k) ? siedlungVon(k) : -1;
}

/**
 * Steht an diesem Punkt (µm) ein Gebäude? Für die Kollision.
 * @param {number} x @param {number} y  µm
 * @returns {boolean}
 */
export function gebaeudeAn(x, y) {
  const xm = teile(x, 1000), ym = teile(y, 1000); // mm
  for (const s of SIEDLUNGEN) {
    const dx = xm - s.x * 1000, dy = ym - s.y * 1000;
    if (Math.abs(dx) > GEBAEUDE_REICHWEITE_M * 1000 || Math.abs(dy) > GEBAEUDE_REICHWEITE_M * 1000) continue;
    for (const g of s.gebaeude) {
      if (Math.abs(dx - g.dx * 1000) * 2 <= g.b * 1000 && Math.abs(dy - g.dy * 1000) * 2 <= g.t * 1000) return true;
    }
  }
  return false;
}

/**
 * Parkplatz einer Siedlung (µm, Winkel) — dort startet ein neuer Koloss.
 * @param {number} siedlung
 * @returns {{x: number, y: number, h: number}}
 */
export function parkplatz(siedlung) {
  return (SIEDLUNGEN[siedlung] ?? SIEDLUNGEN[0]).park;
}

// ── Tick ──

/**
 * Hält der Koloss in einer Siedlung, wird sie seine Heimat (Neustart nach dem Wrack dort, F6).
 * @param {Koloss} k
 */
export function siedlungSchritt(k) {
  const s = siedlungImStand(k);
  if (s >= 0) k.heimat = s;
}

// ── Depots ──

/**
 * Das Depot eines Spielers in einer Siedlung.
 * @param {Zustand} state @param {number} siedlung @param {number} spieler
 * @returns {Depot | null}  null = noch nie etwas eingelagert
 */
export function depotVon(state, siedlung, spieler) {
  for (const d of state.depots) if (d.siedlung === siedlung && d.spieler === spieler) return d;
  return null;
}

/**
 * kg einer Ware im Depot (0, wenn es das Depot noch nicht gibt).
 * @param {Zustand} state @param {number} siedlung @param {number} spieler @param {string} ware
 * @returns {number}
 */
export function depotMenge(state, siedlung, spieler, ware) {
  const d = depotVon(state, siedlung, spieler);
  return d ? /** @type {Record<string, number>} */ (/** @type {unknown} */ (d))[ware] ?? 0 : 0;
}

/**
 * Bucht kg einer Ware ins Depot (negativ = herausnehmen); legt das Depot beim ersten Mal an.
 * Prüft NICHT auf Menge — das tut die Befehlsprüfung.
 * @param {Zustand} state @param {number} siedlung @param {number} spieler @param {string} ware @param {number} kg
 */
export function depotBuchen(state, siedlung, spieler, ware, kg) {
  let d = depotVon(state, siedlung, spieler);
  if (!d) {
    d = { id: state.depots.length, siedlung, spieler, kohle: 0, holz: 0, oel: 0, nahrung: 0 };
    state.depots.push(d);
  }
  const inhalt = /** @type {Record<string, number>} */ (/** @type {unknown} */ (d));
  inhalt[ware] = Math.max(0, inhalt[ware] + kg);
}
