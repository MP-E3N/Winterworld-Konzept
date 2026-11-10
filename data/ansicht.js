// @ts-check
/**
 * ansicht.js — Werte der Darstellung (Zoom, Farben). Kein Spielzustand, nur Optik.
 * REGEL: KONZEPT.md §6
 */

/** Zoom in Bildpunkten pro Meter. 40 = Koloss (32 m) füllt einen großen Bildschirm. */
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

/** Raddurchmesser (m) — für Raddrehung, Dampftakt und die Dampfmaschine im HUD. */
export const RAD_DURCHMESSER_M = 2.8;

/** Breite der normalen Räder (m). */
export const RAD_BREITE_M = 0.9;

/** So weit ragen die drei mittleren Traktionsräder seitlich über den Rumpf hinaus (m). */
export const TRAKTION_UEBERSTAND_M = 1.1;

/** Größter Radeinschlag der vorderen/hinteren Radsätze bei vollem Lenken (Bogenmaß, ≈ 14°). */
export const RAD_EINSCHLAG_MAX = 0.25;

/**
 * Schattenwurf bei fester Sonne (Sonne im Nordwesten): Versatz in WELTmetern pro Meter Höhe.
 * WARUM Welt und nicht Fahrzeug: Dreht der Koloss, bleibt die Sonne, wo sie ist — der Schatten
 * muss also immer nach Südosten fallen.
 */
export const SCHATTEN_PRO_HOEHE = { x: 0.42, y: 0.58 };

/** Rasterlinien: Abstände in Metern (fein → grob). */
export const RASTER_M = [10, 100, 1000, 10000];
