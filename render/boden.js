// @ts-check
/**
 * boden.js — Zeichnet den Boden: Gelände (render/welt.js), Schneekörnung und Orientierungsraster.
 *
 * ZWECK:    Gelände-Kacheln als Grundlage; darüber feine Schneekörnung (nah) und das Raster (alle
 *           Zoomstufen), damit das Auge auch auf großen Schneeflächen Halt findet.
 * LIEST:    Kamera, render/welt.js, data/untergrund.js
 * SCHREIBT: nur das Canvas
 * REGEL:    KONZEPT.md §6
 * DEBUG:    Raster stört? RASTER_M in data/ansicht.js. Körnung flimmert? KOERNUNG_* unten.
 */

import { kamera, weltZuBild } from './kamera.js';
import { weltZeichnen } from './welt.js';
import { UNTERGRUND, PACKSCHNEE } from '../data/untergrund.js';
import { RASTER_M } from '../data/ansicht.js';

/** Körnungs-Kachel: so viele Meter Welt … */
const KOERNUNG_METER = 32;
/** … in so vielen Bildpunkten vorgezeichnet. */
const KOERNUNG_PX = 512;

/** @type {CanvasPattern | null} */
let koernung = null;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} seed
 */
export function bodenZeichnen(ctx, seed) {
  const [r, g, b] = UNTERGRUND[PACKSCHNEE].farbe;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; // Grund, solange Kacheln noch berechnet werden
  ctx.fillRect(0, 0, kamera.breite, kamera.hoehe);
  weltZeichnen(ctx, seed);
  koernungZeichnen(ctx);
  rasterZeichnen(ctx);
}

// ── Schneekörnung ─────────────────────────────────────────

/**
 * Feine Körnung und Windrippel als wiederholte Kachel, mit der Kamera skaliert.
 * WARUM Kachel statt einzelner Punkte: Bei Zoom 3 wären es zehntausende Punkte pro Bild.
 * @param {CanvasRenderingContext2D} ctx
 */
function koernungZeichnen(ctx) {
  // Unter 1 px/m wird die Körnung zu Rauschen → ausblenden.
  const sichtbar = Math.min(1, Math.max(0, (kamera.zoom - 1) / 3));
  if (sichtbar <= 0) return;
  if (!koernung) koernung = koernungErzeugen(ctx);
  if (!koernung) return;
  const s = (kamera.zoom * KOERNUNG_METER) / KOERNUNG_PX;
  const [ox, oy] = weltZuBild(0, 0);
  koernung.setTransform(new DOMMatrix([s, 0, 0, s, ox, oy]));
  ctx.globalAlpha = sichtbar;
  ctx.fillStyle = koernung;
  ctx.fillRect(0, 0, kamera.breite, kamera.hoehe);
  ctx.globalAlpha = 1;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @returns {CanvasPattern | null}
 */
function koernungErzeugen(ctx) {
  const c = document.createElement('canvas');
  c.width = KOERNUNG_PX; c.height = KOERNUNG_PX;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const zufall = optikZufall(77);
  // Windrippel: lange, flache Bögen quer zur Hauptwindrichtung.
  g.strokeStyle = 'rgba(150, 170, 190, 0.18)';
  g.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = zufall() * KOERNUNG_PX, y = zufall() * KOERNUNG_PX, l = 40 + zufall() * 90;
    for (const dx of [0, -KOERNUNG_PX, KOERNUNG_PX]) {
      g.beginPath();
      g.moveTo(x + dx, y);
      g.quadraticCurveTo(x + dx + l / 2, y - 6, x + dx + l, y + 2);
      g.stroke();
    }
  }
  // Körner: helle und bläuliche Punkte.
  for (let i = 0; i < 2600; i++) {
    const hell = zufall() < 0.5;
    g.fillStyle = hell ? 'rgba(255, 255, 255, 0.9)' : 'rgba(120, 140, 165, 0.35)';
    const r = 0.8 + zufall() * 1.6;
    g.fillRect(zufall() * KOERNUNG_PX, zufall() * KOERNUNG_PX, r, r);
  }
  return ctx.createPattern(c, 'repeat');
}

// ── Raster ────────────────────────────────────────────────

/**
 * Orientierungslinien alle 10 m / 100 m / 1 km / 10 km; jede Stufe blendet je nach Zoom ein.
 * @param {CanvasRenderingContext2D} ctx
 */
function rasterZeichnen(ctx) {
  for (const abstand of RASTER_M) {
    const px = abstand * kamera.zoom;
    const deckkraft = Math.min(1, Math.max(0, (px - 25) / 120)) * 0.22;
    if (deckkraft <= 0.01) continue;
    ctx.strokeStyle = `rgba(80, 105, 130, ${deckkraft})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const [lx, oy] = [kamera.x - kamera.breite / 2 / kamera.zoom, kamera.y - kamera.hoehe / 2 / kamera.zoom];
    for (let x = Math.floor(lx / abstand) * abstand; ; x += abstand) {
      const [bx] = weltZuBild(x, 0);
      if (bx > kamera.breite) break;
      ctx.moveTo(Math.round(bx) + 0.5, 0); ctx.lineTo(Math.round(bx) + 0.5, kamera.hoehe);
    }
    for (let y = Math.floor(oy / abstand) * abstand; ; y += abstand) {
      const [, by] = weltZuBild(0, y);
      if (by > kamera.hoehe) break;
      ctx.moveTo(0, Math.round(by) + 0.5); ctx.lineTo(kamera.breite, Math.round(by) + 0.5);
    }
    ctx.stroke();
  }
}

/**
 * Kleiner eigener Zufall NUR für die Optik (gleiches Bild bei jedem Start).
 * WARUM nicht der Simulations-Zufall: Optik darf den Spielzustand nie berühren.
 * @param {number} saat
 * @returns {() => number} 0 … 1
 */
export function optikZufall(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
