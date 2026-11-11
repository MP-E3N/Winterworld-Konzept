// @ts-check
/**
 * dampfmaschine.js — Kleine, laufende Dampfmaschine in der Anzeige.
 *
 * ZWECK:    Zeigt auf einen Blick, wie hart der Kessel arbeitet: Feuer im Kessel glüht je nach
 *           Druck, das Manometer zeigt den Dampfvorrat in Prozent (rot = fast voll), darüber zeigt
 *           der Feuer-Zeiger, wie stark angeheizt wird (Spieltest M4a-2: Feuerstufe = wie SCHNELL
 *           der Druck steigt, nicht wie hoch). Kolben und Schwungrad laufen im Takt der echten
 *           Räder, Abdampf pufft bei jedem Kolbenhub.
 * LIEST:    Druck, Feuerstufe, Gas, gefahrene Meter (render/spuren.js wegVon)
 * SCHREIBT: nur das eigene kleine Canvas
 * REGEL:    KONZEPT.md §3 „Kesseldruck“
 * DEBUG:    Steht das Schwungrad, obwohl der Koloss fährt? wegVon() prüfen.
 */

import { TRAKTION_DURCHMESSER_M } from '../data/ansicht.js';
import { FARBEN_KOLOSS as F } from '../data/ansicht.js';

/** Zeichenfläche in Grund-Einheiten … */
const B = 204, H = 140;
/** … wird so stark vergrößert dargestellt (Nutzerwunsch: größer, vor allem das Manometer). */
const SKALA = 1.45;
/** Maschine (Kessel, Triebwerk) sitzt so weit unten, damit oben Platz für Feuer-Zeiger und Manometer ist. */
const MASCHINE_Y = 48;
/** Mitte des Manometers und des Feuer-Zeigers darüber (Grund-Einheiten). */
const MANO_X = 176, MANO_Y = 58, FEUER_Y = 26;

/** Zeichenzustand, der nur der Optik dient. */
const optik = { nadel: 0, feuer: 0, flackern: 0, letzterHub: 0, puffs: /** @type {{x: number, y: number, a: number, r: number}[]} */ ([]) };

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
 * @param {{druck: number, druckMax: number, feuer: number, feuerMax: number, gas: number, weg: number, dtMs: number}} w
 *        druck = Dampfvorrat in Manometer-Stufen, feuer = eingestellte Feuerstufe (0 = ruht)
 */
export function dampfmaschineZeichnen(c, w) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const anteil = w.druck / w.druckMax;
  const last = anteil * (0.3 + 0.7 * Math.max(0, w.gas));
  // Kurbelwinkel = Radwinkel: Kolben und Räder sind gekoppelt.
  const winkel = (w.weg / (Math.PI * TRAKTION_DURCHMESSER_M)) * Math.PI * 2;
  const k = 1 - Math.exp(-w.dtMs / 250);
  optik.nadel += (anteil + (w.gas > 0 ? Math.sin(performance.now() / 90) * 0.015 * anteil : 0) - optik.nadel) * k;
  optik.feuer += (w.feuer / w.feuerMax - optik.feuer) * (1 - Math.exp(-w.dtMs / 120));
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
  // Kein Zittern mehr (Spieltest M4a): Wer zu viel verlangt, sieht die Nadel fallen.
  manometer(ctx, optik.nadel);
  feuerZeiger(ctx, optik.feuer, w.feuerMax);
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
 * Großes Manometer rechts: Dampfvorrat 0 … 100 % mit Ziffern, roter Bereich am Ende (die genaue
 * Zahl steht in der Zeile „Kessel“ darunter).
 * WARUM Prozent statt 0 … 4 (Spieltest M4a-2): Die alten Ziffern sahen aus wie die Feuerstufen —
 * man las „Mittel = höchstens 2“. Der Kessel wird aber auf jeder Stufe voll, nur verschieden schnell.
 * @param {CanvasRenderingContext2D} ctx @param {number} nadel  0 … 1
 */
function manometer(ctx, nadel) {
  const mx = MANO_X, my = MANO_Y, r = 24, stufen = 4;
  const start = Math.PI * 0.75, ende = Math.PI * 2.25;
  // Gehäuse
  ctx.fillStyle = F.kupfer;
  ctx.beginPath(); ctx.arc(mx, my, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#efe8d5';
  ctx.beginPath(); ctx.arc(mx, my, r - 1, 0, Math.PI * 2); ctx.fill();
  // Roter Bereich (Volldampf)
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mx, my, r - 5, start + (ende - start) * 0.9, ende); ctx.stroke();
  // Teilstriche und Ziffern
  ctx.strokeStyle = '#2a2a2a'; ctx.fillStyle = '#2a2a2a'; ctx.lineWidth = 1.2;
  ctx.font = 'bold 6px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= stufen; i++) {
    const a = start + ((ende - start) * i) / stufen;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(a) * (r - 2), my + Math.sin(a) * (r - 2));
    ctx.lineTo(mx + Math.cos(a) * (r - 8), my + Math.sin(a) * (r - 8));
    ctx.stroke();
    ctx.fillText(String((100 * i) / stufen), mx + Math.cos(a) * (r - 13), my + Math.sin(a) * (r - 13));
  }
  ctx.fillText('%', mx, my + 15);
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

/**
 * Feuer-Zeiger über dem Manometer: Halbrund von „aus“ (dunkel) bis „Volldampf“ (rot), eine Nadel
 * zeigt die eingestellte Feuerstufe (Q/E). Glüht mit, je stärker angeheizt wird.
 * @param {CanvasRenderingContext2D} ctx @param {number} feuer  0 … 1 (geglättet) @param {number} stufen
 */
function feuerZeiger(ctx, feuer, stufen) {
  const mx = MANO_X, my = FEUER_Y, r = 23;
  const start = Math.PI, ende = Math.PI * 2;
  // Gehäuse: Halbrund mit Kupferrand
  ctx.fillStyle = F.kupfer;
  ctx.beginPath(); ctx.arc(mx, my, r + 2, start, ende); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a211b';
  ctx.beginPath(); ctx.arc(mx, my, r, start, ende); ctx.closePath(); ctx.fill();
  // Farbige Felder je Stufe: aus = grau, dann immer heißer
  const farben = ['#5b5650', '#a8582a', '#d9792b', '#f0a030', '#e0402a'];
  ctx.lineWidth = 6;
  for (let i = 0; i <= stufen; i++) {
    const a0 = start + ((ende - start) * Math.max(0, i - 0.5)) / stufen;
    const a1 = start + ((ende - start) * Math.min(stufen, i + 0.5)) / stufen;
    ctx.strokeStyle = farben[Math.min(farben.length - 1, i)];
    ctx.globalAlpha = i <= Math.round(feuer * stufen) ? 1 : 0.35;
    ctx.beginPath(); ctx.arc(mx, my, r - 4, a0 + 0.03, a1 - 0.03); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Nadel (Messing) mit dunklem Knopf
  const a = start + (ende - start) * Math.max(0, Math.min(1, feuer));
  ctx.strokeStyle = '#f3d27a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * (r - 2), my + Math.sin(a) * (r - 2)); ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
  // Beschriftung links daneben
  ctx.fillStyle = '#efe8d5'; ctx.font = 'bold 7px Segoe UI, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('FEUER', mx - r - 5, my - 4);
  ctx.fillText('DRUCK', mx - r - 7, MANO_Y - 10);
}
