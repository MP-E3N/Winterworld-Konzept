// @ts-check
/**
 * ansicht.js — Werte der Darstellung (Zoom, Farben). Kein Spielzustand, nur Optik.
 * REGEL: KONZEPT.md §6
 */

/** Zoom in Bildpunkten pro Meter. 40 = Koloss (40 m) füllt einen großen Bildschirm. */
export const ZOOM_MAX = 40;
/** 0,05 = 16 km passen auf 800 Bildpunkte. */
export const ZOOM_MIN = 0.05;
/** Startzoom: Koloss ≈ 190 Bildpunkte lang, Umgebung gut sichtbar. */
export const ZOOM_START = 6;
/** Faktor pro Mausrad-Raste. */
export const ZOOM_SCHRITT = 1.2;
/** Zeitkonstante des weichen Zooms (ms). */
export const ZOOM_WEICH = 90;

/** Unter dieser Länge in Bildpunkten wird der Koloss als Symbol gezeichnet. */
export const KOLOSS_SYMBOL_AB_PX = 26;

/** Farben des Kolosses (Stil: grüner Rumpf, schwarze Kessel, Kupfer, rote Räder). */
export const FARBEN_KOLOSS = {
  gruen: '#3e5c36',
  gruenHell: '#5e8350',
  gruenDunkel: '#263b22',
  schwarz: '#16191b',
  grau: '#3a3f44',
  kupfer: '#b5703a',
  rot: '#a52a1f',
  schatten: 'rgba(40, 55, 70, 0.28)',
};

/** Durchmesser der Lenkräder (m). */
export const RAD_DURCHMESSER_M = 2.8;

/** Durchmesser der zwei großen Traktions-(Antriebs-)räder (m) — bestimmt auch Dampftakt und die
 * Dampfmaschine im HUD (die Kolben treiben diese Räder). Spieltest M2b: 2 große statt 3 kleine. */
export const TRAKTION_DURCHMESSER_M = 3.8;

/** Grundbreite der Räder (m); die Traktionsräder sind TRAKTION_UEBERSTAND_M breiter. */
export const RAD_BREITE_M = 0.9;

/** Breite der Lenkräder (m). Spieltest M2b: nach innen viel breiter (vorher 0,9), Außenkante bleibt. */
export const LENKRAD_BREITE_M = 1.7;

/** So viel breiter als RAD_BREITE_M sind die Traktionsräder; sie ragen entsprechend nach außen (m). */
export const TRAKTION_UEBERSTAND_M = 1.7;

/**
 * So viel ist der Mittelteil über den drei Traktionsrädern je Seite breiter als der übrige Rumpf (m).
 * Die Traktionsräder rücken um denselben Wert nach außen (Spieltest M2b). Nur Optik — die
 * Kollision rechnet weiter mit KOLOSS_BREITE_M.
 */
export const MITTE_BREITER_M = 0.9;

/** Größter Radeinschlag des vordersten Radsatzes bei vollem Lenken (Bogenmaß, ≈ 11,5°).
 * Spieltest M2b: 0,35 → 0,2 (passt zum größeren Wendekreis). */
export const RAD_EINSCHLAG_MAX = 0.2;

/**
 * Schattenwurf bei fester Sonne (Sonne im Nordwesten): Versatz in WELTmetern pro Meter Höhe.
 * WARUM Welt und nicht Fahrzeug: Dreht der Koloss, bleibt die Sonne, wo sie ist — der Schatten
 * muss also immer nach Südosten fallen.
 */
export const SCHATTEN_PRO_HOEHE = { x: 0.42, y: 0.58 };

/** Scheinwerfer: Reichweite (m) und halber Öffnungswinkel (Grad) je Lichtkegel. */
export const LICHT_REICHWEITE_M = 85;
export const LICHT_KEGEL_GRAD = 17;
/** Deckkraft des Lichtkegels bei hellem Tag (nur ein goldener Schimmer auf dem Schnee). */
export const LICHT_TAG_DECKKRAFT = 0.3;
/** So dunkel wird es in tiefer Nacht (0 … 1; ab M4a aus der Tageszeit, sim/wetter/tag.js). */
export const NACHT_MAX = 0.85;
/** Farbe der Nacht (r, g, b) — kaltes Dunkelblau. */
export const NACHT_FARBE = '6, 10, 22';

/** Rasterlinien: Abstände in Metern (fein → grob). */
export const RASTER_M = [10, 100, 1000, 10000];
