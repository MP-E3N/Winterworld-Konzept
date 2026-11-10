// @ts-check
/**
 * testgelaende.js — Feste Testflächen für M1, damit man Eis und Pulverschnee schon fühlen kann.
 *
 * ZWECK:    Kreise mit anderem Untergrund rund um den Start. In M2 ersetzt der Seed-Generator
 *           diese Liste; die Abfrage sim/welt/untergrund.js bleibt gleich.
 * REGEL:    KONZEPT.md §10 M1
 *
 * Koordinaten in Metern, Startpunkt = (0, 0), Norden = −y. Spätere Einträge liegen oben.
 */

import { PULVERSCHNEE, EIS_DICK, EIS_DUENN, FELS } from './untergrund.js';

/** @type {readonly {untergrund: number, x: number, y: number, r: number}[]} */
export const TESTFLAECHEN = [
  { untergrund: EIS_DUENN, x: 0, y: -450, r: 195 },     // Rand des großen Sees (dünn) …
  { untergrund: EIS_DICK, x: 0, y: -450, r: 180 },      // … und seine Mitte (dick), geradeaus im Norden
  { untergrund: PULVERSCHNEE, x: -380, y: -60, r: 130 }, // Schneewehe im Westen
  { untergrund: PULVERSCHNEE, x: 260, y: -700, r: 110 }, // Wehe am Nordostufer des Sees
  { untergrund: EIS_DICK, x: 420, y: 160, r: 90 },       // kleiner Teich im Südosten
  { untergrund: FELS, x: 0, y: 420, r: 60 },             // Felsblock im Süden (Kollisionstest)
];

/**
 * Feste Fundstellen im Testgelände (M3), je eine pro Art. Meter, `art` = Index in
 * data/fundstellen.js FUNDARTEN. Jede muss in einer eigenen 200-m-Fundzelle liegen.
 * Die Kohlehalde ist vom Start aus in Reichweite (Tests, Testfahrt), die Ruine knapp nicht.
 * @type {readonly {art: number, x: number, y: number, stuecke: number}[]}
 */
export const TESTFUNDE = [
  { art: 0, x: 40, y: -10, stuecke: 16 },    // Kohlehalde rechts neben dem Start (Zelle 0/−1)
  { art: 1, x: -60, y: 30, stuecke: 12 },    // Ruine links hinten (Zelle −1/0)
  { art: 3, x: 90, y: 120, stuecke: 10 },    // Vorratslager im Südosten (Zelle 0/0)
  { art: 2, x: -150, y: -250, stuecke: 5 },  // Ölfässer im Nordwesten vor dem See (Zelle −1/−2)
];
