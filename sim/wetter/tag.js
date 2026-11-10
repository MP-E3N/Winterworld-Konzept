// @ts-check
/**
 * tag.js — Tageszeit und Dunkelheit, berechnet aus dem Tick (M4a).
 *
 * ZWECK:    Ein Spieltag dauert TAG_TICKS (20 min echte Zeit). Die Uhrzeit braucht kein eigenes Feld
 *           im Zustand — sie folgt eindeutig aus state.tick. Kälte und Darstellung fragen hier.
 * LIEST:    data/klima.js
 * SCHREIBT: —
 * REGEL:    docs/specs/M4a-kessel-kaelte.md, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    F3 zeigt die Uhrzeit. Nacht ansehen: `ek.step(16000)` (≈ 16 Spielstunden weiter).
 */

import { TAG_TICKS, TAG_MINUTEN, START_UHR, HELL_AB, DAEMMERUNG_AB, DAEMMERUNG_MIN } from '../../data/klima.js';

/**
 * Minuten seit Weltbeginn (ganzzahlig, Start = START_UHR).
 * @param {number} tick
 * @returns {number}
 */
function minutenGesamt(tick) {
  return START_UHR + Math.floor((tick * TAG_MINUTEN) / TAG_TICKS);
}

/**
 * Uhrzeit in Minuten des Tages (0 … 1439).
 * @param {number} tick
 * @returns {number}
 */
export function uhrzeit(tick) {
  return minutenGesamt(tick) % TAG_MINUTEN;
}

/**
 * Laufende Nummer des Tages (1 = erster Tag).
 * @param {number} tick
 * @returns {number}
 */
export function tagNummer(tick) {
  return 1 + Math.floor(minutenGesamt(tick) / TAG_MINUTEN);
}

/**
 * Wie dunkel es ist: 0 = hell … 1000 = tiefe Nacht. Dazwischen gleitende Dämmerung.
 * @param {number} tick
 * @returns {number}
 */
export function dunkelheit(tick) {
  const m = uhrzeit(tick);
  if (m >= HELL_AB && m < DAEMMERUNG_AB) return 0;
  // Abends: von DAEMMERUNG_AB bis DAEMMERUNG_AB + DAEMMERUNG_MIN dunkler werden.
  if (m >= DAEMMERUNG_AB && m < DAEMMERUNG_AB + DAEMMERUNG_MIN) return Math.floor(((m - DAEMMERUNG_AB) * 1000) / DAEMMERUNG_MIN);
  // Morgens: DAEMMERUNG_MIN vor HELL_AB heller werden.
  if (m < HELL_AB && m >= HELL_AB - DAEMMERUNG_MIN) return Math.floor(((HELL_AB - m) * 1000) / DAEMMERUNG_MIN);
  return 1000;
}
