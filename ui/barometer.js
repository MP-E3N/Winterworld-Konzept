// @ts-check
/**
 * barometer.js — Messing-Barometer unten rechts: kündigt Schneestürme an (M5a, Nutzerwahl).
 *
 * ZWECK:    Statt eines Warntextes fällt die Nadel einige Minuten vor einem Sturm von „Schön“ über
 *           „Veränderlich“ nach „Sturm“, bleibt dort, solange er tobt, und steigt beim Abflauen wieder.
 *           Halbrunde Skala im Stil der Kessel-Anzeigen: Messingring, cremefarbenes Zifferblatt,
 *           dunkelroter Sturmbereich, schwarze Nadel mit Messingkappe.
 * LIEST:    Barometerwert 0 … 1000 (sim/wetter/sturm.js barometer(), von ui/anzeige.js übergeben)
 * SCHREIBT: nur das eigene kleine Canvas
 * REGEL:    keine Warntexte (Nutzerwunsch); neu malen nur, wenn sich die Nadel sichtbar bewegt
 * DEBUG:    Wann der nächste Sturm kommt: ek.wetter().
 */

/** Zeichenfläche (CSS-Pixel), Mitte und Radius des Zifferblatts. */
const B = 132, H = 74, MX = 66, MY = 66, R = 56;
/** Skala: links Sturm (π) … rechts Schön (2π) — ein oben offenes Halbrund. */
const LINKS = Math.PI, RECHTS = Math.PI * 2;
/** Zuletzt gezeichneter Wert (gerundet), damit nicht jedes Bild neu gemalt wird. */
let zuletzt = -1;

/**
 * Bereitet das Canvas vor (Schärfe auf hochauflösenden Bildschirmen).
 * @param {HTMLCanvasElement} c
 */
export function barometerEinrichten(c) {
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
  c.style.width = B + 'px'; c.style.height = H + 'px';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).setTransform(dpr, 0, 0, dpr, 0, 0);
  zuletzt = -1;
}

/**
 * Zeichnet das Barometer.
 * @param {HTMLCanvasElement} c @param {number} wert  0 = Sturm … 1000 = schön
 */
export function barometerZeichnen(c, wert) {
  const gerundet = Math.round(wert / 4);
  if (gerundet === zuletzt) return;
  zuletzt = gerundet;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.clearRect(0, 0, B, H);
  gehaeuse(ctx);
  skala(ctx);
  nadel(ctx, LINKS + (RECHTS - LINKS) * Math.max(0, Math.min(1, wert / 1000)));
}

/** Messingring und Zifferblatt. @param {CanvasRenderingContext2D} ctx */
function gehaeuse(ctx) {
  const g = ctx.createLinearGradient(0, MY - R - 6, 0, MY);
  g.addColorStop(0, '#f0d48e'); g.addColorStop(0.6, '#c08f3e'); g.addColorStop(1, '#7a5220');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(MX, MY, R + 6, LINKS, RECHTS); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#efe6cf';
  ctx.beginPath(); ctx.arc(MX, MY, R, LINKS, RECHTS); ctx.closePath(); ctx.fill();
  // Nieten im Ring
  ctx.fillStyle = '#7a5220';
  for (const w of [LINKS + 0.12, (LINKS + RECHTS) / 2, RECHTS - 0.12]) {
    ctx.beginPath(); ctx.arc(MX + Math.cos(w) * (R + 3), MY + Math.sin(w) * (R + 3), 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

/** Sturmbereich, Striche, Beschriftung. @param {CanvasRenderingContext2D} ctx */
function skala(ctx) {
  ctx.strokeStyle = '#8c2a1d'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(MX, MY, R - 6, LINKS + 0.02, LINKS + 0.55); ctx.stroke();
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const w = LINKS + ((RECHTS - LINKS) * i) / 10, lang = i % 5 === 0 ? 9 : 5;
    ctx.beginPath();
    ctx.moveTo(MX + Math.cos(w) * (R - 2), MY + Math.sin(w) * (R - 2));
    ctx.lineTo(MX + Math.cos(w) * (R - 2 - lang), MY + Math.sin(w) * (R - 2 - lang));
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2a18';
  ctx.font = 'italic 600 9px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Sturm', MX - R + 25, MY - 15);
  ctx.fillText('Veränderlich', MX, MY - R + 20);
  ctx.fillText('Schön', MX + R - 24, MY - 15);
}

/** Nadel mit Messingkappe. @param {CanvasRenderingContext2D} ctx @param {number} winkel */
function nadel(ctx, winkel) {
  const lx = MX + Math.cos(winkel) * (R - 9), ly = MY + Math.sin(winkel) * (R - 9);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(MX + 1, MY + 1); ctx.lineTo(lx + 1, ly + 1); ctx.stroke();
  ctx.strokeStyle = '#141414'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(MX, MY); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.fillStyle = '#c08f3e';
  ctx.beginPath(); ctx.arc(MX, MY, 4.5, 0, Math.PI * 2); ctx.fill();
}
