// @ts-check
/**
 * formen.js — Grundformen für die Fahrzeugzeichnung (Zylinder, Kreis, abgerundetes Rechteck).
 *
 * ZWECK:    Kleine Zeichenhilfen, damit render/koloss.js unter der Dateigrenze bleibt.
 * LIEST:    nichts
 * SCHREIBT: nur das Canvas
 * REGEL:    KONZEPT.md §6 („Grafik am Anfang: alles per Code gezeichnet“)
 * DEBUG:    Maße in dem Koordinatensystem, das der Aufrufer gerade gesetzt hat (meist Fahrzeugmeter).
 */

/**
 * Liegender Zylinder von oben: Rechteck mit Querverlauf hell in der Mitte.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x  hinteres Ende
 * @param {number} y  Mittellinie
 * @param {number} laenge @param {number} durchmesser
 * @param {string} dunkel @param {string} hell
 */
export function zylinder(ctx, x, y, laenge, durchmesser, dunkel, hell) {
  const g = ctx.createLinearGradient(0, y - durchmesser / 2, 0, y + durchmesser / 2);
  g.addColorStop(0, dunkel);
  g.addColorStop(0.35, hell);
  g.addColorStop(1, dunkel);
  ctx.fillStyle = g;
  rundRechteck(ctx, x, y - durchmesser / 2, laenge, durchmesser, durchmesser / 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} r @param {string} farbe
 */
export function kreis(ctx, x, y, r, farbe) {
  ctx.fillStyle = farbe;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} b @param {number} h @param {number} r
 */
export function rundRechteck(ctx, x, y, b, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, b, h, r);
}
