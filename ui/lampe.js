// @ts-check
/**
 * lampe.js — Lichtschalter in Gestalt einer Öllampe (Sturmlaterne).
 *
 * ZWECK:    Spieltest M2b: Statt eines Kippschalters zeigt eine kleine Öllampe, ob die Scheinwerfer
 *           an sind — an: Flamme flackert, Glas glüht warm, Lichthof drumherum; aus: rußiges, dunkles
 *           Glas, nur der Docht. Ein Klick (oder Taste L) schaltet um.
 * LIEST:    an/aus vom eigenen Koloss (von ui/anzeige.js übergeben)
 * SCHREIBT: nur das eigene kleine Canvas
 * REGEL:    keine Texte in der Oberfläche, lieber sichtbares Verhalten (Nutzerwunsch)
 * DEBUG:    Flackert nicht? dtMs = 0 bei Pause — dann steht auch die Flamme still (gewollt).
 */

/** Zeichenfläche (CSS-Pixel) und Mitte der Lampe. */
const B = 44, H = 54, MX = 22;
/** Nur Optik: Flackern der Flamme. */
const optik = { flamme: 1, ziel: 1, zeit: 0 };

/**
 * Bereitet das Canvas vor (Schärfe auf hochauflösenden Bildschirmen).
 * @param {HTMLCanvasElement} c
 */
export function lampeEinrichten(c) {
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
  c.style.width = B + 'px'; c.style.height = H + 'px';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Zeichnet die Lampe.
 * @param {HTMLCanvasElement} c @param {boolean} an @param {number} dtMs
 */
export function lampeZeichnen(c, an, dtMs) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  optik.zeit += dtMs;
  if (optik.zeit > 90) { optik.zeit = 0; optik.ziel = 0.82 + Math.random() * 0.3; }
  optik.flamme += (optik.ziel - optik.flamme) * (1 - Math.exp(-dtMs / 60));
  ctx.clearRect(0, 0, B, H);
  if (an) lichthof(ctx, optik.flamme);
  henkel(ctx);
  glas(ctx, an, optik.flamme);
  if (an) flamme(ctx, optik.flamme); else docht(ctx);
  korb(ctx);
  fuss(ctx);
}

// ── Teile ─────────────────────────────────────────────────

/** @param {CanvasRenderingContext2D} ctx @param {number} f  Flackern */
function lichthof(ctx, f) {
  const g = ctx.createRadialGradient(MX, 26, 2, MX, 26, 22);
  g.addColorStop(0, `rgba(255, 210, 110, ${0.55 * f})`);
  g.addColorStop(1, 'rgba(255, 190, 80, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, B, H);
}

/** Drahtbügel oben. @param {CanvasRenderingContext2D} ctx */
function henkel(ctx) {
  ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(MX, 10, 7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  // Deckel mit Lüftung
  const g = ctx.createLinearGradient(MX - 8, 0, MX + 8, 0);
  g.addColorStop(0, '#6b4416'); g.addColorStop(0.45, '#e2b862'); g.addColorStop(1, '#6b4416');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(MX - 4, 9); ctx.lineTo(MX + 4, 9); ctx.lineTo(MX + 8, 14); ctx.lineTo(MX - 8, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 0.8; ctx.stroke();
}

/**
 * Glaskolben: aus = rußig dunkel, an = warmes Glühen.
 * @param {CanvasRenderingContext2D} ctx @param {boolean} an @param {number} f
 */
function glas(ctx, an, f) {
  const g = ctx.createRadialGradient(MX, 29, 1, MX, 28, 11);
  if (an) {
    g.addColorStop(0, '#fff8d8');
    g.addColorStop(0.45, `rgba(255, 205, 100, ${0.85 * f})`);
    g.addColorStop(1, 'rgba(210, 120, 40, 0.75)');
  } else {
    g.addColorStop(0, 'rgba(90, 96, 98, 0.85)');
    g.addColorStop(1, 'rgba(38, 42, 44, 0.95)');
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(MX, 28, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
  // Glanzlicht
  ctx.fillStyle = an ? 'rgba(255, 255, 240, 0.55)' : 'rgba(220, 230, 235, 0.35)';
  ctx.beginPath(); ctx.ellipse(MX - 4.5, 24, 1.4, 4.5, -0.2, 0, Math.PI * 2); ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} f */
function flamme(ctx, f) {
  const h = 9 * f;
  const g = ctx.createLinearGradient(0, 34 - h, 0, 34);
  g.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
  g.addColorStop(0.6, '#ffd060');
  g.addColorStop(1, '#e8701a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(MX, 34 - h);
  ctx.quadraticCurveTo(MX + 3.6, 30, MX, 34.5);
  ctx.quadraticCurveTo(MX - 3.6, 30, MX, 34 - h);
  ctx.fill();
}

/** Nur der kalte Docht. @param {CanvasRenderingContext2D} ctx */
function docht(ctx) {
  ctx.fillStyle = '#141414';
  ctx.fillRect(MX - 1, 31.5, 2, 3);
}

/** Schutzkorb aus Messingdraht über dem Glas. @param {CanvasRenderingContext2D} ctx */
function korb(ctx) {
  ctx.strokeStyle = '#8a6430'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MX - 9, 16); ctx.quadraticCurveTo(MX - 12.5, 28, MX - 9, 40);
  ctx.moveTo(MX + 9, 16); ctx.quadraticCurveTo(MX + 12.5, 28, MX + 9, 40);
  ctx.moveTo(MX, 15); ctx.lineTo(MX, 19);
  ctx.stroke();
}

/** Messing-Ölbehälter mit Dochtrad. @param {CanvasRenderingContext2D} ctx */
function fuss(ctx) {
  const g = ctx.createLinearGradient(MX - 11, 0, MX + 11, 0);
  g.addColorStop(0, '#5a3a10'); g.addColorStop(0.4, '#e2b862'); g.addColorStop(1, '#5a3a10');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(MX - 11, 39, 22, 9, 3.5); ctx.fill();
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#c08f3e';
  ctx.beginPath(); ctx.arc(MX + 12.5, 43.5, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.stroke();
}
