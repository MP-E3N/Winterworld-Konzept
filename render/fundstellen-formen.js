// @ts-check
/**
 * fundstellen-formen.js — Grundformen zum Malen der Fundstellen-Bildchen.
 *
 * ZWECK:    Kleckse (Haufen, Flecken, Wehen), Balken, Schneereste und Schattenversatz — gebraucht
 *           von render/fundstellen-bilder.js. Ausgelagert, damit jene Datei unter 300 Zeilen bleibt
 *           (Pflege nach M3).
 * LIEST:    data/ansicht.js (Schattenrichtung)
 * SCHREIBT: nur den übergebenen Zeichenkontext
 * REGEL:    gemalt wird in Metern (der Aufrufer skaliert), Schatten fallen immer nach Südosten.
 */

import { SCHATTEN_PRO_HOEHE } from '../data/ansicht.js';

/** Schattenfarbe wie beim Koloss. */
export const SCHATTEN = 'rgba(40, 55, 70, 0.28)';

/**
 * Unregelmäßiger Klecks (Haufen, Fleck, Wehe). Legt nur den Pfad an — füllen tut der Aufrufer.
 * @param {CanvasRenderingContext2D} ctx @param {() => number} z  Optik-Zufall 0 … 1
 * @param {number} x @param {number} y @param {number} r @param {number} zacken  0 … 1
 */
export function klecks(ctx, z, x, y, r, zacken) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2, rr = r * (1 - zacken / 2 + z() * zacken);
    if (i === 0) ctx.moveTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
    else ctx.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
  }
  ctx.closePath();
}

/**
 * Gedrehtes Rechteck um seine Mitte (Balken, Brett) mit dunklen, gesplitterten Enden.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} l @param {number} b @param {number} w  Bogenmaß
 * @param {string} farbe
 */
export function balken(ctx, x, y, l, b, w, farbe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(w);
  ctx.fillStyle = farbe;
  ctx.fillRect(-l / 2, -b / 2, l, b);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-l / 2, -b / 2, 0.25, b);
  ctx.fillRect(l / 2 - 0.25, -b / 2, 0.25, b);
  ctx.restore();
}

/**
 * Schneereste obenauf (Raureif, Wehen) — mehr im Nordwesten, wo der Wind sie anweht.
 * @param {CanvasRenderingContext2D} ctx @param {() => number} z
 * @param {number} r  Bereich (m) @param {number} anzahl @param {number} groesse  m
 */
export function schneeObenauf(ctx, z, r, anzahl, groesse) {
  for (let i = 0; i < anzahl; i++) {
    const w = Math.PI * (1 + z() * 0.9), d = r * Math.sqrt(z());
    ctx.fillStyle = `rgba(236, 241, 246, ${0.55 + z() * 0.35})`;
    klecks(ctx, z, Math.cos(w) * d, Math.sin(w) * d, groesse * (0.4 + z()), 0.5);
    ctx.fill();
  }
}

/** Schattenversatz für eine Höhe (m). @param {number} hoehe @returns {[number, number]} */
export function versatz(hoehe) {
  return [SCHATTEN_PRO_HOEHE.x * hoehe, SCHATTEN_PRO_HOEHE.y * hoehe];
}
