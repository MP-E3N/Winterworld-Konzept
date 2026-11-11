// @ts-check
/**
 * wracks.js — Liegengebliebene Kolosse in der Welt (M4c, F6).
 *
 * ZWECK:    Ein Wrack ist der Koloss, dunkel und eingeschneit, leicht verdreht. Seine Ladung liegt als
 *           Haufen drumherum (die zeichnet render/fundstellen.js wie jeden Abwurf).
 * LIEST:    state.wracks, Kamera
 * SCHREIBT: nichts (nur zeichnen)
 * REGEL:    LEISTUNG — nur zeichnen, was im Bild liegt; feste Muster aus hash() (kein Flimmern).
 * DEBUG:    F3 zeigt die Zahl der Wracks.
 */

import { kamera, weltZuBild } from './kamera.js';
import { fahrgestell, rumpf } from './koloss-aufbau.js';
import { KOLOSS_LAENGE_M, KOLOSS_BREITE_M } from '../data/koloss.js';

/** Feste Pseudo-Zufallszahl 0 … 1. @param {number} n @returns {number} */
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Wracks: Fahrgestell und Rumpf des Kolosses, abgedunkelt und eingeschneit.
 * @param {CanvasRenderingContext2D} ctx @param {import('../sim/types.js').Zustand} s
 */
export function wracksZeichnen(ctx, s) {
  for (const w of s.wracks) {
    const [bx, by] = weltZuBild(w.x / 1e6, w.y / 1e6);
    const z = kamera.zoom, r = KOLOSS_LAENGE_M * z;
    if (bx < -r || by < -r || bx > kamera.breite + r || by > kamera.hoehe + r) continue;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate((w.h / 65536) * Math.PI * 2 + (hash(w.id) - 0.5) * 0.3);
    if (r < 14) {
      // Fern: nur ein dunkler Strich
      ctx.fillStyle = '#2a2d30'; ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
      continue;
    }
    ctx.scale(z, z);
    fahrgestell(ctx);
    rumpf(ctx);
    // Abdunkeln: kalt, verlassen
    ctx.fillStyle = 'rgba(20, 24, 28, 0.62)';
    ctx.fillRect(-KOLOSS_LAENGE_M / 2, -KOLOSS_BREITE_M / 2, KOLOSS_LAENGE_M, KOLOSS_BREITE_M);
    // Schneewehen auf dem Wrack
    ctx.fillStyle = 'rgba(240, 245, 248, 0.85)';
    for (let i = 0; i < 14; i++) {
      const x = (hash(w.id * 19 + i) - 0.5) * KOLOSS_LAENGE_M * 0.9, y = (hash(w.id * 23 + i) - 0.5) * KOLOSS_BREITE_M * 0.8;
      ctx.beginPath(); ctx.ellipse(x, y, 1.2 + hash(i) * 2.5, 0.6 + hash(i + 9) * 1.2, hash(i + 3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
