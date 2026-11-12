// @ts-check
/**
 * nebel.js — Werte der Schneewehen-Decke (M5b, nur Darstellung): Sichtweite, Zuwehen, Spur.
 *
 * ZWECK:    Nutzerwunsch: Die Karte ist überwiegend von Schneewehen verdeckt, man muss den Weg finden.
 *           Gesehenes weht nach einigen Minuten wieder zu; die eigene Spur bleibt länger frei.
 * REGEL:    docs/specs/M5b-rettung.md „Darstellung“
 * DEBUG:    Testknopf „Nebel aus“ unten rechts, Konsole ek.nebel(false).
 */

/** Sichtweite um den Koloss (m): bei Tag ohne Sturm (Nutzerwahl) … */
export const SICHT_TAG_M = 300;
/** … in tiefer Nacht … */
export const SICHT_NACHT_M = 110;
/** … und im vollen Sturm nur noch dieser Anteil davon. */
export const SICHT_STURM_ANTEIL = 0.35;
/** Scheinwerfer reichen in der Decke so weit voraus (m). */
export const SICHT_LICHT_M = 200;

/** Gedächtnis der Karte: so viele Meter je Maskenpunkt … */
export const MASKE_M_JE_PX = 10;
/** … und so groß (Punkte je Seite) — bei 10 m also ±8 km um den Start. */
export const MASKE_PX = 1600;

/** Zuwehen: alle so viele Ticks (5 s) … */
export const ZUWEHEN_TICKS = 100;
/** … verliert Gesehenes so viel Sicht (Anteil): nach ~4 min ist es zu ~90 % wieder zugeweht. */
export const ZUWEHEN_ANTEIL = 0.046;

/** Nebelschwaden (Spieltest M5b: „richtiger Nebel“ statt Reiskörner): Eine Rauschkachel ist auf dem
 * Bildschirm etwa so groß (Bildpunkte) — in jeder Zoomstufe gleich. */
export const SCHWADEN_PX = 520;
/** Die Schwaden ziehen mit diesem Anteil der Windgeschwindigkeit (langsamer als der Wind = träge Nebelbänke). */
export const SCHWADEN_ZUG = 0.35;
// (Die frei gehaltene eigene Spur ist seit dem Spieltest M5b entfernt — dafür gibt es Laternen.)

/** Deckkraft der Decke (ein Hauch Gelände bleibt erahnbar). */
export const DECKE_DECKKRAFT = 0.95;
/** Farbe der Decke: kühles Grau-Blau, deutlich anders als der weiße Schnee darunter. */
export const DECKE_FARBE = '#c9d3de';
