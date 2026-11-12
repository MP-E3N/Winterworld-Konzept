// @ts-check
/**
 * laternen.js — Gesetzte Laternen: Mast mit Lampe am Boden, warmer Lichthof darüber (Spieltest M5b).
 *
 * ZWECK:    Laternen sind die Wegpunkte im Schnee (die eigene Spur verschwindet mit der Zeit). Am Boden
 *           steht ein Eisenmast mit Messinglampe; darüber — über Nebel und Dunkelheit — ein warmer, leicht
 *           flackernder Lichthof (wie beim Signalballon), damit man sie von weitem findet. Kurz bevor sie
 *           ausgehen, flackern sie stärker und werden schwächer.
 *           Die Decke und die Nacht schneiden render/nebel.js und render/licht.js um die Laternen auf.
 * LIEST:    state.laternen, state.tick, Kamera, ansichtLicht.nacht
 * SCHREIBT: nichts (nur zeichnen)
 * REGEL:    LEISTUNG — vorgerenderter Lichthof (render/signale.js lichthofBild), je Laterne ein paar Formen.
 * DEBUG:    F3-Zeile „Laternen“.
 */

import { kamera, weltZuBild } from './kamera.js';
import { ansichtLicht } from './licht.js';
import { lichthofBild } from './signale.js';
import { laterneBrennt } from '../sim/laternen.js';
import { LATERNE_DAUER_TICKS } from '../data/laternen.js';

/** @typedef {{x: number, y: number, rest: number, id: number}} LaternenOrt  Meter, rest 0 … 1 */

/**
 * Brennende Laternen in Metern (für Nebel, Licht und Zeichnen).
 * @param {import('../sim/types.js').Zustand} s
 * @returns {LaternenOrt[]}
 */
export function laternenOrte(s) {
  return s.laternen.filter((l) => laterneBrennt(l, s.tick))
    .map((l) => ({ x: l.x / 1e6, y: l.y / 1e6, rest: (l.bis - s.tick) / LATERNE_DAUER_TICKS, id: l.id }));
}

/**
 * Mast und Lampe am Boden (unter der Decke — die Laterne hält ihren Fleck aber selbst frei).
 * @param {CanvasRenderingContext2D} ctx @param {LaternenOrt[]} orte
 */
export function laternenZeichnen(ctx, orte) {
  const z = kamera.zoom;
  if (z < 0.6) return;
  for (const l of orte) {
    const [bx, by] = weltZuBild(l.x, l.y);
    if (bx < -40 || by < -40 || bx > kamera.breite + 40 || by > kamera.hoehe + 40) continue;
    ctx.save();
    ctx.translate(bx, by); ctx.scale(z, z);
    ctx.fillStyle = 'rgba(40, 55, 75, 0.3)'; ctx.fillRect(0.2, 0, 2.6, 0.5);          // Schatten
    ctx.fillStyle = '#2a2b2e'; ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.fill(); // Mast
    ctx.fillStyle = '#c08f3e'; ctx.fillRect(-0.55, -0.55, 1.1, 1.1);                   // Lampengehäuse
    ctx.fillStyle = '#ffe6a0'; ctx.fillRect(-0.3, -0.3, 0.6, 0.6);                     // Glas
    ctx.restore();
  }
}

/**
 * Warmer Lichthof über Nebel und Dunkelheit — von weitem sichtbar. Flackert kurz vor dem Erlöschen.
 * @param {CanvasRenderingContext2D} ctx @param {LaternenOrt[]} orte @param {number} zeitMs
 */
export function laternenLeuchten(ctx, orte, zeitMs) {
  if (orte.length === 0) return;
  const nacht = Math.min(1, ansichtLicht.nacht / 0.85), bild = lichthofBild(), t = zeitMs / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of orte) {
    const [bx, by] = weltZuBild(l.x, l.y);
    if (bx < -80 || by < -80 || bx > kamera.breite + 80 || by > kamera.hoehe + 80) continue;
    const ende = l.rest < 0.08 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 7 + l.id)) : 1; // flackert vor dem Aus
    const flackern = (0.9 + 0.1 * Math.sin(t * 5.3 + l.id * 2.1)) * ende;
    const r = Math.max(14, Math.min(60, 24 * kamera.zoom)) * (0.7 + 0.5 * nacht) * flackern;
    // Zurückhaltend (Spieltest M5b): ein warmer Fleck, kein greller weißer Ball.
    ctx.globalAlpha = (0.22 + 0.33 * nacht) * flackern;
    ctx.drawImage(bild, bx - r, by - r, r * 2, r * 2);
    ctx.globalAlpha = 0.65 * ende;
    ctx.drawImage(bild, bx - 3, by - 3, 6, 6);
  }
  ctx.restore();
}
