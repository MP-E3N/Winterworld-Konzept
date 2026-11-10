// @ts-check
/**
 * dampfmaschine.js — Kleine, laufende Dampfmaschine in der Anzeige.
 *
 * ZWECK:    Zeigt auf einen Blick, wie hart der Kessel arbeitet: Feuer im Kessel glüht je nach
 *           Druck, das Manometer zeigt die Druckstufe (rot = Volldampf), Kolben und Schwungrad
 *           laufen im Takt der echten Räder, Abdampf pufft bei jedem Kolbenhub.
 * LIEST:    Druck, Gas, gefahrene Meter (render/spuren.js wegVon)
 * SCHREIBT: nur das eigene kleine Canvas
 * REGEL:    KONZEPT.md §3 „Kesseldruck“
 * DEBUG:    Steht das Schwungrad, obwohl der Koloss fährt? wegVon() prüfen.
 */

import { RAD_DURCHMESSER_M } from '../data/ansicht.js';
import { FARBEN_KOLOSS as F } from '../data/ansicht.js';

/** Zeichenfläche in Grund-Einheiten … */
const B = 204, H = 112;
/** … wird so stark vergrößert dargestellt (Nutzerwunsch: größer, vor allem das Manometer). */
const SKALA = 1.45;
/** Maschine (Kessel, Triebwerk) sitzt so weit unten, damit oben Platz fürs große Manometer ist. */
const MASCHINE_Y = 20;

/** Zeichenzustand, der nur der Optik dient. */
const optik = { nadel: 0, flackern: 0, letzterHub: 0, puffs: /** @type {{x: number, y: number, a: number, r: number}[]} */ ([]) };

/**
 * Bereitet das Canvas vor (Schärfe auf hochauflösenden Bildschirmen).
 * @param {HTMLCanvasElement} c
 */
export function dampfmaschineEinrichten(c) {
  const dpr = window.devicePixelRatio || 1;
  const s = dpr * SKALA;
  c.width = Math.round(B * s); c.height = Math.round(H * s);
  c.style.width = Math.round(B * SKALA) + 'px'; c.style.height = Math.round(H * SKALA) + 'px';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).setTransform(s, 0, 0, s, 0, 0);
}

/**
 * Zeichnet ein Bild der Maschine.
 * @param {HTMLCanvasElement} c
 * @param {{druck: number, druckMax: number, gas: number, weg: number, dtMs: number, ueberlast: boolean}} w
 */
export function dampfmaschineZeichnen(c, w) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const anteil = w.druck / w.druckMax;
  const last = anteil * (0.3 + 0.7 * Math.max(0, w.gas));
  // Kurbelwinkel = Radwinkel: Kolben und Räder sind gekoppelt.
  const winkel = (w.weg / (Math.PI * RAD_DURCHMESSER_M)) * Math.PI * 2;
  const k = 1 - Math.exp(-w.dtMs / 250);
  optik.nadel += (anteil + (w.gas > 0 ? Math.sin(performance.now() / 90) * 0.015 * anteil : 0) - optik.nadel) * k;
  // Überlast: Die Nadel zittert heftig um ihren Platz (Spieltest 4 — statt Warntext).
  const zittern = w.ueberlast ? (Math.random() - 0.5) * 0.16 + Math.sin(performance.now() / 23) * 0.05 : 0;
  optik.flackern = 0.75 + Math.random() * 0.25;

  ctx.clearRect(0, 0, B, H);
  ctx.save();
  ctx.translate(0, MASCHINE_Y);
  kessel(ctx, anteil);
  const hub = Math.floor(winkel / Math.PI); // zwei Hübe pro Umdrehung
  if (hub !== optik.letzterHub) {
    optik.letzterHub = hub;
    if (last > 0.02) optik.puffs.push({ x: 92, y: 56, a: 0.4 + last * 0.6, r: 3 + last * 5 });
  }
  triebwerk(ctx, winkel);
  puffs(ctx, w.dtMs);
  ctx.restore();
  manometer(ctx, optik.nadel + zittern, w.druckMax);
}

/**
 * Liegender Kessel mit Feuertür (glüht je nach Druck) und Schornstein.
 * @param {CanvasRenderingContext2D} ctx @param {number} anteil
 */
function kessel(ctx, anteil) {
  // Schornstein
  ctx.fillStyle = F.schwarz;
  ctx.fillRect(58, 8, 10, 18);
  ctx.fillStyle = F.kupfer;
  ctx.fillRect(56, 8, 14, 3);
  // Kesselkörper
  const g = ctx.createLinearGradient(0, 24, 0, 52);
  g.addColorStop(0, F.gruenHell); g.addColorStop(0.5, F.gruen); g.addColorStop(1, F.gruenDunkel);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(14, 24, 96, 28, 12); ctx.fill();
  ctx.fillStyle = F.kupfer;
  for (const x of [40, 66, 92]) ctx.fillRect(x, 24, 2.5, 28);
  // Feuertür: Glut wird mit dem Druck heller und größer.
  ctx.fillStyle = F.schwarz;
  ctx.beginPath(); ctx.roundRect(4, 26, 16, 24, 3); ctx.fill();
  const glut = ctx.createRadialGradient(12, 40, 1, 12, 40, 4 + anteil * 9);
  glut.addColorStop(0, `rgba(255, 230, 150, ${0.25 + anteil * 0.75 * optik.flackern})`);
  glut.addColorStop(0.5, `rgba(240, 120, 30, ${0.2 + anteil * 0.7 * optik.flackern})`);
  glut.addColorStop(1, 'rgba(120, 30, 10, 0)');
  ctx.fillStyle = glut;
  ctx.beginPath(); ctx.roundRect(6, 28, 12, 20, 2); ctx.fill();
}

