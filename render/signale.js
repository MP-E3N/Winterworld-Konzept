// @ts-check
/**
 * signale.js — Signalballons, Suchregion und das Lager der Überlebenden (M5b).
 *
 * ZWECK:    Nutzerwunsch: Der Signalballon der Städte soll auf der Karte sichtbar sein, wenn auch nur als
 *           Indikator — über der Schneewehen-Decke. Jede Siedlung hat einen Ballon; das Lager der
 *           Überlebenden bekommt seinen, sobald ein Koloss auf ~1 km heran war (auftrag.gesichtet).
 *           Liegt ein Ballon außerhalb des Bildes, zeigt eine Messing-Marke am Rand Richtung und Entfernung.
 *           Die Suchregion steht als gestrichelter Kreis auf der Karte („Notsignal“).
 *           Das Lager selbst (Zelte, Feuer, Leute) liegt am Boden — unter der Decke, man muss es finden.
 * LIEST:    data/siedlungen.js, Rettungsort (sim/auftrag.js), state.auftrag, Kamera
 * SCHREIBT: nichts außer signalAnsicht.hover (Maus über dem Lager)
 * REGEL:    LEISTUNG — eine Handvoll Formen je Bild, keine Verläufe je Ballon außer dem Glanz.
 * DEBUG:    ek.auftrag() zeigt Region und Lager (Lager nur zum Testen!).
 */

import { kamera, weltZuBild, bildZuWelt } from './kamera.js';
import { SIEDLUNGEN } from '../data/siedlungen.js';
import { REGION_RADIUS_M } from '../data/auftrag.js';
import { rettungsOrt } from '../sim/auftrag.js';
import { ansichtLicht } from './licht.js';

/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {{x: number, y: number, h: number}} Lage */

/** Maus über dem Lager (eingabe/maus.js setzt das, Darstellung zeigt einen Ring). */
export const signalAnsicht = { hover: false };
/** Klickfläche um das Lager (m). */
const LAGER_KLICK_M = 22;
/** Abstand der Randmarken vom Bildrand (px): links die große Anzeige, unten rechts die Uhr-Tafel, oben die Meldung. */
const RAND = { links: 380, rechts: 40, oben: 76, unten: 200 };
/** Ballon schwebt so hoch über seinem Ort (Bildpunkte, unabhängig vom Zoom — er ist ein Wegweiser). */
const BALLON_HOEHE_PX = 46;

// ── Lager am Boden (unter der Decke zeichnen) ──

/**
 * Zelte, Feuer und Leute. Nach dem Retten bleiben leere Zelte und kalte Asche.
 * @param {CanvasRenderingContext2D} ctx @param {Zustand} s
 */
