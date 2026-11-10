// @ts-check
/**
 * winkel.js — Winkel und Ganzzahl-Rechnen für die Simulation.
 *
 * ZWECK:    Richtungen als Ganzzahl (65536 = volle Umdrehung) und Sinus/Kosinus aus einer
 *           festen Tabelle. Dazu kleine Rechenhelfer, die auf jedem Rechner exakt gleich
 *           rechnen.
 * LIEST:    sim/lib/sinus-tabelle.js
 * SCHREIBT: —
 * REGEL:    CLAUDE.md Regeln 2+3 (kein Math.sin, nur Ganzzahlen)
 * DEBUG:    tests/trig.test.js. Fährt der Koloss schief geradeaus, zuerst hier prüfen.
 *
 * WINKEL-RICHTUNG: 0 = Osten (+x), 16384 = Süden (+y, auf dem Bildschirm nach unten).
 * Größer werdende Winkel drehen also im Uhrzeigersinn — so wie man es auf dem Bildschirm sieht.
 */

import { SINUS_VIERTEL } from './sinus-tabelle.js';

/** Eine volle Umdrehung in Winkeleinheiten. */
export const VOLLKREIS = 65536;

/** Festkomma-Eins der Sinus-Werte (Q14). sin(90°) = 16384. */
export const TRIG_EINS = 16384;

/**
 * Bringt einen Winkel in den Bereich 0 … 65535.
 * @param {number} w  beliebiger ganzzahliger Winkel (auch negativ)
 * @returns {number}
 */
export function winkelNorm(w) {
  return ((w % VOLLKREIS) + VOLLKREIS) % VOLLKREIS;
}

/**
 * Sinus aus der Tabelle.
 * WARUM >> 4: Die Tabelle hat 4096 Schritte pro Umdrehung (1024 pro Viertel); 65536 / 4096 = 16.
 * Genauigkeit ≈ 0,09° — für einen Koloss mehr als genug.
 * @param {number} w  Winkel (65536 = 360°)
 * @returns {number}  Sinus ×16384
 */
export function sinW(w) {
  const i = winkelNorm(w) >> 4; // 0 … 4095
  const viertel = i >> 10;      // 0 … 3
  const rest = i & 1023;
  if (viertel === 0) return SINUS_VIERTEL[rest];
  if (viertel === 1) return SINUS_VIERTEL[1024 - rest];
  if (viertel === 2) return -SINUS_VIERTEL[rest];
  return -SINUS_VIERTEL[1024 - rest];
}

/**
 * Kosinus = Sinus um 90° verschoben.
 * @param {number} w
 * @returns {number} Kosinus ×16384
 */
export function cosW(w) {
  return sinW(w + 16384);
}

/**
 * Ganzzahl-Division mit Abschneiden Richtung 0.
 * WARUM nicht Math.floor: floor rundet negative Werte weg von 0 (-0,5 → -1). Bei Geschwindigkeiten
 * würde der Koloss dadurch ewig ein kleines Stück nach links/oben kriechen. trunc lässt kleine
 * Reste auf 0 abklingen — egal in welche Richtung.
 * @param {number} a
 * @param {number} b  ≠ 0
 * @returns {number}
 */
export function teile(a, b) {
  return Math.trunc(a / b);
}

/**
 * Begrenzt einen Wert auf [min, max].
 * @param {number} wert
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function klemme(wert, min, max) {
  return wert < min ? min : wert > max ? max : wert;
}