/**
 * Zylinder, Kolbenstange, Kreuzkopf, Pleuel und Schwungrad (rotes Rad wie am Koloss).
 * @param {CanvasRenderingContext2D} ctx @param {number} winkel
 */
function triebwerk(ctx, winkel) {
  const mx = 158, my = 62, r = 22, kurbel = 11; // Schwungrad-Mitte, Radius, Kurbelradius
  const kx = mx + Math.cos(winkel) * kurbel, ky = my + Math.sin(winkel) * kurbel;
  // Kreuzkopf gleitet waagerecht; Pleuel (Länge 46) verbindet ihn mit dem Kurbelzapfen.
  const pleuel = 46;
  const kreuzX = kx - Math.sqrt(pleuel * pleuel - (ky - my) * (ky - my));
  // Zylinder
  ctx.fillStyle = F.schwarz;
  ctx.beginPath(); ctx.roundRect(66, 54, 34, 16, 3); ctx.fill();
  ctx.fillStyle = F.kupfer;
  ctx.fillRect(66, 54, 3, 16); ctx.fillRect(97, 54, 3, 16);
  // Kolbenstange + Kreuzkopf
  ctx.strokeStyle = '#c9ced3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(98, my); ctx.lineTo(kreuzX, my); ctx.stroke();
  ctx.fillStyle = '#8b939b';
  ctx.fillRect(kreuzX - 4, my - 4, 8, 8);
  // Schwungrad
  ctx.fillStyle = F.schwarz;
  ctx.beginPath(); ctx.arc(mx, my, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = F.rot;
  ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a1712';
  ctx.beginPath(); ctx.arc(mx, my, r - 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = F.rot; ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = winkel + (i * Math.PI) / 3;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * (r - 4), my + Math.sin(a) * (r - 4)); ctx.stroke();
  }
  ctx.fillStyle = F.schwarz;
  ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
  // Pleuel (über dem Rad)
  ctx.strokeStyle = '#aab2ba'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(kreuzX, my); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.fillStyle = F.kupfer;
  ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2); ctx.fill();
}

/**
 * Abdampf-Wölkchen am Zylinder, steigen auf und verblassen.
 * @param {CanvasRenderingContext2D} ctx @param {number} dtMs
 */
function puffs(ctx, dtMs) {
  const s = dtMs / 1000;
  for (let i = optik.puffs.length - 1; i >= 0; i--) {
    const p = optik.puffs[i];
    p.y -= 18 * s; p.x -= 6 * s; p.r += 10 * s; p.a -= 0.9 * s;
    if (p.a <= 0) { optik.puffs.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(245, 248, 252, ${p.a})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Großes Manometer oben rechts: Skala 0 … Volldampf mit Ziffern, roter Bereich am Ende,
 * Kupferrand mit Schrauben.
 * @param {CanvasRenderingContext2D} ctx @param {number} nadel  0 … 1 @param {number} stufen
 */
function manometer(ctx, nadel, stufen) {
  const mx = 178, my = 26, r = 24;
  const start = Math.PI * 0.75, ende = Math.PI * 2.25;
  // Gehäuse
  ctx.fillStyle = F.kupfer;
  ctx.beginPath(); ctx.arc(mx, my, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#efe8d5';
  ctx.beginPath(); ctx.arc(mx, my, r - 1, 0, Math.PI * 2); ctx.fill();
  // Roter Bereich (Volldampf)
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mx, my, r - 5, start + (ende - start) * (1 - 0.5 / stufen), ende); ctx.stroke();
  // Teilstriche und Ziffern
  ctx.strokeStyle = '#2a2a2a'; ctx.fillStyle = '#2a2a2a'; ctx.lineWidth = 1.2;
  ctx.font = 'bold 7px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= stufen; i++) {
    const a = start + ((ende - start) * i) / stufen;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(a) * (r - 2), my + Math.sin(a) * (r - 2));
    ctx.lineTo(mx + Math.cos(a) * (r - 8), my + Math.sin(a) * (r - 8));
    ctx.stroke();
    ctx.fillText(String(i), mx + Math.cos(a) * (r - 13), my + Math.sin(a) * (r - 13));
  }
  // Nadel mit kleinem Gegengewicht
  const a = start + (ende - start) * Math.max(0, Math.min(1.02, nadel));
  ctx.strokeStyle = '#8f1d14'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mx - Math.cos(a) * 4, my - Math.sin(a) * 4);
  ctx.lineTo(mx + Math.cos(a) * (r - 4), my + Math.sin(a) * (r - 4));
  ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
}
