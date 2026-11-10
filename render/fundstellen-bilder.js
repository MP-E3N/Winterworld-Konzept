// @ts-check
/**
 * fundstellen-bilder.js — Vorgerenderte Bildchen der Fundstellen (Draufsicht).
 *
 * ZWECK:    Je Fundart werden beim ersten Gebrauch VARIANTEN Bilder gemalt: Kohlehalde (dunkler Haufen
 *           mit Brocken, Raureif, mal ein Förderwagen), Ruine (Mauerreste, eingestürztes Dach, lose
 *           Balken, Schneewehen), Ölfässer (rostrote Fässer, teils umgekippt, Ölfleck), Vorratslager
 *           (Kisten, Säcke, Plane). Gezeichnet wird dann nur noch drawImage (E-013).
 * LIEST:    data/fundstellen.js (Größe je Art), Grundformen aus render/fundstellen-formen.js
 * SCHREIBT: eigene kleine Canvas-Bilder (kein Spielzustand)
 * REGEL:    Stil: dunkel, rußig, Frostpunk-STIL, aber eigene Formen (KONZEPT §1)
 * DEBUG:    `(await import('/render/fundstellen-bilder.js')).fundBilderAnsehen()` hängt alle unten an.
 *
 * Gemalt wird in Metern (ctx.scale(PX_JE_M)), Mitte des Bildes = Mitte der Fundstelle.
 * Schatten fallen wie beim Koloss immer nach Südosten (feste Sonne, nicht mitgedreht).
 */

import { FUNDARTEN, KOHLEHALDE, RUINE, OELFAESSER } from '../data/fundstellen.js';
import { SCHATTEN, klecks, balken, schneeObenauf, versatz } from './fundstellen-formen.js';
import { optikZufall } from './boden.js';

/** Bildpunkte je Meter in den Bildchen (beim Zeichnen wird skaliert). */
export const PX_JE_M = 10;
/** Rand ums Bild (m) für Schatten und Schneewehen. */
const RAND_M = 3;
/** Varianten je Art. */
const VARIANTEN = 4;

/** @type {HTMLCanvasElement[][]} */
const bilder = [];

/**
 * Das Bild einer Fundart (beim ersten Aufruf werden alle Varianten dieser Art gemalt).
 * @param {number} art  Index in FUNDARTEN
 * @param {number} variante  beliebige Ganzzahl
 * @returns {HTMLCanvasElement}
 */
export function fundBild(art, variante) {
  const satz = bilder[art] ?? (bilder[art] = Array.from({ length: VARIANTEN }, (_, v) => malen(art, v)));
  return satz[((variante % VARIANTEN) + VARIANTEN) % VARIANTEN];
}

/**
 * @param {number} art @param {number} v
 * @returns {HTMLCanvasElement}
 */
function malen(art, v) {
  const halb = FUNDARTEN[art].radiusM + RAND_M;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(2 * halb * PX_JE_M);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.scale(PX_JE_M, PX_JE_M);
  ctx.translate(halb, halb);
  const z = optikZufall(art * 101 + v * 17 + 5);
  if (art === KOHLEHALDE) kohlehalde(ctx, z, v);
  else if (art === RUINE) ruine(ctx, z);
  else if (art === OELFAESSER) oelfaesser(ctx, z);
  else vorratslager(ctx, z);
  return c;
}

