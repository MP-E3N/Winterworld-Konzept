// @ts-check
/**
 * koloss-aufbau.js — Fahrgestell, Rumpf, Kessel und Aufbauten des Kolosses (von oben).
 *
 * ZWECK:    Die Teile über den Rädern. render/koloss.js ruft sie in fester Reihenfolge auf:
 *           fahrgestell → (Lenkräder) → rumpf → kessel → aufbau.
 * LIEST:    render/koloss-mass.js, data/ansicht.js (Farben)
 * SCHREIBT: nur das Canvas
 * REGEL:    KONZEPT.md §6 („alles per Code gezeichnet“); Maße im Rumpf-System (Meter, +x = vorne)
 * DEBUG:    Teil verdeckt ein anderes? Reihenfolge in kolossZeichnen() prüfen.
 */

import { FARBEN_KOLOSS as F } from '../data/ansicht.js';
import { zylinder, kreis, rundRechteck } from './formen.js';
import {
  L, B, MITTE_VON, MITTE_BIS, MITTE_SCHRAEGE, GESTELL_HALB, RUMPF_HALB, GESTELL_MITTE_HALB, RUMPF_MITTE_HALB,
  SCHORNSTEIN_X, DOM_X, KESSEL_VON, KESSEL_BIS, LAMPEN, NEBEN_SCHORNSTEINE,
} from './koloss-mass.js';

/** Vorderes Ende des grünen Rumpfs; davor Pufferbohle und Schneepflug (m). */
const RUMPF_VORN = L / 2 - 2.5;

/**
 * Schwarzes Fahrgestell (mit verbreitertem Mittelteil) und Schneepflug.
 * @param {CanvasRenderingContext2D} ctx
 */
