// @ts-check
/**
 * kamera.js — Blick auf die Welt: Mittelpunkt, Zoom, Folgen.
 *
 * ZWECK:    Stufenloser Zoom von ganz nah (Koloss füllt den Bildschirm) bis ganz weit, weiches
 *           Nachziehen, Verschieben mit gedrückter rechter/mittlerer Maustaste.
 * LIEST:    Maus/Mausrad am Canvas
 * SCHREIBT: das Kamera-Objekt (nur Darstellung, KEIN Spielzustand)
 * REGEL:    KONZEPT.md §6 „Zoom & Darstellung“
 * DEBUG:    `ek.kamera` — zoom = Bildpunkte pro Meter.
 *
 * WICHTIG: kameraEinrichten() nur EINMAL aufrufen (Lehre aus Kronwege: sonst feuern alte
 * Listener nach einem Neustart mit).
 */

import { ZOOM_MIN, ZOOM_MAX, ZOOM_START, ZOOM_SCHRITT, ZOOM_WEICH } from '../data/ansicht.js';

/**
 * @typedef {Object} Kamera
 * @property {number} x  Bildmitte in Weltmetern
 * @property {number} y
 * @property {number} zoom       Bildpunkte pro Meter (aktuell)
 * @property {number} zoomZiel   wohin der Zoom weich hinläuft
 * @property {{wx: number, wy: number, bx: number, by: number} | null} anker
 *           Weltpunkt, der beim Zoomen unter dem Mauszeiger bleiben soll (nur wenn nicht gefolgt)
 * @property {boolean} folgen   true = Kamera klebt am eigenen Koloss
 * @property {number} breite    Canvas-Größe in CSS-Pixeln
 * @property {number} hoehe
 */

/** @type {Kamera} */
export const kamera = {
  x: 0, y: 0, zoom: ZOOM_START, zoomZiel: ZOOM_START, anker: null, folgen: true, breite: 1, hoehe: 1,
};

/**
 * Hängt Mausrad und Ziehen an das Canvas.
 * @param {HTMLCanvasElement} canvas
 */
export function kameraEinrichten(canvas) {
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const faktor = Math.pow(ZOOM_SCHRITT, -Math.sign(ev.deltaY));
    zoomen(faktor, ev.offsetX, ev.offsetY);
  }, { passive: false });

  let ziehen = false;
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 1 && ev.button !== 2) return; // links bleibt fürs Anklicken (ab M3)
    ziehen = true;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!ziehen) return;
    kamera.folgen = false;
    kamera.anker = null;
    kamera.x -= ev.movementX / kamera.zoom;
    kamera.y -= ev.movementY / kamera.zoom;
  });
  canvas.addEventListener('pointerup', () => { ziehen = false; });
}

/**
 * Zoomt um einen Faktor. Folgt die Kamera, wird um die Bildmitte gezoomt, sonst um den Mauszeiger.
 * @param {number} faktor  > 1 = näher heran
 * @param {number} [bx]  Mausposition (CSS-Pixel)
 * @param {number} [by]
 */
export function zoomen(faktor, bx = kamera.breite / 2, by = kamera.hoehe / 2) {
  kamera.zoomZiel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, kamera.zoomZiel * faktor));
  if (kamera.folgen) { kamera.anker = null; return; }
  const [wx, wy] = bildZuWelt(bx, by);
  kamera.anker = { wx, wy, bx, by };
}

/**
 * Einmal pro Bild: Zoom weich nachziehen, Mittelpunkt setzen.
 * @param {number} dtMs
 * @param {{x: number, y: number} | null} ziel  Lage des eigenen Kolosses (Meter) oder null
 */
export function kameraAktualisieren(dtMs, ziel) {
  // Weich im logarithmischen Raum: Jeder Zoomschritt fühlt sich gleich groß an, egal ob nah oder fern.
  const k = 1 - Math.exp(-dtMs / ZOOM_WEICH);
  kamera.zoom = Math.exp(Math.log(kamera.zoom) + (Math.log(kamera.zoomZiel) - Math.log(kamera.zoom)) * k);
  if (kamera.folgen && ziel) {
    kamera.x = ziel.x;
    kamera.y = ziel.y;
  } else if (kamera.anker) {
    // Den Ankerpunkt unter dem Mauszeiger festhalten.
    const a = kamera.anker;
    kamera.x = a.wx - (a.bx - kamera.breite / 2) / kamera.zoom;
    kamera.y = a.wy - (a.by - kamera.hoehe / 2) / kamera.zoom;
    if (Math.abs(kamera.zoom - kamera.zoomZiel) < kamera.zoomZiel * 0.001) kamera.anker = null;
  }
}

/**
 * Weltmeter → Bildpunkt (CSS-Pixel).
 * @param {number} wx @param {number} wy
 * @returns {[number, number]}
 */
export function weltZuBild(wx, wy) {
  return [(wx - kamera.x) * kamera.zoom + kamera.breite / 2, (wy - kamera.y) * kamera.zoom + kamera.hoehe / 2];
}

/**
 * Bildpunkt → Weltmeter.
 * @param {number} bx @param {number} by
 * @returns {[number, number]}
 */
export function bildZuWelt(bx, by) {
  return [(bx - kamera.breite / 2) / kamera.zoom + kamera.x, (by - kamera.hoehe / 2) / kamera.zoom + kamera.y];
}
