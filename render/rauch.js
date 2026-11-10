// @ts-check
/**
 * rauch.js — Rauch aus dem Schornstein, Dampfstöße aus den Zylindern, Abdampf am Sicherheitsventil.
 *
 * ZWECK:    Man soll sehen, wie hart der Kessel arbeitet: mehr Druck → dichter, dunkler, größerer
 *           Rauch und kräftigere weiße Dampfstöße im Takt der Räder. Rauch treibt mit dem Wind
 *           und lässt unterwegs Ruß auf den Schnee fallen (render/spuren.js).
 * LIEST:    Lage, Stärke, Wind (m/s)
 * SCHREIBT: eigene Teilchenliste (kein Spielzustand)
 * REGEL:    KONZEPT.md §6
 * DEBUG:    `ek.optik()` zeigt die Anzahl Teilchen. Zu viele → TEILCHEN_MAX senken.
 */

import { kamera, weltZuBild } from './kamera.js';

const TEILCHEN_MAX = 1000;

/**
 * @typedef {Object} Teilchen
 * @property {'rauch' | 'dampf'} art
 * @property {number} x @property {number} y   Meter
 * @property {number} vx @property {number} vy  m/s
 * @property {number} alter @property {number} dauer  ms
 * @property {number} groesse  Startradius (m)
 * @property {number} wachsen  Radius-Zuwachs über die Lebenszeit (m)
 * @property {number} dunkel   0 … 1 (nur Rauch)
 * @property {number} russ     Chance, beim Absinken Ruß abzulegen (0 … 1); −1 = schon geprüft
 */

/** @type {Teilchen[]} */
const teilchen = [];

/**
 * Schornsteinrauch für ein Bild ausstoßen.
 * @param {{rest: number}} merker  pro Koloss (sammelt Bruchteile)
 * @param {[number, number]} pos  Schornstein (Meter)
 * @param {number} staerke  0 … 1 (Druck × Gas)
 * @param {number} druckAnteil  0 … 1 (nur Druck)
 * @param {{vx: number, vy: number}} wind  m/s
 * @param {number} dtMs
 */
export function rauchAusstossen(merker, pos, staerke, druckAnteil, wind, dtMs) {
  // Spieltest 2: schon auf Stufe 1–2 viel Rauch (Grundmenge hängt am Druck).
  // Spieltest 3: wieder dunkel wie zuvor. Dazu kommen Rauchstöße im Radtakt (rauchStoss).
  if (druckAnteil <= 0 && staerke <= 0) {
    merker.rest += dtMs / 1000; // ruhender Kessel: ein dünner Faden (1 Wölkchen/s)
  } else {
    merker.rest += (dtMs / 1000) * (8 + druckAnteil * 10 + staerke * 14); // Spieltest 4: mehr
  }
  while (merker.rest >= 1) {
    merker.rest -= 1;
    rauchTeilchen(pos, staerke, druckAnteil, wind, 2);
  }
}

/**
 * Ein Rauchstoß aus dem Schornstein — kommt im Takt der Kolben (vier pro Radumdrehung).
 * WARUM: So passt der Rauch zum Tempo: langsam = gemächliches Puffen, schnell = dichtes Stakkato.
 * @param {[number, number]} pos
 * @param {number} staerke @param {number} druckAnteil
 * @param {{vx: number, vy: number}} wind
 */
export function rauchStoss(pos, staerke, druckAnteil, wind) {
  const anzahl = 3 + Math.round(staerke * 4);
  for (let i = 0; i < anzahl; i++) rauchTeilchen(pos, staerke, druckAnteil, wind, 5);
}

/**
 * @param {[number, number]} pos
 * @param {number} staerke @param {number} druckAnteil
 * @param {{vx: number, vy: number}} wind
 * @param {number} wurf  Anfangstempo in zufälliger Richtung (m/s); Stöße werfen weiter
 */
