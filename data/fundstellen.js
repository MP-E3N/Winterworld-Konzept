// @ts-check
/**
 * fundstellen.js — Werte für Fundstellen, Bergen und Laderaum (M3).
 *
 * ZWECK:    Welche Fundarten es gibt, wie viel darin liegt, wie lange das Bergen dauert, wie häufig
 *           sie sind und wie viel der Laderaum fasst. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M3-fundstellen.md, KONZEPT.md §4
 * DEBUG:    `ek.funde()` listet die Fundstellen in der Nähe, `ek.ladung()` die Lager.
 *
 * EINHEITEN: Gewichte in kg (Ganzzahl), Strecken in Metern (werden in sim/ nach µm umgerechnet),
 * Arbeit in „Mann-Ticks“ (ein Mann arbeitet einen Tick = 1/20 s).
 */

import { kmhZuTempo } from './koloss.js';
import { TICKS_PRO_SEKUNDE } from './takt.js';

/** @typedef {'kohle' | 'holz' | 'oel' | 'nahrung'} Ware */

/**
 * Waren in fester Reihenfolge (Namen und Farben für Anzeige und Lager-Popup).
 * @type {readonly {ware: Ware, name: string, farbe: string}[]}
 */
export const WAREN = [
  { ware: 'kohle', name: 'Kohle', farbe: '#2b2e33' },
  { ware: 'holz', name: 'Holz', farbe: '#8a5a2b' },
  { ware: 'oel', name: 'Öl', farbe: '#8c2f1d' },
  { ware: 'nahrung', name: 'Vorräte', farbe: '#c9b27a' },
];

/** Auf so viele Leute ist die Arbeit je Stück bemessen (FUNDARTEN.arbeit). Ab M4b ist der Trupp die
 * Zahl der gesunden Arbeiter (sim/koloss/crew.js) — mit 6 Gesunden dauert ein Stück genau so lange. */
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

// ── Zwei Lager (Spieltest M4a, Nutzerwunsch) ──────────────

/**
 * Brennstofflager (Kohle, Holz, Öl — daraus heizt der Kessel) und Warenlager (Holz als Baustoff,
 * Vorräte, später Ersatzteile). Holz passt in beide; wohin neu geborgenes Holz kommt, sagt
 * k.holzZiel. Index = Lager-Nummer in Befehlen.
 * @type {readonly {schluessel: 'brennstoff' | 'waren', name: string, kg: number, waren: readonly Ware[]}[]}
 */
export const LAGER = [
  { schluessel: 'brennstoff', name: 'Brennstofflager', kg: 100000, waren: ['kohle', 'holz', 'oel'] },
  { schluessel: 'waren', name: 'Warenlager', kg: 60000, waren: ['holz', 'nahrung'] },
];
export const BRENNSTOFFLAGER = 0;
export const WARENLAGER = 1;

/** Gewicht bremst: je GEWICHT_BEZUG_KG Ladung so viele Promille weniger Schub (160 t voll ≈ −32 %). */
export const GEWICHT_BREMST_PROMILLE = 200;
export const GEWICHT_BEZUG_KG = 100000;

// ── Abwerfen (Spieltest M4a) ──────────────────────────────

/** So viel wirft ein Klick ab (kg); mit Umschalt die ganze Ware. */
export const ABWERFEN_KG = 1000;
/** Abgeworfenes landet so weit hinter der Rumpfmitte (m) — in Reichweite des Trupps. */
export const ABWURF_HINTER_M = 26;
/** Verschiedene Waren landen so weit nebeneinander (m). */
export const ABWURF_SEITE_M = 7;
/** Liegt schon ein Haufen derselben Ware so nah (m), wird er größer statt eines neuen. */
export const ABWURF_ZUSAMMEN_M = 12;
/** Wieder aufnehmen geht schneller als bergen (Prozent der Arbeit der Fundart). */
export const ABWURF_ARBEIT_PROZENT = 50;
