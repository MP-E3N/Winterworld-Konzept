// @ts-check
/**
 * welt.js — Werte des Weltgenerators (M2).
 *
 * ZWECK:    Größen und Schwellen, mit denen aus dem Rauschen Gelände wird. Zum Abstimmen hier
 *           drehen und mit `node tools/welt-ansehen.js <seed>` bzw. tests/welt.test.js prüfen.
 * REGEL:    docs/specs/M2-welt.md, KONZEPT.md §5
 *
 * EINHEIT: Der Generator rechnet in „Feinpunkten“ zu 25 cm (FEIN_UM). Rauschen ist weich, deshalb
 * sehen Ufer und Felsränder auch ganz nah glatt aus — und die Kollision benutzt GENAU dieselben
 * Werte (keine Treppen, kein Versatz zwischen Bild und Physik; Spieltest M2).
 * Alle Größen unten sind in Metern angegeben und werden mit FEIN_PRO_M umgerechnet.
 *
 * Rauschwerte liegen in 0 … 65535 und häufen sich um 32768 (Mittel mehrerer Zufallswerte).
 */

/** Ein Feinpunkt in µm (25 cm). */
export const FEIN_UM = 250000;
/** Feinpunkte pro Meter. */
export const FEIN_PRO_M = 4;

/** Seed 0 ist das feste Testgelände aus M1 (Kreise + Felsblock), keine generierte Welt. */
export const TESTGELAENDE_SEED = 0;

/** Startbereich (m): bis hier nur Packschnee … */
export const START_FREI_M = 160;
/** … und bis hier weder Fels noch Schlucht. */
export const START_SICHER_M = 400;

/** Ab dieser Entfernung (m) gilt der äußerste Ring: mehr Fels, mehr Eis. */
export const RING_M = 5000;

/**
 * Ebenen: ein sehr grobes Rauschen teilt die Welt in offene Ebenen und zerklüftetes Land.
 * In der Ebene gibt es kaum Fels und keine Schluchten (Spieltest M2: „größere freie Flächen“).
 */
export const EBENE_GROESSE_M = 5200;
export const EBENE_AB = 33000;
/** So viel höher liegt die Felsschwelle in der Ebene (fast kein Fels). */
export const EBENE_FELS_BONUS = 9000;

/** Höhenfeld: gröbste Struktur (m). Groß = zusammenhängende Gebirgsmassive statt Flickenteppich. */
export const HOEHE_GROESSE_M = 1800;
/** Fels ab dieser Höhe; mit dem Ring sinkt die Schwelle um RING_FELS (mehr Berge weiter draußen). */
export const FELS_AB = 42000;
export const RING_FELS = 3000;
/** Kurz unter der Felsschwelle liegt Pulverschnee (Schnee am Bergfuß). */
export const BERGFUSS = 2200;

/** Schluchten: Linien, wo ein Rauschen genau die Mitte kreuzt. Groß = wenige, lange Schluchten. */
export const SCHLUCHT_GROESSE_M = 1300;
export const SCHLUCHT_BREITE = 900;
/** Furten: Wo dieses zweite Rauschen hoch ist, ist die Schlucht unterbrochen. */
export const FURT_GROESSE_M = 160;
export const FURT_AB = 40000;

/** Seen: niedriges Rauschen + nicht im Gebirge. Rand (SEE_RAND) dünn, Mitte dick. */
export const SEE_GROESSE_M = 900;
export const SEE_BIS = 22500;
export const RING_SEE = 2500;
export const SEE_RAND = 1800;
export const SEE_MAX_HOEHE = 38000;

/** Pulverschnee-Wehen. */
export const WEHE_GROESSE_M = 260;
export const WEHE_AB = 41500;