export function fahrgestell(ctx) {
  ctx.fillStyle = F.schwarz;
  rundRechteck(ctx, -L / 2, -GESTELL_HALB, L - 1.5, GESTELL_HALB * 2, 0.8);
  ctx.fill();
  mittelForm(ctx, GESTELL_MITTE_HALB, GESTELL_HALB);
  ctx.fill();
  // Schneepflug vorne (Keil)
  ctx.fillStyle = F.grau;
  ctx.beginPath();
  ctx.moveTo(L / 2 - 2.2, -B / 2 + 0.4);
  ctx.lineTo(L / 2 + 0.8, -0.6);
  ctx.lineTo(L / 2 + 0.8, 0.6);
  ctx.lineTo(L / 2 - 2.2, B / 2 - 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = F.schwarz;
  ctx.lineWidth = 0.2;
  ctx.stroke();
}

/**
 * Grüner Rumpf. Vorne und hinten schmaler (dort sieht man die breiten Lenkräder), am Mittelteil
 * breit mit Kupferleiste und Nieten (Spieltest M2b).
 * @param {CanvasRenderingContext2D} ctx
 */
export function rumpf(ctx) {
  const g = ctx.createLinearGradient(0, -RUMPF_MITTE_HALB, 0, RUMPF_MITTE_HALB);
  g.addColorStop(0, F.gruenHell);
  g.addColorStop(0.45, F.gruen);
  g.addColorStop(1, F.gruenDunkel);
  ctx.fillStyle = g;
  rundRechteck(ctx, -L / 2 + 0.5, -RUMPF_HALB, RUMPF_VORN + L / 2 - 0.5, RUMPF_HALB * 2, 1.0);
  ctx.fill();
  mittelForm(ctx, RUMPF_MITTE_HALB, RUMPF_HALB);
  ctx.fill();
  ctx.strokeStyle = F.kupfer;
  ctx.lineWidth = 0.18;
  for (const s of [-1, 1]) {
    const y = s * (RUMPF_MITTE_HALB - 0.25);
    ctx.beginPath(); ctx.moveTo(MITTE_VON + MITTE_SCHRAEGE + 0.2, y); ctx.lineTo(MITTE_BIS - MITTE_SCHRAEGE - 0.2, y); ctx.stroke();
    for (let x = MITTE_VON + MITTE_SCHRAEGE + 0.6; x < MITTE_BIS - MITTE_SCHRAEGE; x += 1.3) kreis(ctx, x, y, 0.12, '#d8a25e');
  }
}

/**
 * Achteck des Mittelteils: volle Breite in der Mitte, Schrägen an den Enden.
 * @param {CanvasRenderingContext2D} ctx @param {number} halb  halbe Breite in der Mitte
 * @param {number} innen  halbe Breite an den Enden (= normaler Rumpf)
 */
function mittelForm(ctx, halb, innen) {
  ctx.beginPath();
  ctx.moveTo(MITTE_VON, -innen);
  ctx.lineTo(MITTE_VON + MITTE_SCHRAEGE, -halb);
  ctx.lineTo(MITTE_BIS - MITTE_SCHRAEGE, -halb);
  ctx.lineTo(MITTE_BIS, -innen);
  ctx.lineTo(MITTE_BIS, innen);
  ctx.lineTo(MITTE_BIS - MITTE_SCHRAEGE, halb);
  ctx.lineTo(MITTE_VON + MITTE_SCHRAEGE, halb);
  ctx.lineTo(MITTE_VON, innen);
  ctx.closePath();
}

/**
 * Zwei schwarze Druckkessel hinten, der lange grüne Hauptkessel bis ganz nach vorn (Spieltest M2b:
 * statt des Laderaums) mit Rauchkammer an der Spitze, Dampfdom, Sanddom und Schornsteinen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} last  0 … 1 — wie hart die Maschine arbeitet (Feuerschein)
 */
export function kessel(ctx, last) {
  for (const y of [-1.45, 1.45]) {
    zylinder(ctx, -18, y, 12, 2.6, '#0d0f10', '#4a5157');
    ctx.fillStyle = F.kupfer;
    for (let x = -17; x < -6.5; x += 2.2) ctx.fillRect(x, y - 1.3, 0.35, 2.6);
  }
  for (const n of NEBEN_SCHORNSTEINE) kleinerSchornstein(ctx, n.x, n.y, n.r, last * n.anteil * 2);
  // Hauptkessel mit schwarzen Bändern
  zylinder(ctx, KESSEL_VON, 0, KESSEL_BIS - KESSEL_VON, 3.6, F.gruenDunkel, F.gruenHell);
  ctx.fillStyle = F.schwarz;
  for (const x of [-3, 1, 5.5, 9.5]) ctx.fillRect(x, -1.8, 0.3, 3.6);
  // Rauchkammer vorn: dunkler Graphit, Kupferring, Nietenreihe, Türgriff
  const rk = KESSEL_BIS - 3;
  zylinder(ctx, rk, 0, 3, 3.75, '#15191b', '#4a5157');
  ctx.fillStyle = F.kupfer;
  ctx.fillRect(rk, -1.88, 0.35, 3.76);
  for (let y = -1.5; y <= 1.5; y += 0.5) kreis(ctx, rk + 0.75, y, 0.09, '#9aa3aa');
  ctx.fillStyle = '#d8a25e';
  ctx.fillRect(KESSEL_BIS - 0.6, -0.12, 0.7, 0.24);
  // Sanddom (Messingkappe) und Dampfdom
  kreis(ctx, 10.4, 0, 0.95, F.gruenDunkel);
  kreis(ctx, 10.3, -0.15, 0.55, '#c08f3e');
  kreis(ctx, DOM_X, 0, 1.3, F.gruenDunkel);
  kreis(ctx, DOM_X - 0.2, -0.25, 0.8, F.gruenHell);
  schornstein(ctx, last);
}

/**
 * Der große Schornstein (Spieltest M2b: deutlich betont): genieteter Fuß auf dem Kessel, breite
 * Kupferkrone mit gezackter Kante, schwarzer Rand,
 * Öffnung mit Feuerschein, der mit der Last heller wird und flackert (Spieltest M2b).
 * @param {CanvasRenderingContext2D} ctx @param {number} last  0 … 1
 */
function schornstein(ctx, last) {
  const x = SCHORNSTEIN_X;
  // Fuß: dunkler Flansch, quer über den Kessel, mit Nieten
  ctx.fillStyle = '#1a1d1f';
  rundRechteck(ctx, x - 2.3, -2.3, 4.6, 4.6, 1.2);
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const w = (i / 12) * Math.PI * 2;
    kreis(ctx, x + Math.cos(w) * 2.0, Math.sin(w) * 2.0, 0.11, '#9aa3aa');
  }
  // Krone: gezackte Kupferkante (16 Zacken), heller Messingring darin
  ctx.fillStyle = '#8a4f22';
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const w = (i / 32) * Math.PI * 2, r = i % 2 === 0 ? 1.95 : 1.65;
    if (i === 0) ctx.moveTo(x + Math.cos(w) * r, Math.sin(w) * r); else ctx.lineTo(x + Math.cos(w) * r, Math.sin(w) * r);
  }
  ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(x - 0.5, -0.5, 0.2, x, 0, 1.6);
  g.addColorStop(0, '#f6dc9a'); g.addColorStop(0.6, F.kupfer); g.addColorStop(1, '#6b3a14');
  kreis(ctx, x, 0, 1.6, '#000');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 0, 1.55, 0, Math.PI * 2); ctx.fill();
  kreis(ctx, x, 0, 1.2, F.schwarz);
  feuerschein(ctx, x, 0, 1.05, last);
}

