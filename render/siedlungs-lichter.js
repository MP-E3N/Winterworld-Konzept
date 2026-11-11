// @ts-check
/**
 * siedlungs-lichter.js — Nachts glühen Fenster, Laternen und der Wärmeofen der Siedlungen (M4d).
 *
 * ZWECK:    Nach der Dunkelheit (render/licht.js) gezeichnet, damit die Siedlung im Dunkeln ein warmer
 *           Lichtfleck ist — Heimweg-Hilfe. Ausgelagert aus render/siedlungen.js (Dateigröße).
 * LIEST:    data/siedlungen.js, LATERNEN aus render/siedlungen.js, ansichtLicht.nacht, Kamera
 * SCHREIBT: nichts (nur zeichnen)
 * REGEL:    LEISTUNG — ein vorgerendertes Glühbild, je Licht nur ein drawImage.
 */

import { kamera, weltZuBild } from './kamera.js';
import { ansichtLicht } from './licht.js';
import { SIEDLUNGEN } from '../data/siedlungen.js';
import { LATERNEN } from './siedlungen.js';

// ── Lichter bei Nacht (über der Dunkelheit) ──

/** Vorgerendertes warmes Glühen (einmal erzeugt). @type {HTMLCanvasElement | null} */
let gluehBild = null;

/** @returns {HTMLCanvasElement} */
function glueh() {
  if (gluehBild) return gluehBild;
  gluehBild = document.createElement('canvas');
  gluehBild.width = gluehBild.height = 64;
  const c = /** @type {CanvasRenderingContext2D} */ (gluehBild.getContext('2d'));
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 210, 130, 0.9)'); g.addColorStop(0.35, 'rgba(255, 150, 60, 0.35)'); g.addColorStop(1, 'rgba(255, 120, 40, 0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return gluehBild;
}

/**
 * Fenster und Ofen glühen nachts — nach dunkelheitZeichnen aufrufen.
 * @param {CanvasRenderingContext2D} ctx
 */
export function siedlungsLichterZeichnen(ctx) {
  const nacht = ansichtLicht.nacht;
  if (nacht < 0.15) return;
  const z = kamera.zoom, bild = glueh();
  ctx.save();
  ctx.globalAlpha = Math.min(1, (nacht - 0.15) * 1.6);
  for (const sd of SIEDLUNGEN) {
    const [bx, by] = weltZuBild(sd.x, sd.y);
    if (bx < -200 * z - 50 || by < -200 * z - 50 || bx > kamera.breite + 200 * z + 50 || by > kamera.hoehe + 200 * z + 50) continue;
    /** @type {[number, number, number][]} Lichter: x, y (m, relativ), Radius (m) */
    const lichter = LATERNEN.map(([x, y]) => /** @type {[number, number, number]} */ ([x, y, 6]));
    for (const g of sd.gebaeude) {
      // Hütten: Fenster an der Nordseite (zum Platz hin); Ofen: großer Schein in der Mitte.
      if (g.art === 'huette') lichter.push([g.dx, g.dy - g.t / 2 - 1, 5]);
      else if (g.art === 'ofen') lichter.push([g.dx, g.dy, 14]);
    }
    for (const [x, y, rm] of lichter) {
      const r = Math.max(5, rm * z);
      const [lx, ly] = weltZuBild(sd.x + x, sd.y + y);
      ctx.drawImage(bild, lx - r, ly - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}
