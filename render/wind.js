// @ts-check
/**
 * wind.js — Wind für Darstellung und Anzeige: Umrechnung und Schneetreiben.
 *
 * ZWECK:    Rechnet den Wind aus dem Zustand in Meter/Sekunde um (Kommazahlen, nur Optik),
 *           sagt, ob der eigene Koloss Gegen-, Rücken- oder Seitenwind hat, und zeichnet
 *           Schneetreiben, das mit dem Wind über den Boden fegt.
 * LIEST:    state.wetter, Kamera
 * SCHREIBT: eigene Teilchenliste (kein Spielzustand)
 * REGEL:    KONZEPT.md §5 „Wetter“
 * DEBUG:    `ek.state.wetter`; F3 zeigt Wind und relative Lage.
 */

import { kamera, weltZuBild } from './kamera.js';

/** @typedef {import('../sim/types.js').Wetter} Wetter */

/**
 * @param {Wetter} w
 * @returns {{vx: number, vy: number, ms: number, rad: number}}  m/s, Bogenmaß (wohin er weht)
 */
export function windVektor(w) {
  const rad = (w.windRichtung / 65536) * 2 * Math.PI;
  const ms = w.windStaerke / 10;
  return { vx: Math.cos(rad) * ms, vy: Math.sin(rad) * ms, ms, rad };
}

/**
 * Wind relativ zur Fahrtrichtung.
 * @param {Wetter} w
 * @param {number} hRad  Fahrtrichtung des Kolosses (Bogenmaß)
 * @returns {string}  „Gegenwind“, „Rückenwind“, „Seitenwind von links/rechts“
 */
export function windRelativ(w, hRad) {
  const d = windVektor(w).rad - hRad;
  const c = Math.cos(d);
  if (c < -0.5) return 'Gegenwind';
  if (c > 0.5) return 'Rückenwind';
  // Weht der Wind zur rechten Seite des Kolosses, kommt er von links.
  return Math.sin(d) > 0 ? 'Seitenwind von links' : 'Seitenwind von rechts';
}

// ── Schneetreiben ─────────────────────────────────────────

/** @type {{x: number, y: number, vx: number, vy: number, alter: number, dauer: number}[]} */
const flocken = [];
const FLOCKEN_MAX = 260;

/**
 * Bewegt und erzeugt Schneetreiben im sichtbaren Bereich.
 * @param {Wetter} w
 * @param {number} dtMs
 */
export function schneetreibenAktualisieren(w, dtMs) {
  const s = dtMs / 1000;
  for (let i = flocken.length - 1; i >= 0; i--) {
    const f = flocken[i];
    f.alter += dtMs;
    if (f.alter >= f.dauer) { flocken.splice(i, 1); continue; }
    f.x += f.vx * s; f.y += f.vy * s;
  }
  if (kamera.zoom < 0.8 || dtMs <= 0) return;
  const v = windVektor(w);
  // Bei 1 m/s kaum Treiben, ab ~12 m/s volle Menge.
  const ziel = Math.min(FLOCKEN_MAX, Math.round(v.ms * v.ms * 1.8));
  const halbB = kamera.breite / 2 / kamera.zoom, halbH = kamera.hoehe / 2 / kamera.zoom;
  let neu = Math.min(ziel - flocken.length, Math.ceil(ziel * s * 1.2));
  while (neu-- > 0) {
    const tempo = 1.2 + Math.random() * 0.8; // Treibschnee ist schneller als der Mittelwind (Böen)
    flocken.push({
      x: kamera.x + (Math.random() * 2 - 1) * halbB * 1.1,
      y: kamera.y + (Math.random() * 2 - 1) * halbH * 1.1,
      vx: v.vx * tempo + (Math.random() - 0.5), vy: v.vy * tempo + (Math.random() - 0.5),
      alter: 0, dauer: 700 + Math.random() * 1300,
    });
  }
}

/**
 * Zeichnet das Schneetreiben als kurze, helle Striche in Windrichtung.
 * @param {CanvasRenderingContext2D} ctx
 */
export function schneetreibenZeichnen(ctx) {
  if (kamera.zoom < 0.8) return;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, Math.min(3, 0.12 * kamera.zoom));
  for (const f of flocken) {
    const t = f.alter / f.dauer;
    const a = Math.sin(t * Math.PI) * 0.75; // ein- und ausblenden
    const [x1, y1] = weltZuBild(f.x, f.y);
    const [x0, y0] = weltZuBild(f.x - f.vx * 0.2, f.y - f.vy * 0.2);
    // Bläulich-grau statt weiß: Weiß auf Schnee sähe man nicht.
    ctx.strokeStyle = `rgba(140, 162, 188, ${a * 0.7})`;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
}

/** Löscht das Schneetreiben (neue Welt). */
export function schneetreibenZuruecksetzen() { flocken.length = 0; }
