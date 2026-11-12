// @ts-check
/**
 * siedlungen.js — Werte und Lage der Siedlungen (M4d: nur die Heimatsiedlung am Start).
 *
 * ZWECK:    Wo die Siedlung liegt, welche Gebäude sie hat (die sind Hindernisse), wie weit „in der
 *           Siedlung“ reicht und was die Crew dort bekommt. Zum Abstimmen nur hier drehen.
 *           Die Siedlung steht NICHT im Zustand (wie das Gelände) — nur ihre Depots (state.depots).
 * REGEL:    docs/specs/M4d-siedlung.md, KONZEPT.md §2 (Siedlungen, F6)
 * DEBUG:    F3 zeigt „Siedlung“ (Heimat, drin ja/nein, Depot). Tests: tests/siedlung.test.js.
 *
 * EINHEITEN: Lage und Gebäude in Metern (Norden = −y), Parkplatz in µm wie data/koloss.js START_X.
 */

import { START_X, START_Y, START_RICHTUNG } from './koloss.js';
import { VOLL } from './crew.js';

/**
 * Ein Gebäude: Mitte (dx, dy) relativ zur Siedlungsmitte, Breite b und Tiefe t (m, achsparallel).
 * art: 'huette' | 'depot' | 'ofen' | 'wand'
 * @typedef {{art: string, dx: number, dy: number, b: number, t: number}} Gebaeude
 */

/**
 * @typedef {Object} Siedlung
 * @property {string} name
 * @property {number} x  Mitte (m)
 * @property {number} y
 * @property {{x: number, y: number, h: number}} park  Hier steht ein neuer Koloss (µm, Winkel)
 * @property {readonly Gebaeude[]} gebaeude
 */

/**
 * Die Siedlungen der Welt. Index = Siedlungs-ID (k.heimat, depot.siedlung).
 * Heimstatt: Mitte 60 m hinter dem Startpunkt; der Koloss parkt am Nordrand, Ausfahrt nach Norden frei.
 * Hütten im Halbrund nach Süden, Windschutz dahinter, Depot-Schuppen rechts, Generator in der Mitte.
 * WARUM feste Zahlen statt Kreisformel: Daten bleiben auf jedem Rechner gleich (kein Math.cos).
 * @type {readonly Siedlung[]}
 */
export const SIEDLUNGEN = [
  {
    name: 'Heimstatt', x: 0, y: 60,
    park: { x: START_X, y: START_Y, h: START_RICHTUNG },
    gebaeude: [
      // Der Generator (M5b: „Stadt, in der ein Generator noch funktioniert“) — hält die Stadt warm.
      { art: 'ofen', dx: 0, dy: 4, b: 10, t: 10 },
      { art: 'depot', dx: 27, dy: -12, b: 15, t: 9 },
      { art: 'huette', dx: 31, dy: 14, b: 10, t: 7 },
      { art: 'huette', dx: 22, dy: 27, b: 9, t: 7 },
      { art: 'huette', dx: 8, dy: 34, b: 10, t: 7 },
      { art: 'huette', dx: -8, dy: 34, b: 10, t: 7 },
      { art: 'huette', dx: -22, dy: 27, b: 9, t: 7 },
      { art: 'huette', dx: -31, dy: 14, b: 10, t: 7 },
      { art: 'wand', dx: 0, dy: 46, b: 64, t: 2 },
      { art: 'wand', dx: -41, dy: 30, b: 2, t: 30 },
      { art: 'wand', dx: 41, dy: 30, b: 2, t: 30 },
    ],
  },
];

/** Heimat eines neuen Kolosses (Index in SIEDLUNGEN). */
export const START_HEIMAT = 0;

/** „In der Siedlung“: Rumpfmitte höchstens so weit von der Mitte (m). Der Parkplatz liegt darin. */
export const SIEDLUNG_RADIUS_M = 75;
/** So nah an einer Siedlungsmitte liegt nie eine Fundstelle aus dem Seed (m). */
export const SIEDLUNG_FREI_M = 90;

/** Höchstens so viele Leute an Bord (Heizer + Arbeiter). Start: 4 + 6. */
export const KOJEN = 20;

/** In der Siedlung (im Stand): Wärme, in der die Crew sitzt (Zehntel °C, Hütten am Ofen) … */
export const SIEDLUNG_WAERME = 180;
/** … so schnell wird sie satt (je Tick; leer → voll in ~1 min) — die Siedlung gibt das Essen … */
export const SIEDLUNG_SATT = 850;
/** … und so schnell erholt sie sich (je Tick; 0 → voll in ~4 min). */
export const SIEDLUNG_ERHOLUNG = Math.ceil(VOLL / 4800);

/** Waren im Depot (gleiche Namen wie in den Lagern; Holz aus beiden Lagern zusammen). */
export const DEPOT_WAREN = /** @type {const} */ (['kohle', 'holz', 'oel', 'nahrung']);
