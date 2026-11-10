// @ts-check
/**
 * welt.js — Zeichnet das Gelände in Kacheln mit drei Detailstufen.
 *
 * ZWECK:    Die Welt ist unbegrenzt. Gezeichnet wird nur, was sichtbar ist, und zwar so fein, wie es
 *           der Zoom verlangt: Jede Kachel ist ein 64 × 64-Bild mit 0,25 m … 64 m pro Bildpunkt.
 *           Ganz nah also 25 cm — keine Treppen an Ufern und Felsen (Spieltest M2). Weich hochskaliert (Schnee hat ohnehin keine harten Kanten),
 *           Fels und Schneehügel mit Hangschattierung (Licht aus Nordwest, passend zum Schatten).
 * LIEST:    Gelände über sim/welt/generator.js (dieselbe Abfrage wie die Kollision), Kamera
 * SCHREIBT: eigenen Kachel-Speicher (kein Spielzustand)
 * REGEL:    docs/specs/M2-welt.md „Darstellung“
 * DEBUG:    `ek.kacheln()` zeigt Anzahl und Rechenzeit. Fehlen Kacheln lange, BUDGET_MS erhöhen.
 */

import { kamera } from './kamera.js';
import { gelaendeAn } from '../sim/welt/generator.js';
import { UNTERGRUND, FELS, SCHLUCHT, EIS_DICK, EIS_DUENN } from '../data/untergrund.js';
import { FEIN_PRO_M } from '../data/welt.js';

const PIXEL = 64;                 // Bildpunkte je Kachelkante
/**
 * Detailstufen: Meter je Kachel-Bildpunkt und ab welchem Zoom (px/m). Gewechselt wird, sobald ein
 * Kachel-Bildpunkt größer als ~3 Bildschirmpunkte würde (dann sähe man ihn als Klötzchen).
 */
const STUFEN = [
  { mProPx: 0.25, abZoom: 8 },
  { mProPx: 0.5, abZoom: 3.5 },
  { mProPx: 1, abZoom: 1.6 },
  { mProPx: 2, abZoom: 0.7 },
  { mProPx: 4, abZoom: 0.3 },
  { mProPx: 16, abZoom: 0.07 },
  { mProPx: 64, abZoom: 0 },
];
/** Höchstens so viel Rechenzeit pro Bild für neue Kacheln (ms). */
const BUDGET_MS = 6;
/** Höchstens so viele Kacheln behalten (je 16 KB). */
const SPEICHER_MAX = 900;

/** @type {Map<string, HTMLCanvasElement>} */
const kacheln = new Map();
const messung = { erzeugt: 0, msLetzte: 0 };

/**
 * Zeichnet alle sichtbaren Kacheln.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} seed
 */
export function weltZeichnen(ctx, seed) {
  const stufeNr = STUFEN.findIndex((s) => kamera.zoom >= s.abZoom);
  const stufe = STUFEN[stufeNr];
  const kachelM = PIXEL * stufe.mProPx;
  const kachelPx = kachelM * kamera.zoom;
  const links = kamera.x - kamera.breite / 2 / kamera.zoom, oben = kamera.y - kamera.hoehe / 2 / kamera.zoom;
  const tx0 = Math.floor(links / kachelM), ty0 = Math.floor(oben / kachelM);
  const tx1 = Math.floor((links + kamera.breite / kamera.zoom) / kachelM);
  const ty1 = Math.floor((oben + kamera.hoehe / kamera.zoom) / kachelM);
  const start = performance.now();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Von der Mitte nach außen erzeugen, damit das Wichtigste zuerst erscheint.
  const reihenfolge = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) reihenfolge.push([tx, ty]);
  const mx = (tx0 + tx1) / 2, my = (ty0 + ty1) / 2;
  reihenfolge.sort((a, b) => Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(b[0] - mx, b[1] - my));
  for (const [tx, ty] of reihenfolge) {
    const schluessel = `${seed},${stufeNr},${tx},${ty}`;
    let bild = kacheln.get(schluessel);
    if (!bild) {
      if (performance.now() - start > BUDGET_MS) continue; // nächstes Bild weiter
      bild = kachelErzeugen(seed, stufe, tx, ty);
      merken(schluessel, bild);
    }
    const bx = (tx * kachelM - kamera.x) * kamera.zoom + kamera.breite / 2;
    const by = (ty * kachelM - kamera.y) * kamera.zoom + kamera.hoehe / 2;
    // +0,5 px Überlappung gegen feine Nähte zwischen den Kacheln.
    ctx.drawImage(bild, bx, by, kachelPx + 0.5, kachelPx + 0.5);
  }
}

/**
 * @param {string} schluessel @param {HTMLCanvasElement} bild
 */
function merken(schluessel, bild) {
  if (kacheln.size >= SPEICHER_MAX) {
    // Älteste Hälfte verwerfen (Map behält die Einfügereihenfolge).
    let n = SPEICHER_MAX / 2;
    for (const k of kacheln.keys()) { kacheln.delete(k); if (--n <= 0) break; }
  }
  kacheln.set(schluessel, bild);
}

/**
 * Berechnet ein Kachelbild aus dem Generator (Feinpunkte zu 25 cm, siehe data/welt.js).
 * @param {number} seed
 * @param {{mProPx: number}} stufe
 * @param {number} tx @param {number} ty
 * @returns {HTMLCanvasElement}
 */
function kachelErzeugen(seed, stufe, tx, ty) {
  const t0 = performance.now();
  // Ein Rand von je einem Bildpunkt rundum: für Hangschattierung und Kantenglättung.
  const n = PIXEL + 2;
  const werte = new Int32Array(n * n);
  const schritt = stufe.mProPx * FEIN_PRO_M; // Feinpunkte je Bildpunkt
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
      farbeSetzen(farben, (y * n + x) * 3, Math.floor(w / 65536), hoehe, ((hoehe - tiefer) * 4) / stufe.mProPx);
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

/** @returns {{kacheln: number, erzeugt: number, msLetzte: number}} */
export function kachelZahlen() {
  return { kacheln: kacheln.size, erzeugt: messung.erzeugt, msLetzte: Number(messung.msLetzte.toFixed(2)) };
}

/** Alle Kacheln verwerfen (neue Welt). */
export function weltZuruecksetzen() { kacheln.clear(); }
