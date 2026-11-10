// @ts-check
/**
 * koloss-mass.js — Maße des gezeichneten Kolosses (Räder, Mittelteil, Schornstein, Scheinwerfer).
 *
 * ZWECK:    Eine Stelle für alle Lagen im Fahrzeug, die render/koloss.js, render/koloss-aufbau.js,
 *           render/spuren.js und render/licht.js gemeinsam brauchen.
 * LIEST:    data/koloss.js (Länge, Breite, Drehpunkt), data/ansicht.js (Radmaße)
 * SCHREIBT: —
 * REGEL:    Koordinaten in Metern im RUMPF-System: +x = vorne, +y = rechts, (0, 0) = Rumpfmitte.
 *           Der Drehpunkt (Position im Zustand) liegt bei x = −RUMPF_VOR_DREHPUNKT_M — genau in der
 *           Mitte zwischen den zwei großen Traktionsrädern (Spieltest M2b).
 * DEBUG:    Räder sitzen falsch? RAD_X ausgeben; die Mitte von RAD_X[2] und RAD_X[3] muss TRAKTION_X sein.
 */

import { KOLOSS_LAENGE_M, KOLOSS_BREITE_M, RUMPF_VOR_DREHPUNKT_M } from '../data/koloss.js';
import { MITTE_BREITER_M } from '../data/ansicht.js';

export const L = KOLOSS_LAENGE_M;
export const B = KOLOSS_BREITE_M;

/** Mitte der Traktionsräder = Drehpunkt (Rumpf-System). */
export const TRAKTION_X = -RUMPF_VOR_DREHPUNKT_M;
/** Abstand der Lenkräder innerhalb einer Gruppe (m). */
const RAD_ABSTAND = 3.9;
/** Abstand der zwei großen Traktionsräder voneinander (m, Achse zu Achse). */
const TRAKTION_ABSTAND = 4.6;
/** Von der Drehpunkt-Mitte bis zur ersten Lenkrad-Achse davor bzw. dahinter (m). */
const BIS_LENKRAD = 8.8;

/** Acht Radsätze von hinten nach vorn: 2 Lenkräder, 2 große Traktionsräder, 4 Lenkräder. */
export const RAD_X = [
  TRAKTION_X - BIS_LENKRAD - RAD_ABSTAND,
  TRAKTION_X - BIS_LENKRAD,
  TRAKTION_X - TRAKTION_ABSTAND / 2, TRAKTION_X + TRAKTION_ABSTAND / 2,
  TRAKTION_X + BIS_LENKRAD,
  TRAKTION_X + BIS_LENKRAD + RAD_ABSTAND,
  TRAKTION_X + BIS_LENKRAD + 2 * RAD_ABSTAND,
  TRAKTION_X + BIS_LENKRAD + 3 * RAD_ABSTAND,
];
/** Die zwei Traktions-(Antriebs-)räder: ungelenkt, groß, breit, am Mittelteil (Spieltest M2b). */
export const TRAKTION = RAD_X.map((_, i) => i === 2 || i === 3);
/**
 * Einschlag je Radsatz als Anteil des vollen Einschlags: proportional zum Abstand vom Drehpunkt —
 * vorne mit der Kurve, hinten dagegen. So zeigen alle Räder auf denselben Kurvenmittelpunkt.
 */
export const EINSCHLAG = RAD_X.map((x, i) => (TRAKTION[i] ? 0 : (x - TRAKTION_X) / (RAD_X[RAD_X.length - 1] - TRAKTION_X)));

/** Verbreiterter Mittelteil um den Drehpunkt (13,6 m lang, Spieltest M2b). */
export const MITTE_VON = TRAKTION_X - 6.8;
export const MITTE_BIS = TRAKTION_X + 6.8;
/** Länge der schrägen Übergänge an beiden Enden des Mittelteils (m). */
export const MITTE_SCHRAEGE = 1.0;
/** Halbe Breiten: Fahrgestell (schwarz) und grüner Rumpf, außen und am Mittelteil. */
export const GESTELL_HALB = B / 2 - 0.9;
export const RUMPF_HALB = B / 2 - 1.6;
export const GESTELL_MITTE_HALB = GESTELL_HALB + MITTE_BREITER_M;
export const RUMPF_MITTE_HALB = B / 2 - 1.2 + MITTE_BREITER_M;

/** Schornstein und Dampfdom (Rumpf-System, m). */
export const SCHORNSTEIN_X = -2;
export const DOM_X = 2.6;
/**
 * Kleiner Schornstein (Spieltest M2b, Stelle vom Nutzer gewählt): direkt hinter dem großen, mittig
 * auf der Längsachse, am hinteren Ende des Hauptkessels. Liste, damit später weitere dazukommen
 * können. r = Radius (m), anteil = Rauchmenge und -größe im Verhältnis zum großen Schornstein.
 */
export const NEBEN_SCHORNSTEINE = /** @type {const} */ ([
  { x: -5.0, y: 0, r: 0.75, anteil: 0.6 },
]);

/** Hauptkessel: von hinten bis zur Rauchkammer vorn (m). */
export const KESSEL_VON = -5.5, KESSEL_BIS = 16.6;
/** Scheinwerfer an der Pufferbohle vorn: [x, y] je Lampe (m). */
export const LAMPEN = /** @type {const} */ ([[17.4, -2.1], [17.4, 2.1]]);

/**
 * Rumpfmitte aus der Lage des Drehpunkts (beides in Weltmetern).
 * @param {{x: number, y: number, h: number}} lage  Drehpunkt (aus dem Zustand)
 * @returns {{x: number, y: number, h: number}}
 */
export function rumpfLage(lage) {
  return { x: lage.x + Math.cos(lage.h) * RUMPF_VOR_DREHPUNKT_M, y: lage.y + Math.sin(lage.h) * RUMPF_VOR_DREHPUNKT_M, h: lage.h };
}

/**
 * Punkt im Rumpf-System → Weltmeter.
 * @param {{x: number, y: number, h: number}} rumpf @param {number} lx @param {number} ly
 * @returns {[number, number]}
 */
export function rumpfPunkt(rumpf, lx, ly) {
  const c = Math.cos(rumpf.h), s = Math.sin(rumpf.h);
  return [rumpf.x + c * lx - s * ly, rumpf.y + s * lx + c * ly];
}