// ── Fundarten ─────────────────────────────────────────────

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z @param {number} v */
function kohlehalde(ctx, z, v) {
  const r = FUNDARTEN[KOHLEHALDE].radiusM * 0.85;
  const [sx, sy] = versatz(2.5);
  ctx.fillStyle = SCHATTEN;
  klecks(ctx, z, sx, sy, r, 0.25); ctx.fill();
  // Kohlenstaub im Schnee rundherum
  ctx.fillStyle = 'rgba(28, 30, 33, 0.3)';
  klecks(ctx, z, 0, 0, r * 1.22, 0.35); ctx.fill();
  // Der Haufen: Licht von Nordwesten
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#43474d'); g.addColorStop(0.55, '#24272b'); g.addColorStop(1, '#121315');
  ctx.fillStyle = g;
  klecks(ctx, z, 0, 0, r, 0.3); ctx.fill();
  // Brocken
  const farben = ['#0e0f11', '#1b1d20', '#2a2d31', '#3b3f45'];
  for (let i = 0; i < 90; i++) {
    const w = z() * Math.PI * 2, d = r * 0.92 * Math.sqrt(z()), x = Math.cos(w) * d, y = Math.sin(w) * d;
    const g2 = 0.18 + z() * 0.45;
    ctx.fillStyle = farben[Math.floor(z() * farben.length)];
    klecks(ctx, z, x, y, g2, 0.6); ctx.fill();
    ctx.fillStyle = 'rgba(150, 160, 170, 0.22)'; // Glanzpunkt der Kohle
    klecks(ctx, z, x - g2 * 0.3, y - g2 * 0.3, g2 * 0.35, 0.4); ctx.fill();
  }
  schneeObenauf(ctx, z, r * 0.95, 16, 0.7);
  if (v % 2 === 0) foerderwagen(ctx, z, r);
}

