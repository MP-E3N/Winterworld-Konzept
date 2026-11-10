// @ts-check
/**
 * ofen.js — Schalter der Heizung an Bord in Gestalt eines kleinen gusseisernen Ofens (Spieltest M4a).
 *
 * ZWECK:    Wie die Öllampe beim Licht: an = Glut leuchtet durch das Gitter der Ofentür, warmer
 *           Schein, Hitze flimmert über dem Rohr; aus = kalte, dunkle Tür. Ein Klick (oder Taste O)
 *           schaltet um. Die Heizung wärmt die Mannschaft und kostet zusätzlich Brennstoff.
 * LIEST:    an/aus und ob das Feuer brennt (von ui/anzeige.js übergeben)
 * SCHREIBT: nur das eigene kleine Canvas
 * REGEL:    keine Texte in der Oberfläche, lieber sichtbares Verhalten (Nutzerwunsch)
 * DEBUG:    Glüht nicht, obwohl an? Dann brennt das Feuer nicht (Brennstoff alle) — gewollt.
 */

/** Zeichenfläche (CSS-Pixel) und Mitte. */
const B = 44, H = 54, MX = 22;
/** Nur Optik: Flackern der Glut. */
const optik = { glut: 1, ziel: 1, zeit: 0, flimmer: 0 };

/**
 * Bereitet das Canvas vor (Schärfe auf hochauflösenden Bildschirmen).
 * @param {HTMLCanvasElement} c
 */
export function ofenEinrichten(c) {
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
  c.style.width = B + 'px'; c.style.height = H + 'px';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Zeichnet den Ofen.
 * @param {HTMLCanvasElement} c @param {boolean} gluehend  Heizung an UND Feuer brennt @param {number} dtMs
 */
export function ofenZeichnen(c, gluehend, dtMs) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  optik.zeit += dtMs;
  optik.flimmer += dtMs;
  if (optik.zeit > 120) { optik.zeit = 0; optik.ziel = 0.75 + Math.random() * 0.35; }
  optik.glut += (optik.ziel - optik.glut) * (1 - Math.exp(-dtMs / 80));
  ctx.clearRect(0, 0, B, H);
  if (gluehend) schein(ctx, optik.glut);
  rohr(ctx, gluehend);
  koerper(ctx);
  tuer(ctx, gluehend, optik.glut);
  fuesse(ctx);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} f */
function schein(ctx, f) {
  const g = ctx.createRadialGradient(MX, 36, 2, MX, 36, 22);
  g.addColorStop(0, `rgba(255, 140, 50, ${0.5 * f})`);
  g.addColorStop(1, 'rgba(255, 110, 30, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, B, H);
}

/** Ofenrohr; an: flimmernde Hitze darüber. @param {CanvasRenderingContext2D} ctx @param {boolean} an */
function rohr(ctx, an) {
  ctx.fillStyle = '#2b2d30';
  ctx.fillRect(MX + 3, 6, 5, 14);
  ctx.fillStyle = '#b5703a';
  ctx.fillRect(MX + 2, 10, 7, 2);
  if (!an) return;
  ctx.strokeStyle = 'rgba(255, 200, 150, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const p = (optik.flimmer / 400 + i * 0.5) % 1;
    ctx.beginPath();
    ctx.moveTo(MX + 5.5, 5 - p * 4);
    ctx.quadraticCurveTo(MX + 8 + Math.sin(p * 6) * 2, 2 - p * 4, MX + 5.5, -1 - p * 4);
    ctx.stroke();
  }
}

/** Gusseiserner Körper mit Messingband. @param {CanvasRenderingContext2D} ctx */
function koerper(ctx) {
  const g = ctx.createLinearGradient(MX - 13, 0, MX + 13, 0);
  g.addColorStop(0, '#1d1f22'); g.addColorStop(0.4, '#4a4e54'); g.addColorStop(1, '#17181a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(MX - 13, 18, 26, 28, 4);
  ctx.fill();
  ctx.strokeStyle = '#0c0d0e'; ctx.lineWidth = 1; ctx.stroke();
  // Deckplatte und Messingband
  ctx.fillStyle = '#3a3e43';
  ctx.fillRect(MX - 15, 16, 30, 4);
  ctx.fillStyle = '#c08f3e';
  ctx.fillRect(MX - 13, 23, 26, 2);
}

/**
 * Ofentür mit Gitter: an = Glut dahinter, aus = schwarz.
 * @param {CanvasRenderingContext2D} ctx @param {boolean} an @param {number} f
 */
function tuer(ctx, an, f) {
  const x = MX - 8, y = 28, b = 16, h = 13;
  if (an) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(255, 220, 120, ${0.9 * f})`);
    g.addColorStop(1, `rgba(230, 90, 20, ${f})`);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#0d0e0f';
  }
  ctx.fillRect(x, y, b, h);
  ctx.strokeStyle = '#2a2c2f'; ctx.lineWidth = 1.4;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + (b * i) / 4, y); ctx.lineTo(x + (b * i) / 4, y + h); ctx.stroke(); }
  ctx.strokeStyle = '#c08f3e'; ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, b + 1, h + 1);
}

/** @param {CanvasRenderingContext2D} ctx */
function fuesse(ctx) {
  ctx.fillStyle = '#1a1b1d';
  ctx.fillRect(MX - 12, 46, 4, 5);
  ctx.fillRect(MX + 8, 46, 4, 5);
}
