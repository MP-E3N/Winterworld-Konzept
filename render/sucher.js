// @ts-check
/**
 * sucher.js — Suchscheinwerfer auf dem Koloss: schmaler, weiter Lichtkegel, der der Maus folgt (Spieltest M5b).
 *
 * ZWECK:    Nutzerwunsch: „Einen Suchscheinwerfer, mit dem man um sich herum schauen kann — kleiner Kegel,
 *           dafür sieht man darin Dinge, die weiter weg sind, auch bei Nebel.“ An/aus ist Spielzustand
 *           (k.sucher, Taste F); WOHIN er zeigt, ist nur Darstellung: Er schwenkt träge zum Mauszeiger.
 *           Der Kegel schneidet die Schneewehen-Decke, den Sturmschleier und die Dunkelheit auf
 *           (render/nebel.js, render/sturm.js, render/licht.js fragen sucherKegel() ab).
 * LIEST:    eigener Koloss (sucher), Mausposition (render/fundstellen.js fundAnsicht.maus), Kamera
 * SCHREIBT: nur ansichtSucher (Darstellung)
 * REGEL:    Darstellung liest nur. Im Mehrspieler (M6) müsste die Richtung ein Befehl werden.
 * DEBUG:    ek.spiel; Werte in data/ansicht.js SUCHER_*.
 */

import { kamera, weltZuBild, bildZuWelt } from './kamera.js';
import { rumpfPunkt } from './koloss-mass.js';
import { SUCHER_REICHWEITE_M, SUCHER_KEGEL_GRAD, SUCHER_SCHWENK_GRAD_S } from '../data/ansicht.js';

/** @typedef {{x: number, y: number, h: number}} Lage */
/** @typedef {{x: number, y: number, winkel: number, halb: number, weite: number}} Kegel  Weltmeter, Bogenmaß */

/** Richtung des Scheinwerfers (Bogenmaß, Welt) — schwenkt träge zum Ziel. */
export const ansichtSucher = { winkel: /** @type {number | null} */ (null) };

/** Sitz auf dem Dach (Fahrzeug-Meter: vor der Rumpfmitte, auf der Längsachse). */
const SITZ = { x: 3, y: 0 };

/**
 * Jedes Bild: zum Mauszeiger schwenken und den Kegel liefern (oder null, wenn er aus ist).
 * @param {Lage | null} r  eigene Rumpfmitte @param {boolean} an
 * @param {{bx: number, by: number} | null} maus  Bildpunkt @param {number} dtMs
 * @returns {Kegel | null}
 */
export function sucherAktualisieren(r, an, maus, dtMs) {
  if (!r || !an) { ansichtSucher.winkel = null; return null; }
  const [sx, sy] = rumpfPunkt(r, SITZ.x, SITZ.y);
  if (ansichtSucher.winkel === null) ansichtSucher.winkel = r.h; // beim Einschalten nach vorn
  if (maus) {
    const [wx, wy] = bildZuWelt(maus.bx, maus.by);
    let rest = Math.atan2(wy - sy, wx - sx) - ansichtSucher.winkel;
    rest = Math.atan2(Math.sin(rest), Math.cos(rest)); // kürzester Weg
    const max = (SUCHER_SCHWENK_GRAD_S * Math.PI / 180) * (dtMs / 1000);
    ansichtSucher.winkel += Math.max(-max, Math.min(max, rest));
  }
  return { x: sx, y: sy, winkel: ansichtSucher.winkel, halb: (SUCHER_KEGEL_GRAD * Math.PI) / 180, weite: SUCHER_REICHWEITE_M };
}

/**
 * Den Kegel als Fläche mit weichem Verlauf füllen — in Bildpunkten oder (mit `abb`) in einem anderen Raster.
 * Füllt mit `innen` am Scheinwerfer bis zur Hälfte, dann weich auslaufend.
 * @param {CanvasRenderingContext2D} ctx @param {Kegel} k @param {string} innen @param {string} aussen
 * @param {(x: number, y: number) => [number, number]} [abb]  Weltmeter → Zeichenpunkt (Standard: Bildschirm)
 * @param {number} [massstab]  Zeichenpunkte je Meter (Standard: Kamera-Zoom)
 */
export function sucherKegel(ctx, k, innen, aussen, abb = weltZuBild, massstab = kamera.zoom) {
  const [px, py] = abb(k.x, k.y);
  const weite = k.weite * massstab;
  const g = ctx.createRadialGradient(px, py, 0, px, py, weite);
  g.addColorStop(0, innen);
  g.addColorStop(0.55, innen);
  g.addColorStop(1, aussen);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, weite, k.winkel - k.halb, k.winkel + k.halb);
  ctx.closePath();
  ctx.fill();
}

/**
 * Ein Lichtkegel mit WEICHEN Rändern (Bildpunkte): drei ineinanderliegende Kegel, außen breiter und schwächer.
 * Für das Aufschneiden der Dunkelheit (Spieltest M5b: Licht soll beleuchten, nicht mit harter Kante wegblenden).
 * @param {CanvasRenderingContext2D} ctx @param {number} px @param {number} py  Lampe (Bildpunkte)
 * @param {number} winkel @param {number} halb  Bogenmaß @param {number} weite  Bildpunkte
 * @param {string} rgb  „r, g, b“ @param {number} staerke  0 … 1 (Summe in der Kegelmitte)
 */
export function weicherKegel(ctx, px, py, winkel, halb, weite, rgb, staerke) {
  // Fünf Lagen: mit dreien sah man am Rand noch Stufen.
  for (const [breite, anteil] of /** @type {[number, number][]} */ ([[0.5, 0.3], [0.75, 0.25], [1, 0.22], [1.25, 0.15], [1.5, 0.1]])) {
    const g = ctx.createRadialGradient(px, py, 0, px, py, weite);
    g.addColorStop(0, `rgba(${rgb}, ${staerke * anteil})`);
    g.addColorStop(0.4, `rgba(${rgb}, ${staerke * anteil})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.arc(px, py, weite, winkel - halb * breite, winkel + halb * breite); ctx.closePath(); ctx.fill();
  }
}

/**
 * Der Scheinwerfer selbst auf dem Dach: Messinggehäuse, das in Strahlrichtung zeigt, mit hellem Glas.
 * @param {CanvasRenderingContext2D} ctx @param {Kegel | null} k
 */
export function sucherZeichnen(ctx, k) {
  if (!k || kamera.zoom < 1) return;
  const [bx, by] = weltZuBild(k.x, k.y);
  const z = kamera.zoom;
  ctx.save();
  ctx.translate(bx, by); ctx.rotate(k.winkel); ctx.scale(z, z);
  ctx.fillStyle = '#2a2b2e'; ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, Math.PI * 2); ctx.fill(); // Drehteller
  ctx.fillStyle = '#c08f3e'; ctx.fillRect(-0.6, -0.65, 1.8, 1.3);                              // Gehäuse
  ctx.fillStyle = '#fff6d8'; ctx.fillRect(1.1, -0.55, 0.35, 1.1);                              // Glas
  ctx.restore();
}
