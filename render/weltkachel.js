// @ts-check
/**
 * weltkachel.js — Berechnet EIN Kachelbild des Geländes.
 *
 * ZWECK:    Aus dem Generator ein 64 × 64-Bild machen: Grundfarbe je Untergrund, Hangschattierung
 *           (Licht aus Nordwest, passend zum Schatten), Kantenglättung an Geländegrenzen, Körnung.
 *           Welche Kacheln wann berechnet werden, entscheidet render/welt.js.
 * LIEST:    Gelände über sim/welt/generator.js (dieselbe Abfrage wie die Kollision)
 * SCHREIBT: nur das neue Kachel-Canvas
 * REGEL:    docs/specs/M2-welt.md „Darstellung“
 * DEBUG:    `ek.kacheln().msLetzte` = Rechenzeit der letzten Kachel (≈ 2 ms).
 */

import { gelaendeAn } from '../sim/welt/generator.js';
import { UNTERGRUND, FELS, SCHLUCHT, EIS_DICK, EIS_DUENN } from '../data/untergrund.js';
import { FEIN_PRO_M } from '../data/welt.js';

/** Bildpunkte je Kachelkante. */
export const PIXEL = 64;

/** Zähler für die Konsole. */
export const messung = { erzeugt: 0, msLetzte: 0 };

/**
 * Berechnet ein Kachelbild aus dem Generator (Feinpunkte zu 25 cm, siehe data/welt.js).
 * @param {number} seed
 * @param {number} mProPx  Meter je Kachel-Bildpunkt
 * @param {number} tx @param {number} ty  Kachelnummer in dieser Stufe
 * @returns {HTMLCanvasElement}
 */
export function kachelErzeugen(seed, mProPx, tx, ty) {
  const t0 = performance.now();
  // Ein Rand von je einem Bildpunkt rundum: für Hangschattierung und Kantenglättung.
  const n = PIXEL + 2;
  const werte = new Int32Array(n * n);
  const schritt = mProPx * FEIN_PRO_M; // Feinpunkte je Bildpunkt
  const fx0 = (tx * PIXEL - 1) * schritt, fy0 = (ty * PIXEL - 1) * schritt;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) werte[y * n + x] = gelaendeAn(seed, fx0 + x * schritt, fy0 + y * schritt);
  }
  // 1. Farben aller Punkte (inkl. Rand).
  const farben = new Float32Array(n * n * 3);
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const w = werte[y * n + x];
      const hoehe = w & 0xffff, tiefer = werte[(y + 1) * n + x + 1] & 0xffff;
      // Hang auf 4 m umgerechnet, damit die Schattierung in jeder Stufe gleich stark wirkt.
      farbeSetzen(farben, (y * n + x) * 3, Math.floor(w / 65536), hoehe, ((hoehe - tiefer) * 4) / mProPx);
    }
  }
  // 2. Kantenglättung: Wo ein Nachbar anderes Gelände hat, wird über 3 × 3 gemittelt. Dadurch
  //    haben schräge Ufer und Schluchtränder keine Sägezähne mehr (Spieltest M2).
  const c = document.createElement('canvas');
  c.width = PIXEL; c.height = PIXEL;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const bild = g.createImageData(PIXEL, PIXEL);
  const d = bild.data;
  for (let y = 1; y <= PIXEL; y++) {
    for (let x = 1; x <= PIXEL; x++) {
      const i = y * n + x, typ = Math.floor(werte[i] / 65536);
      const rand = Math.floor(werte[i - 1] / 65536) !== typ || Math.floor(werte[i + 1] / 65536) !== typ
        || Math.floor(werte[i - n] / 65536) !== typ || Math.floor(werte[i + n] / 65536) !== typ;
      const o = ((y - 1) * PIXEL + (x - 1)) * 4;
      for (let k = 0; k < 3; k++) {
        if (!rand) { d[o + k] = farben[i * 3 + k]; continue; }
        let summe = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) summe += farben[(i + dy * n + dx) * 3 + k] * (dx === 0 && dy === 0 ? 2 : 1);
        }
        d[o + k] = summe / 10;
      }
      d[o + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  messung.erzeugt += 1;
  messung.msLetzte = performance.now() - t0;
  return c;
}

/**
 * Farbe eines Bildpunkts: Grundfarbe des Untergrunds, Hangschattierung, etwas Körnung.
 * @param {Float32Array} d  Farbliste (r, g, b je Punkt) @param {number} i  Index des Rot-Werts
 * @param {number} typ @param {number} hoehe
 * @param {number} hang  Höhenunterschied auf 4 m nach Südosten (+ = Hang zur Sonne hin, hell)
 */
function farbeSetzen(d, i, typ, hoehe, hang) {
  const [r, gr, b] = UNTERGRUND[typ].farbe;
  // Fels: kräftige Schattierung und dunkler mit der Höhe; Schnee: nur ein Hauch.
  // Schnee nur ganz leicht (sonst wirken Hügel wie graue Schmutzwolken).
  const fels = typ === FELS;
  const staerke = fels ? 0.003 : typ === SCHLUCHT ? 0 : 0.00015;
  const grenze = fels ? 0.35 : 0.05;
  let licht = 1 + Math.max(-grenze, Math.min(grenze, hang * staerke));
  if (typ === FELS) licht *= 1.1 - (hoehe - 40000) / 90000;
  // Schlieren im Eis: langsam wechselnde Helligkeit entlang der Höhenlinien.
  if (typ === EIS_DICK || typ === EIS_DUENN) licht *= 1 + (((hoehe >> 9) & 7) - 4) / 300;
  // Körnung echt zufällig (nicht aus der Höhe — das ergab Ringmuster wie Holzmaserung).
  const koernung = Math.random() * 8 - 4;
  d[i] = r * licht + koernung;
  d[i + 1] = gr * licht + koernung;
  d[i + 2] = b * licht + koernung;
}