/**
 * Öffnung eines Schornsteins: rußig schwarz, darin ein Feuerschein — je mehr Last, desto heller,
 * gelber und größer; flackert leicht.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r
 * @param {number} last  0 … 1
 */
function feuerschein(ctx, x, y, r, last) {
  const glut = feuerGlut(last);
  const o = ctx.createRadialGradient(x, y, 0.02, x, y, r);
  o.addColorStop(0, `rgba(255, ${Math.round(120 + glut * 120)}, ${Math.round(40 + glut * 80)}, ${0.35 + glut * 0.65})`);
  o.addColorStop(0.25 + glut * 0.35, `rgba(200, ${Math.round(50 + glut * 50)}, 15, ${0.25 + glut * 0.6})`);
  o.addColorStop(1, '#030303');
  ctx.fillStyle = '#030303'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/**
 * Wie stark das Feuer glüht (0 … 1) bei dieser Last — schon bei mittlerer Last fast voll, flackert.
 * Spieltest M2b: „viel heller, man sieht es kaum, wenn man auf Last geht“.
 * @param {number} last  0 … 1
 * @returns {number}
 */
export function feuerGlut(last) {
  return Math.min(1, 0.12 + last * 1.4) * (0.82 + Math.random() * 0.18);
}

/**
 * Kleiner Schornstein: dunkler Fuß, Kupferring, Öffnung mit schwachem Feuerschein.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r
 * @param {number} last  0 … 1
 */
function kleinerSchornstein(ctx, x, y, r, last) {
  kreis(ctx, x, y, r + 0.35, '#1a1d1f');
  kreis(ctx, x, y, r, F.kupfer);
  kreis(ctx, x, y, r * 0.78, F.schwarz);
  feuerschein(ctx, x, y, r * 0.62, last);
}


/**
 * Führerhaus hinten, kleiner Schornstein, Kupferrohre, rote Pufferbohle vorn mit den Scheinwerfern.
 * @param {CanvasRenderingContext2D} ctx
 * @param {boolean} licht  Scheinwerfer an
 * @param {number} last  0 … 1 (Feuerschein im kleinen Schornstein)
 */
export function aufbau(ctx, licht, last) {
  ctx.fillStyle = F.gruenDunkel;
  rundRechteck(ctx, -L / 2 + 0.3, -RUMPF_HALB + 0.2, 2.8, RUMPF_HALB * 2 - 0.4, 0.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 140, 0.55)';
  ctx.fillRect(-L / 2 + 2.6, -1.6, 0.4, 3.2);
  for (const n of NEBEN_SCHORNSTEINE) kleinerSchornstein(ctx, n.x, n.y, n.r, last * n.anteil * 2);
  // Kupferrohre: am Mittelteil außen, dann neben dem Hauptkessel bis zur Rauchkammer.
  ctx.strokeStyle = F.kupfer;
  ctx.lineWidth = 0.28;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(MITTE_VON + 1.6, s * 3.3);
    ctx.lineTo(-6, s * 3.3);
    ctx.lineTo(-4.5, s * 2.3);
    ctx.lineTo(KESSEL_BIS - 3.4, s * 2.3);
    ctx.stroke();
  }
  // Pufferbohle
  ctx.fillStyle = F.rot;
  rundRechteck(ctx, RUMPF_VORN - 0.6, -RUMPF_HALB, 0.9, RUMPF_HALB * 2, 0.2);
  ctx.fill();
  lampen(ctx, licht);
}

/**
 * Scheinwerfer: Messinggehäuse, Glas dunkel (aus) oder hell mit Lichthof (an).
 * @param {CanvasRenderingContext2D} ctx @param {boolean} an
 */
function lampen(ctx, an) {
  for (const [x, y] of LAMPEN) {
    kreis(ctx, x, y, 0.55, '#6b4416');
    kreis(ctx, x, y, 0.45, '#c08f3e');
    kreis(ctx, x + 0.05, y, 0.32, an ? '#fffbe6' : '#6f6650');
    if (!an) continue;
    const g = ctx.createRadialGradient(x, y, 0.1, x, y, 1.8);
    g.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
    g.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}
