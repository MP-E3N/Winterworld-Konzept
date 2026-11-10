// @ts-check
/**
 * fundstellen.js — Werte für Fundstellen, Bergen und Laderaum (M3).
 *
 * ZWECK:    Welche Fundarten es gibt, wie viel darin liegt, wie lange das Bergen dauert, wie häufig
 *           sie sind und wie viel der Laderaum fasst. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M3-fundstellen.md, KONZEPT.md §4
 * DEBUG:    `ek.funde()` listet die Fundstellen in der Nähe, `ek.ladung()` den Laderaum.
 *
 * EINHEITEN: Gewichte in kg (Ganzzahl), Strecken in Metern (werden in sim/ nach µm umgerechnet),
 * Arbeit in „Mann-Ticks“ (ein Mann arbeitet einen Tick = 1/20 s).
 */

import { kmhZuTempo } from './koloss.js';
import { TICKS_PRO_SEKUNDE } from './takt.js';

/** @typedef {'kohle' | 'holz' | 'oel' | 'nahrung'} Ware */

/**
 * Waren im Laderaum, in fester Reihenfolge (Anzeige, Zustand `koloss.ladung`).
 * @type {readonly {ware: Ware, name: string, farbe: string}[]}
 */
export const WAREN = [
  { ware: 'kohle', name: 'Kohle', farbe: '#2b2e33' },
  { ware: 'holz', name: 'Holz', farbe: '#8a5a2b' },
  { ware: 'oel', name: 'Öl', farbe: '#8c2f1d' },
  { ware: 'nahrung', name: 'Vorräte', farbe: '#c9b27a' },
];

/** So viele Leute hat ein Bergungstrupp (ab M4 kommt das aus der Crew). */
export const TRUPP_LEUTE = 6;

/**
 * Sekunden Arbeit des ganzen Trupps für ein Stück → Mann-Ticks.
 * @param {number} sekunden
 * @returns {number}
 */
function arbeit(sekunden) {
  return Math.round(sekunden * TICKS_PRO_SEKUNDE * TRUPP_LEUTE);
}

/**
 * Fundarten. Index = Art-Nummer (Fundstelle.art).
 *   stueckKg     so viel trägt der Trupp auf einmal in den Laderaum
 *   stuecke      so viele Stücke liegen darin (zufällig zwischen min und max)
 *   arbeit       Mann-Ticks je Stück
 *   gewicht      Häufigkeit (relativ zu den anderen); Öl siehe OEL_GEWICHT_MAX
 *   radiusM      Größe in der Darstellung und beim Anklicken
 * WARUM so: Eine Kohlehalde hält 30–80 s auf (Kernschleife 1–3 min), Öl ist wenig und dauert je Fass.
 * @type {readonly {name: string, ware: Ware, stueckKg: number, stueckeMin: number, stueckeMax: number, arbeit: number, gewicht: number, radiusM: number}[]}
 */
export const FUNDARTEN = [
  { name: 'Kohlehalde', ware: 'kohle', stueckKg: 500, stueckeMin: 12, stueckeMax: 32, arbeit: arbeit(2), gewicht: 40, radiusM: 9 },
  { name: 'Ruine', ware: 'holz', stueckKg: 250, stueckeMin: 12, stueckeMax: 32, arbeit: arbeit(2), gewicht: 35, radiusM: 10 },
  { name: 'Ölfässer', ware: 'oel', stueckKg: 200, stueckeMin: 3, stueckeMax: 8, arbeit: arbeit(3), gewicht: 0, radiusM: 5 },
  { name: 'Vorratslager', ware: 'nahrung', stueckKg: 100, stueckeMin: 8, stueckeMax: 24, arbeit: arbeit(1.5), gewicht: 25, radiusM: 6 },
];

/** Art-Nummern zum Lesen im Code. */
export const KOHLEHALDE = 0;
export const RUINE = 1;
export const OELFAESSER = 2;
export const VORRATSLAGER = 3;

// ── Verteilung in der Welt ────────────────────────────────

/** Kantenlänge einer Fundzelle (m). Jede Zelle hat höchstens eine Fundstelle. */
export const FUND_ZELLE_M = 200;
/** Abstand der Fundstelle vom Zellrand (m) — so berühren sich Nachbarn nie. */
export const FUND_RAND_M = 30;
/** Chance (Prozent) auf eine Fundstelle je Zelle … */
export const FUND_CHANCE = 30;
/** … und rund um den Start (bis START_FUND_M), damit man gleich etwas findet. */
export const FUND_CHANCE_START = 65;
export const START_FUND_M = 450;
/** So nah am Startpunkt liegt nie eine Fundstelle (dort steht der Koloss). */
export const START_ABSTAND_M = 45;
/** Öl gibt es erst ab dieser Entfernung (m, größeres der beiden Maße wie beim Gelände) … */
export const OEL_AB_M = 1500;
/** … und ab hier mit voller Häufigkeit (Gewicht OEL_GEWICHT_MAX). */
export const OEL_VOLL_M = 5000;
export const OEL_GEWICHT_MAX = 22;

// ── Bergen und Laderaum ───────────────────────────────────

/** Reichweite des Trupps: Abstand Rumpfmitte → Mitte der Fundstelle (m). */
export const BERGEN_REICHWEITE_M = 60;
/** Bis zu diesem Tempo gilt der Koloss als stehend (µm/Tick, je Richtung).
 * WARUM nicht 0: Auf Eis klingt Rutschen in Ganzzahlen nie ganz auf 0 ab (Rest < 0,1 km/h). */
export const STAND_TEMPO = kmhZuTempo(0.1);
/** Fassungsvermögen des Laderaums (kg, Summe aller Waren). */
export const LADERAUM_KG = 60000;
/** Gewicht bremst: Bei vollem Laderaum hat der Kessel so viele Promille weniger Schub. */
export const GEWICHT_BREMST_PROMILLE = 250;