/** Verlassener Förderwagen am Rand der Halde. @param {CanvasRenderingContext2D} ctx @param {() => number} z @param {number} r */
function foerderwagen(ctx, z, r) {
  const w = z() * Math.PI * 2;
  ctx.save();
  ctx.translate(Math.cos(w) * r * 1.05, Math.sin(w) * r * 1.05);
  ctx.rotate(w + Math.PI / 2 + (z() - 0.5));
  ctx.fillStyle = SCHATTEN;
  ctx.fillRect(-1.0 + 0.4, -0.7 + 0.5, 2.0, 1.4);
  ctx.fillStyle = '#5a2e1a'; ctx.fillRect(-1.0, -0.7, 2.0, 1.4);
  ctx.fillStyle = '#17181a'; ctx.fillRect(-0.8, -0.5, 1.6, 1.0);
  ctx.strokeStyle = '#2b1309'; ctx.lineWidth = 0.08; ctx.strokeRect(-1.0, -0.7, 2.0, 1.4);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z */
function ruine(ctx, z) {
  const lang = 11 + z() * 2, breit = 7 + z() * 1.5, dreh = z() * Math.PI;
  ctx.save();
  ctx.rotate(dreh);
  // Boden der Hütte: festgetretener, grauer Schnee
  ctx.fillStyle = 'rgba(150, 156, 162, 0.45)';
  ctx.fillRect(-lang / 2, -breit / 2, lang, breit);
  // Mauerreste mit Lücken
  ctx.fillStyle = SCHATTEN;
  mauern(ctx, z, lang, breit, 0.5, 0.6);
  mauern(ctx, z, lang, breit, 0, 0);
  // Eingestürztes Dach über einer Hälfte
  ctx.fillStyle = '#4f3420';
  ctx.beginPath();
  ctx.moveTo(-lang / 2 + 0.5, -breit / 2 + 0.5);
  ctx.lineTo(lang * (0.05 + z() * 0.2), -breit / 2 + 0.3);
  ctx.lineTo(lang * (-0.05 + z() * 0.2), breit / 2 - 0.4);
  ctx.lineTo(-lang / 2 + 0.4, breit / 2 - 0.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2f1e11'; ctx.lineWidth = 0.09;
  for (let x = -lang / 2 + 1; x < lang * 0.1; x += 0.6) {
    ctx.beginPath(); ctx.moveTo(x, -breit / 2 + 0.5); ctx.lineTo(x - 0.2, breit / 2 - 0.6); ctx.stroke();
  }
  ctx.restore();
  // Lose Balken und Bretter rundherum
  for (let i = 0; i < 9; i++) {
    const w = z() * Math.PI * 2, d = 2 + z() * 7;
    balken(ctx, Math.cos(w) * d, Math.sin(w) * d, 2.5 + z() * 3.5, 0.3 + z() * 0.15, z() * Math.PI, z() < 0.5 ? '#7a5230' : '#5e3d22');
  }
  schneeObenauf(ctx, z, 8, 14, 1.4);
}

/**
 * Mauern der Ruine als Steinreihe mit zufälligen Lücken.
 * @param {CanvasRenderingContext2D} ctx @param {() => number} z
 * @param {number} lang @param {number} breit @param {number} dx @param {number} dy  Versatz (Schatten)
 */
function mauern(ctx, z, lang, breit, dx, dy) {
  const schatten = dx !== 0;
  const ecken = [[-lang / 2, -breit / 2], [lang / 2, -breit / 2], [lang / 2, breit / 2], [-lang / 2, breit / 2]];
  for (let s = 0; s < 4; s++) {
    const [x0, y0] = ecken[s], [x1, y1] = ecken[(s + 1) % 4];
    const laenge = Math.hypot(x1 - x0, y1 - y0), schritte = Math.floor(laenge / 0.7);
    for (let i = 0; i <= schritte; i++) {
      if (z() < 0.22) continue; // eingestürzte Stellen
      const t = i / schritte, x = x0 + (x1 - x0) * t + dx, y = y0 + (y1 - y0) * t + dy;
      if (!schatten) ctx.fillStyle = z() < 0.5 ? '#6f6b66' : '#57534e';
      klecks(ctx, z, x, y, 0.38, 0.4); ctx.fill();
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z */
function oelfaesser(ctx, z) {
  // Ölfleck im Schnee: mehrere zerfranste Lachen übereinander (Mitte fast schwarz), dazu Spritzer.
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(20, 13, 8, 0.38)';
    klecks(ctx, z, (z() - 0.5) * 2.5, (z() - 0.5) * 2.5, 1.6 + z() * 1.6, 0.8); ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = 'rgba(20, 13, 8, 0.5)';
    klecks(ctx, z, (z() - 0.5) * 8, (z() - 0.5) * 8, 0.2 + z() * 0.45, 0.6); ctx.fill();
  }
  /** @type {[number, number][]} */
  const plaetze = [];
  for (let versuch = 0; versuch < 60 && plaetze.length < 8; versuch++) {
    const x = (z() - 0.5) * 6, y = (z() - 0.5) * 6;
    if (plaetze.every(([px, py]) => Math.hypot(px - x, py - y) > 1.05)) plaetze.push([x, y]);
  }
  plaetze.forEach(([x, y], i) => (i % 4 === 3 ? fassLiegend(ctx, z, x, y) : fassStehend(ctx, z, x, y)));
}

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z @param {number} x @param {number} y */
function fassStehend(ctx, z, x, y) {
  const r = 0.45, [sx, sy] = versatz(1);
  ctx.fillStyle = SCHATTEN;
  ctx.beginPath(); ctx.arc(x + sx, y + sy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = z() < 0.3 ? '#5b3a22' : '#7a2e1c';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2e1008'; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255, 190, 150, 0.3)'; // Glanz am Deckelrand
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, Math.PI * 1.05, Math.PI * 1.6); ctx.arc(x, y, r * 0.7, Math.PI * 1.6, Math.PI * 1.05, true); ctx.fill();
  ctx.fillStyle = '#1a0b06';
  ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.2, 0.07, 0, Math.PI * 2); ctx.fill();
  if (z() < 0.5) { ctx.fillStyle = 'rgba(238, 242, 246, 0.85)'; klecks(ctx, z, x - r * 0.3, y - r * 0.3, r * 0.4, 0.5); ctx.fill(); }
}

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z @param {number} x @param {number} y */
function fassLiegend(ctx, z, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = SCHATTEN;
  ctx.fillRect(-0.55 + 0.3, -0.42 + 0.4, 1.1, 0.84);
  ctx.rotate(z() * Math.PI);
  ctx.fillStyle = '#6e2919';
  ctx.fillRect(-0.55, -0.42, 1.1, 0.84);
  ctx.fillStyle = 'rgba(255, 190, 150, 0.22)';
  ctx.fillRect(-0.55, -0.42, 1.1, 0.2);
  ctx.fillStyle = '#2e1008';
  for (const hx of [-0.3, 0.3]) ctx.fillRect(hx - 0.04, -0.42, 0.08, 0.84);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {() => number} z */
function vorratslager(ctx, z) {
  const [sx, sy] = versatz(1.4);
  // Plane über einem Teil der Vorräte
  const pw = z() * Math.PI;
  ctx.save();
  ctx.rotate(pw);
  ctx.fillStyle = SCHATTEN;
  ctx.fillRect(-2.6 + sx, -1.9 + sy, 5.2, 3.8);
  ctx.fillStyle = '#596049';
  ctx.beginPath();
  ctx.moveTo(-2.6, -1.9); ctx.lineTo(2.4, -2.1); ctx.lineTo(2.7, 1.8); ctx.lineTo(-2.3, 2.0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(25, 30, 20, 0.6)'; ctx.lineWidth = 0.1;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-2.5, i * 1.1); ctx.lineTo(2.5, i * 1.1 + 0.2); ctx.stroke(); }
  ctx.restore();
  // Kisten
  for (let i = 0; i < 5; i++) {
    const w = z() * Math.PI * 2, d = 2.4 + z() * 2.2;
    kiste(ctx, Math.cos(w) * d, Math.sin(w) * d, 1.1 + z() * 0.4, z() * Math.PI / 2);
  }
  // Säcke
  for (let i = 0; i < 4; i++) {
    const w = z() * Math.PI * 2, d = 2 + z() * 2.5, x = Math.cos(w) * d, y = Math.sin(w) * d;
    ctx.fillStyle = SCHATTEN;
    ctx.beginPath(); ctx.ellipse(x + 0.3, y + 0.4, 0.55, 0.38, w, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c3ad82';
    ctx.beginPath(); ctx.ellipse(x, y, 0.55, 0.38, w, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6e5c3b'; ctx.lineWidth = 0.06; ctx.stroke();
  }
  schneeObenauf(ctx, z, 3.5, 8, 0.8);
}

/**
 * Holzkiste mit Brettern und Querstrebe.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} g  Kantenlänge (m) @param {number} w
 */
function kiste(ctx, x, y, g, w) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = SCHATTEN;
  ctx.fillRect(-g / 2 + 0.45, -g / 2 + 0.6, g, g);
  ctx.rotate(w);
  ctx.fillStyle = '#93663a';
  ctx.fillRect(-g / 2, -g / 2, g, g);
  ctx.strokeStyle = '#5c3d1f'; ctx.lineWidth = 0.05;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-g / 2, -g / 2 + (g * i) / 4); ctx.lineTo(g / 2, -g / 2 + (g * i) / 4); ctx.stroke(); }
  ctx.lineWidth = 0.12;
  ctx.beginPath(); ctx.moveTo(-g / 2, -g / 2); ctx.lineTo(g / 2, g / 2); ctx.stroke();
  ctx.strokeStyle = '#3a250f'; ctx.lineWidth = 0.08; ctx.strokeRect(-g / 2, -g / 2, g, g);
  ctx.restore();
}

/** Debug: alle Bildchen unten an die Seite hängen. */
export function fundBilderAnsehen() {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:0;bottom:0;background:#dfe6ec;padding:6px;display:flex;gap:6px;z-index:9;flex-wrap:wrap';
  for (let a = 0; a < FUNDARTEN.length; a++) for (let v = 0; v < VARIANTEN; v++) box.appendChild(fundBild(a, v));
  document.body.appendChild(box);
}
