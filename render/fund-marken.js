// @ts-check
/**
 * fund-marken.js — Was über Fundstellen und Abwürfen liegt: Ladebalken beim Bergen, Ring und
 *                  Messingschild unter der Maus, Reichweitenkreis des Kolosses.
 *
 * ZWECK:    Gezeichnet NACH der Dunkelheit, damit man es auch nachts sieht. Ob Bergen geht, zeigt die
 *           Farbe des Rings (Messing = ja, grau gestrichelt = nein, kurz rot = abgelehnt) — keine
 *           Warntexte (Nutzerwunsch).
 * LIEST:    Zustand (trupps, abwuerfe), fundAnsicht.hover aus render/fundstellen.js, Kamera
 * SCHREIBT: nur das Canvas
 * REGEL:    docs/specs/M3-fundstellen.md „Darstellung und Bedienung“
 */

import { kamera, weltZuBild } from './kamera.js';
import { fundAnsicht, markeVonFund, markeVonAbwurf, tonnen, ZOOM_MIN } from './fundstellen.js';
import { fundstelleMitId } from '../sim/welt/fundstellen.js';
import { kolossVon, truppVon, alsMeter } from '../sim/abfragen.js';
import { befehlPruefen } from '../sim/befehle.js';
import { FUNDARTEN, ABWURF_ARBEIT_PROZENT, BERGEN_REICHWEITE_M } from '../data/fundstellen.js';

/** @typedef {import('./fundstellen.js').Marke} Marke */
/** @typedef {import('../sim/types.js').Zustand} Zustand */

/** So lange leuchtet der Ring rot, wenn ein Klick abgelehnt wurde (ms). */
const ABGELEHNT_MS = 450;

/**
 * Ladebalken der arbeitenden Trupps und die Markierung unter der Maus.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Zustand} s
 * @param {number} spieler  eigene Spielernummer (verbindung.spieler)
 * @param {{x: number, y: number} | null} rumpf  eigene Rumpfmitte (Meter, überblendet) oder null
 */
export function fundMarkenZeichnen(ctx, s, spieler, rumpf) {
  if (kamera.zoom < ZOOM_MIN) return;
  for (const t of s.trupps) {
    const m = t.abwurf >= 0 ? markeVonAbwurf(s.abwuerfe[t.abwurf]) : t.fund >= 0 ? fundMarke(s, t.fund) : null;
    if (!m) continue;
    const arbeit = t.abwurf >= 0 ? (FUNDARTEN[m.art].arbeit * ABWURF_ARBEIT_PROZENT) / 100 : FUNDARTEN[m.art].arbeit;
    ladebalken(ctx, m, t.fortschritt / arbeit);
  }
  const m = fundAnsicht.hover;
  const k = kolossVon(s, spieler);
  if (!m || !k) return;
  const t = truppVon(s, k);
  const arbeitetHier = (m.fund >= 0 && t.fund === m.fund) || (m.abwurf >= 0 && t.abwurf === m.abwurf);
  const befehl = m.abwurf >= 0
    ? /** @type {import('../sim/types.js').Befehl} */ ({ art: 'AUFNEHMEN', spieler, abwurf: m.abwurf })
    : /** @type {import('../sim/types.js').Befehl} */ ({ art: 'BERGEN_START', spieler, fund: m.fund });
  const moeglich = arbeitetHier || befehlPruefen(s, befehl) === null;
  const rot = performance.now() - fundAnsicht.abgelehnt < ABGELEHNT_MS;
  if (rumpf) reichweite(ctx, rumpf);
  ring(ctx, m, rot ? '#c2452d' : moeglich ? '#e7bd62' : 'rgba(205, 214, 222, 0.85)', moeglich && !rot ? [] : [5, 4]);
  schild(ctx, m, m.rest > 0 ? `${m.name} · ${tonnen(m.rest)}` : `${m.name} · leer`);
}

/** @param {Zustand} s @param {number} id @returns {Marke | null} */
function fundMarke(s, id) {
  const f = fundstelleMitId(s.seed, id);
  return f ? markeVonFund(s, f) : null;
}

/** Abstand vom Mittelpunkt bis zum Rand der Marke (Bildpunkte). @param {Marke} m */
function radiusPx(m) {
  return Math.max(m.radiusM * kamera.zoom, 6);
}

/**
 * Messing-Ladebalken über der Marke: oben der geborgene Anteil, darunter das aktuelle Stück.
 * @param {CanvasRenderingContext2D} ctx @param {Marke} m @param {number} stueck  0 … 1
 */
function ladebalken(ctx, m, stueck) {
  const [bx, by] = weltZuBild(alsMeter(m.x), alsMeter(m.y));
  const b = 54, h = 10, x = Math.round(bx - b / 2), y = Math.round(by - radiusPx(m) - 22);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f0d48e'); g.addColorStop(0.6, '#c08f3e'); g.addColorStop(1, '#7d5523');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 1, y + 2, b, h + 4);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, b, h + 4);
  ctx.fillStyle = '#16191c';
  ctx.fillRect(x + 2, y + 2, b - 4, h - 4);
  ctx.fillStyle = '#e8a54a'; // Glut-Bernstein: geborgener Anteil
  ctx.fillRect(x + 2, y + 2, (b - 4) * (1 - m.rest / m.menge), h - 4);
  ctx.fillStyle = '#16191c';
  ctx.fillRect(x + 2, y + h, b - 4, 2);
  ctx.fillStyle = '#b5703a'; // Kupferleiste: das Stück, an dem der Trupp gerade arbeitet
  ctx.fillRect(x + 2, y + h, (b - 4) * Math.min(1, stueck), 2);
}

/** @param {CanvasRenderingContext2D} ctx @param {Marke} m @param {string} farbe @param {number[]} strich */
function ring(ctx, m, farbe, strich) {
  const [bx, by] = weltZuBild(alsMeter(m.x), alsMeter(m.y));
  ctx.beginPath();
  ctx.arc(bx, by, radiusPx(m) + 5, 0, Math.PI * 2);
  ctx.setLineDash(strich);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = farbe;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Reichweite des Trupps um die Rumpfmitte. @param {CanvasRenderingContext2D} ctx @param {{x: number, y: number}} rumpf */
function reichweite(ctx, rumpf) {
  const [bx, by] = weltZuBild(rumpf.x, rumpf.y);
  ctx.beginPath();
  ctx.arc(bx, by, BERGEN_REICHWEITE_M * kamera.zoom, 0, Math.PI * 2);
  ctx.setLineDash([3, 6]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(231, 189, 98, 0.6)';
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Graviertes Messingschild unter der Marke (wie das Telegrafenschild in der Anzeige).
 * @param {CanvasRenderingContext2D} ctx @param {Marke} m @param {string} text
 */
function schild(ctx, m, text) {
  const [bx, by] = weltZuBild(alsMeter(m.x), alsMeter(m.y));
  ctx.font = '600 12px Georgia, "Times New Roman", serif';
  const b = Math.ceil(ctx.measureText(text).width) + 18, h = 19;
  const x = Math.round(bx - b / 2), y = Math.round(by + radiusPx(m) + 10);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f0d48e'); g.addColorStop(0.6, '#c08f3e'); g.addColorStop(1, '#93652a');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 1, y + 2, b, h);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, b, h);
  ctx.strokeStyle = '#3a240c'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, b - 1, h - 1);
  ctx.fillStyle = '#6b4416'; // Nieten
  for (const nx of [x + 5, x + b - 5]) { ctx.beginPath(); ctx.arc(nx, y + h / 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#2a1806';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + b / 2, y + h / 2 + 1);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