function rauchTeilchen(pos, staerke, druckAnteil, wind, wurf) {
  if (teilchen.length >= TEILCHEN_MAX) return;
  teilchen.push({
    art: 'rauch',
    x: pos[0] + (Math.random() - 0.5) * 1.2, y: pos[1] + (Math.random() - 0.5) * 1.2,
    vx: wind.vx * 0.3 + (Math.random() - 0.5) * wurf, vy: wind.vy * 0.3 + (Math.random() - 0.5) * wurf,
    alter: 0, dauer: 3500 + Math.random() * 2000 + druckAnteil * 2000 + staerke * 2500,
    groesse: 0.9 + druckAnteil * 0.6 + staerke * 0.8, wachsen: 4 + druckAnteil * 2 + staerke * 5,
    dunkel: Math.min(1, 0.55 + druckAnteil * 0.25 + staerke * 0.3), russ: 0.04 + staerke * 0.2,
  });
}

/**
 * Ein weißer Dampfstoß (Zylinder-Abdampf oder Sicherheitsventil).
 * @param {number} x @param {number} y  Meter
 * @param {number} vx @param {number} vy  Anfangstempo (m/s), z. B. seitlich weg vom Koloss
 * @param {number} staerke  0 … 1
 */
export function dampfStoss(x, y, vx, vy, staerke) {
  const anzahl = 1 + Math.round(staerke * 3);
  for (let i = 0; i < anzahl && teilchen.length < TEILCHEN_MAX; i++) {
    teilchen.push({
      art: 'dampf', x, y,
      vx: vx * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 1.5,
      vy: vy * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 1.5,
      alter: 0, dauer: 600 + Math.random() * 600 + staerke * 700,
      groesse: 0.5 + staerke * 0.8, wachsen: 1.5 + staerke * 3, dunkel: 0, russ: -1,
    });
  }
}

/**
 * Bewegt alle Teilchen. Rauch gleicht sich langsam dem Wind an, Dampf bremst schnell ab.
 * @param {{vx: number, vy: number}} wind
 * @param {number} dtMs
 * @param {(x: number, y: number, r: number, staerke: number) => void} russAblegen
 */
export function rauchBewegen(wind, dtMs, russAblegen) {
  const s = dtMs / 1000;
  const anpassung = 1 - Math.exp(-s * 0.9);
  for (let i = teilchen.length - 1; i >= 0; i--) {
    const t = teilchen[i];
    t.alter += dtMs;
    if (t.alter >= t.dauer) { teilchen.splice(i, 1); continue; }
    const zielVx = t.art === 'dampf' ? wind.vx * 0.5 : wind.vx;
    const zielVy = t.art === 'dampf' ? wind.vy * 0.5 : wind.vy;
    t.vx += (zielVx - t.vx) * anpassung;
    t.vy += (zielVy - t.vy) * anpassung;
    t.x += t.vx * s; t.y += t.vy * s;
    // Ab der halben Lebenszeit sinkt Ruß aus der Wolke ab — einmal pro Teilchen würfeln.
    if (t.russ >= 0 && t.alter > t.dauer * 0.45) {
      if (Math.random() < t.russ) russAblegen(t.x, t.y, t.groesse + t.wachsen * 0.4, t.dunkel);
      t.russ = -1;
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function rauchZeichnen(ctx) {
  if (kamera.zoom < 0.3) return;
  for (const t of teilchen) {
    const f = t.alter / t.dauer;
    const [bx, by] = weltZuBild(t.x, t.y);
    const radius = (t.groesse + f * t.wachsen) * kamera.zoom;
    const einblenden = Math.min(1, f * 10);
    if (t.art === 'dampf') {
      ctx.fillStyle = `rgba(250, 252, 255, ${einblenden * (1 - f) * 0.45})`;
    } else {
      // Kohlenrauch: frisch fast schwarz, wird mit dem Alter heller und dünner. Spieltest 3+4:
      // „noch dunkler und mehr“ → dunkler Grundton, kräftigere Deckkraft.
      const grau = Math.round(22 + (1 - t.dunkel) * 60 + f * 95);
      ctx.fillStyle = `rgba(${grau}, ${grau}, ${grau + 3}, ${einblenden * (1 - f) * (0.12 + t.dunkel * 0.16)})`;
    }
    ctx.beginPath(); ctx.arc(bx, by, radius, 0, Math.PI * 2); ctx.fill();
  }
}

/** @returns {number} */
export function teilchenAnzahl() { return teilchen.length; }

/** Löscht alles (neue Welt). */
export function rauchZuruecksetzen() { teilchen.length = 0; }