export function lagerZeichnen(ctx, s) {
  const o = rettungsOrt(s.seed).lager;
  const [bx, by] = weltZuBild(o.x, o.y);
  const z = kamera.zoom;
  if (z < 0.4 || bx < -60 * z || by < -60 * z || bx > kamera.breite + 60 * z || by > kamera.hoehe + 60 * z) return;
  ctx.save();
  ctx.translate(bx, by); ctx.scale(z, z);
  const brennt = s.auftrag.leute > 0;
  // Feuerstelle
  ctx.fillStyle = '#3a3532'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  if (brennt) {
    ctx.fillStyle = `rgba(255, ${150 + Math.random() * 60}, 60, 0.9)`;
    ctx.beginPath(); ctx.arc(0, 0, 1.2 + Math.random() * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Drei Zelte aus geflickter Plane, ein umgekippter Schlitten
  for (const [x, y, w] of /** @type {[number, number, number][]} */ ([[-9, -5, 0.3], [8, -6, -0.4], [0, 9, 0.1]])) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(w);
    ctx.fillStyle = 'rgba(40, 55, 75, 0.25)'; ctx.fillRect(-3.2, -2.2, 7.4, 5.4);
    ctx.fillStyle = '#8a7a5c'; ctx.beginPath(); ctx.moveTo(-3.5, 2.5); ctx.lineTo(0, -3); ctx.lineTo(3.5, 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6e604a'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(3.5, 2.5); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(240, 245, 248, 0.8)'; ctx.fillRect(-1.5, -1.2, 1.4, 0.6);
    ctx.restore();
  }
  ctx.fillStyle = '#5a4030'; ctx.save(); ctx.rotate(0.6); ctx.fillRect(10, 4, 6, 1.6); ctx.restore();
  // Leute ums Feuer (je einer ein Punkt)
  ctx.fillStyle = '#2b2b30';
  for (let i = 0; i < s.auftrag.leute; i++) {
    const w = (i / Math.max(1, s.auftrag.leute)) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(w) * 4, Math.sin(w) * 4, 0.55, 0, Math.PI * 2); ctx.fill();
  }
  if (signalAnsicht.hover) {
    ctx.strokeStyle = '#f0d48e'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
    ctx.beginPath(); ctx.arc(0, 0, LAGER_KLICK_M, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

/**
 * Liegt der Bildpunkt auf dem Lager?
 * @param {Zustand} s @param {number} bx @param {number} by
 * @returns {{x: number, y: number} | null}  Lager in Metern oder null
 */
export function lagerUnter(s, bx, by) {
  const o = rettungsOrt(s.seed).lager;
  const [wx, wy] = bildZuWelt(bx, by);
  return Math.hypot(wx - o.x, wy - o.y) <= Math.max(LAGER_KLICK_M, 10 / kamera.zoom) ? o : null;
}

// ── Über der Decke: Region, Ballons, Randmarken ──

/**
 * @param {CanvasRenderingContext2D} ctx @param {Zustand} s @param {Lage | null} eigener  Rumpfmitte (m)
 * @param {number} zeitMs  für das Schaukeln der Ballons
 */
export function signaleZeichnen(ctx, s, eigener, zeitMs) {
  const ort = rettungsOrt(s.seed);
  if (s.auftrag.leute > 0) region(ctx, ort.region);
  /** @type {{x: number, y: number, farbe: string, name: string}[]} */
  const ballons = SIEDLUNGEN.map((sd) => ({ x: sd.x, y: sd.y, farbe: '#a8452a', name: sd.name }));
  if (s.auftrag.gesichtet && s.auftrag.leute > 0) ballons.push({ x: ort.lager.x, y: ort.lager.y, farbe: '#d9a030', name: 'Überlebende' });
  ballons.forEach((b, i) => {
    const [bx, by] = weltZuBild(b.x, b.y);
    const rand = 24;
    const drin = bx > rand && by > rand + BALLON_HOEHE_PX && bx < kamera.breite - rand && by < kamera.hoehe - rand;
    if (drin) ballon(ctx, bx, by, b.farbe, zeitMs / 1000 + i * 1.7);
    else if (eigener) randMarke(ctx, b, eigener);
  });
}

/** Gestrichelter Kreis der Suchregion mit Beschriftung. @param {CanvasRenderingContext2D} ctx @param {{x: number, y: number}} r */
function region(ctx, r) {
  const [bx, by] = weltZuBild(r.x, r.y);
  const rad = REGION_RADIUS_M * kamera.zoom;
  if (bx + rad < 0 || by + rad < 0 || bx - rad > kamera.breite || by - rad > kamera.hoehe) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(176, 60, 40, 0.75)'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.arc(bx, by, rad, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(176, 60, 40, 0.06)'; ctx.fill();
  schrift(ctx, 'Notsignal — Überlebende irgendwo hier', bx, Math.max(16, by - rad - 10), '#8c2a1d');
  ctx.restore();
}

/**
 * Ein Heißluftballon aus geflickter Plane mit Messingkorb, an einer Leine über seinem Ort.
 * @param {CanvasRenderingContext2D} ctx @param {number} bx @param {number} by  Ort am Boden
 * @param {string} farbe @param {number} t  Sekunden (Schaukeln)
 */
function ballon(ctx, bx, by, farbe, t) {
  const sx = Math.sin(t * 0.9) * 3, hx = bx + sx, hy = by - BALLON_HOEHE_PX + Math.sin(t * 1.3) * 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 45, 30, 0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sx * 0.3, by - 20, hx, hy + 12); ctx.stroke();
  ctx.fillStyle = 'rgba(40, 55, 75, 0.25)'; ctx.beginPath(); ctx.ellipse(bx + 4, by + 2, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Korb
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(hx - 3, hy + 9, 6, 4);
  ctx.strokeStyle = '#c08f3e'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(hx - 3, hy + 9); ctx.lineTo(hx - 6, hy + 2); ctx.moveTo(hx + 3, hy + 9); ctx.lineTo(hx + 6, hy + 2); ctx.stroke();
  // Hülle mit Bahnen und Glanz
  ctx.fillStyle = farbe;
  ctx.beginPath(); ctx.moveTo(hx - 6, hy + 3); ctx.bezierCurveTo(hx - 14, hy - 4, hx - 10, hy - 20, hx, hy - 20);
  ctx.bezierCurveTo(hx + 10, hy - 20, hx + 14, hy - 4, hx + 6, hy + 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40, 20, 10, 0.45)'; ctx.lineWidth = 1;
  for (const k of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(hx + k * 0.6, hy + 2); ctx.quadraticCurveTo(hx + k * 1.6, hy - 9, hx + k * 0.3, hy - 20); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
  ctx.beginPath(); ctx.ellipse(hx - 4, hy - 11, 2.2, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  leuchten(ctx, hx, hy, t);
  ctx.restore();
}

// ── Leuchtfeuer (Spieltest M5b: „der Ballon soll ein leuchtendes Licht haben, mit Bloom-Effekt“) ──

/** Vorgerenderter Lichthof (einmal erzeugt; je Ballon nur noch drawImage). @type {HTMLCanvasElement | null} */
let lichthof = null;

/** Vorgerenderter warmer Lichthof (auch für Laternen, render/laternen.js). @returns {HTMLCanvasElement} */
export function lichthofBild() {
  if (lichthof) return lichthof;
  lichthof = document.createElement('canvas');
  lichthof.width = lichthof.height = 128;
  const c = /** @type {CanvasRenderingContext2D} */ (lichthof.getContext('2d'));
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 250, 225, 1)');
  g.addColorStop(0.1, 'rgba(255, 220, 140, 0.85)');
  g.addColorStop(0.3, 'rgba(255, 160, 60, 0.35)');
  g.addColorStop(0.6, 'rgba(255, 120, 40, 0.1)');
  g.addColorStop(1, 'rgba(255, 100, 30, 0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  return lichthof;
}

/**
 * Brenner und Lampe am Korb: Die Hülle glüht von innen, darum ein großer, weicher Lichthof (additiv =
 * „Bloom“), der langsam pulsiert — nachts groß und hell, bei Tag kleiner.
 * @param {CanvasRenderingContext2D} ctx @param {number} hx @param {number} hy  Mitte unten an der Hülle @param {number} t
 */
function leuchten(ctx, hx, hy, t) {
  const nacht = Math.min(1, ansichtLicht.nacht / 0.85);
  const puls = 0.82 + 0.18 * Math.sin(t * 2.4) + 0.05 * Math.sin(t * 9.1);
  const bild = lichthofBild();
  ctx.globalCompositeOperation = 'lighter';
  // Großer Hof (Bloom) um den Brenner unter der Hülle …
  const gross = (34 + 46 * nacht) * puls;
  ctx.globalAlpha = (0.3 + 0.5 * nacht) * puls;
  ctx.drawImage(bild, hx - gross, hy + 5 - gross, gross * 2, gross * 2);
  // … der Brenner färbt den unteren Teil der Hülle warm (die Farbe der Hülle soll erkennbar bleiben) …
  ctx.globalAlpha = (0.18 + 0.17 * nacht) * puls;
  ctx.drawImage(bild, hx - 10, hy - 12, 20, 18);
  // … und die Flamme selbst als heller Kern.
  ctx.globalAlpha = 0.95;
  ctx.drawImage(bild, hx - 5, hy, 10, 10);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/**
 * Ballon außerhalb des Bildes: Messing-Marke am Rand in seiner Richtung, mit Entfernung.
 * @param {CanvasRenderingContext2D} ctx @param {{x: number, y: number, farbe: string, name: string}} b @param {Lage} eigener
 */
function randMarke(ctx, b, eigener) {
  const mx = kamera.breite / 2, my = kamera.hoehe / 2;
  const [bx, by] = weltZuBild(b.x, b.y);
  const dx = bx - mx, dy = by - my, w = Math.atan2(dy, dx);
  // Auf einen Rahmen innerhalb des Bildes klemmen, der die Anzeigetafeln und die Meldung oben frei lässt.
  const links = RAND.links - mx, rechts = kamera.breite - RAND.rechts - mx, oben = RAND.oben - my, unten = kamera.hoehe - RAND.unten - my;
  const f = Math.min(dx > 0 ? rechts / dx : dx < 0 ? links / dx : Infinity, dy > 0 ? unten / dy : dy < 0 ? oben / dy : Infinity);
  const x = mx + dx * f, y = my + dy * f;
  const weit = Math.hypot(b.x - eigener.x, b.y - eigener.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20, 24, 28, 0.78)'; ctx.strokeStyle = '#c08f3e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = b.farbe; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
  // Auch die Randmarke leuchtet ein wenig (wie der Ballon, Spieltest M5b).
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
  ctx.drawImage(lichthofBild(), -16, -18, 32, 32);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-2, 5, 4, 3);
  ctx.rotate(w); ctx.fillStyle = '#f0d48e';
  ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(13, -5); ctx.lineTo(13, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  const text = `${b.name} · ${weit >= 1000 ? `${(weit / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(weit / 10) * 10} m`}`;
  schrift(ctx, text, x, y + (y > my ? -24 : 26), '#f0d48e', true);
}

/** @param {CanvasRenderingContext2D} ctx @param {string} t @param {number} x @param {number} y @param {string} farbe @param {boolean} [dunkel] */
function schrift(ctx, t, x, y, farbe, dunkel = false) {
  ctx.font = '600 12px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const b = ctx.measureText(t).width + 10;
  const lx = Math.min(kamera.breite - b / 2 - 4, Math.max(b / 2 + 4, x));
  if (dunkel) { ctx.fillStyle = 'rgba(20, 24, 28, 0.7)'; ctx.fillRect(lx - b / 2, y - 8, b, 16); }
  else { ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fillRect(lx - b / 2, y - 8, b, 16); }
  ctx.fillStyle = farbe;
  ctx.fillText(t, lx, y);
}
