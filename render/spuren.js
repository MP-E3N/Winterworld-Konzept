// @ts-check
/**
 * spuren.js — Was der Koloss im Schnee zurücklässt: breite Radspuren, Ruß und Schlacke.
 * Dazu der Takt der Dampfstöße (vier pro Radumdrehung).
 *
 * ZWECK:    Spuren zeigen, wie man gefahren ist (auf Eis liegen sie schräg zur Fahrtrichtung =
 *           Rutschen). Ruß und Schlacke zeigen: Hier ist ein gewaltiger, dreckiger Ofen vorbei.
 * LIEST:    Lage je Koloss (Meter), Stärke, Wind
 * SCHREIBT: eigene Listen (kein Spielzustand; geht bei Neustart verloren)
 * REGEL:    KONZEPT.md §6
 * DEBUG:    `ek.optik()` zeigt Spurpunkte, Rußflecken und Teilchen.
 */

import { kamera, weltZuBild } from './kamera.js';
import { rauchAusstossen, rauchStoss, rauchBewegen, dampfStoss, teilchenAnzahl, rauchZuruecksetzen } from './rauch.js';
import { KOLOSS_BREITE_M } from '../data/koloss.js';
import { RAD_DURCHMESSER_M, TRAKTION_UEBERSTAND_M } from '../data/ansicht.js';

const SPUR_ABSTAND_M = 1.2;
const SPUR_MAX = 4000;          // je Koloss, ≈ 4,8 km
// Spieltest 2–4: breit und nach INNEN. Außenkante = Außenkante der breiten Traktionsräder; die
// Spur reicht bis 0,5 m an die Mitte heran (das Fahrgestell schiebt den Schnee platt).
const SPUR_AUSSEN_M = KOLOSS_BREITE_M / 2 + TRAKTION_UEBERSTAND_M;
const SPUR_BREITE_M = SPUR_AUSSEN_M - 0.5;
const SPUR_MITTE_M = SPUR_AUSSEN_M - SPUR_BREITE_M / 2;
const RUSS_MAX = 12000;
const RUSS_HALTBAR_MS = 4 * 60 * 1000; // danach verblasst er über eine Minute (Spielzeit)

/**
 * @typedef {Object} OptikJeKoloss
 * @property {number[]} links  [x0, y0, x1, y1, …]
 * @property {number[]} rechts
 * @property {number} lx @property {number} ly  letzter Spurpunkt
 * @property {number} weg  gefahrene Meter bis zum letzten Spurpunkt
 * @property {number} wegJetzt  gefahrene Meter inkl. Reststück (für Räder und Dampfmaschine)
 * @property {number} takt  zuletzt ausgelöster Dampfstoß (Zähler)
 * @property {{rest: number}} rauch
 * @property {number} schlackeRest
 * @property {number} ventilRest
 */

/** @type {OptikJeKoloss[]} */
const jeKoloss = [];
/** @type {{x: number, y: number, r: number, a: number, alter: number}[]} */
const russ = [];

/** Löscht alles (neue Welt). */
export function optikZuruecksetzen() {
  jeKoloss.length = 0;
  russ.length = 0;
  rauchZuruecksetzen();
}

/**
 * Einmal pro Bild und Koloss.
 * @param {number} id
 * @param {{x: number, y: number, h: number}} lage
 * @param {[number, number]} schornstein  Weltmeter
 * @param {number} staerke  0 … 1 (Druck × Gas)
 * @param {number} druckAnteil  0 … 1 (nur Druck; fürs Sicherheitsventil)
 * @param {{vx: number, vy: number}} wind  m/s
 * @param {number} dtMs
 * @returns {number} gefahrene Meter insgesamt
 */
export function optikAktualisieren(id, lage, schornstein, staerke, druckAnteil, wind, dtMs) {
  let o = jeKoloss[id];
  if (!o) {
    o = jeKoloss[id] = { links: [], rechts: [], lx: lage.x, ly: lage.y, weg: 0, wegJetzt: 0, takt: 0,
      rauch: { rest: 0 }, schlackeRest: 0, ventilRest: 0 };
  }
  const d = Math.hypot(lage.x - o.lx, lage.y - o.ly);
  const weg = o.weg + d;
  o.wegJetzt = weg;
  if (d >= SPUR_ABSTAND_M) spurPunkt(o, lage, d);

  rauchAusstossen(o.rauch, schornstein, staerke, druckAnteil, wind, dtMs);
  dampfImTakt(o, lage, weg, staerke, druckAnteil, schornstein, wind);
  schlackeFallenLassen(o, lage, staerke, druckAnteil, dtMs);
  sicherheitsventil(o, lage, druckAnteil, dtMs);
  return weg;
}

/**
 * Einmal pro Bild für alle: Rauch bewegen (legt Ruß ab), alten Ruß verblassen lassen.
 * @param {{vx: number, vy: number}} wind
 * @param {number} dtMs
 */
export function optikBewegen(wind, dtMs) {
  rauchBewegen(wind, dtMs, russAblegen);
  for (let i = russ.length - 1; i >= 0; i--) {
    russ[i].alter += dtMs;
    if (russ[i].alter > RUSS_HALTBAR_MS + 60000) russ.splice(i, 1);
  }
}

/**
 * Gefahrene Meter eines Kolosses (für die Dampfmaschine im HUD).
 * @param {number} id
 * @returns {number}
 */
export function wegVon(id) { return jeKoloss[id] ? jeKoloss[id].wegJetzt : 0; }

// ── Spuren ────────────────────────────────────────────────

/**
 * @param {OptikJeKoloss} o
 * @param {{x: number, y: number, h: number}} lage
 * @param {number} d
 */
function spurPunkt(o, lage, d) {
  o.weg += d;
  o.lx = lage.x; o.ly = lage.y;
  // Quer zur FAHRZEUGrichtung (nicht zur Bewegung) → Rutschen wird sichtbar.
  const qx = -Math.sin(lage.h) * SPUR_MITTE_M, qy = Math.cos(lage.h) * SPUR_MITTE_M;
  o.links.push(lage.x - qx, lage.y - qy);
  o.rechts.push(lage.x + qx, lage.y + qy);
  if (o.links.length > SPUR_MAX * 2) { o.links.splice(0, 2); o.rechts.splice(0, 2); }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function spurenZeichnen(ctx) {
  if (kamera.zoom < 0.3) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  // Zwei Lagen: breiter, heller Wall aus weggedrücktem Schnee + dunklere, gepresste Rinne.
  const lagen = [
    { breite: SPUR_BREITE_M, farbe: 'rgba(150, 165, 182, 0.22)' },
    { breite: SPUR_BREITE_M * 0.62, farbe: 'rgba(105, 118, 134, 0.30)' },
  ];
  for (const l of lagen) {
    ctx.strokeStyle = l.farbe;
    ctx.lineWidth = Math.max(1.5, l.breite * kamera.zoom);
    for (const o of jeKoloss) {
      if (!o) continue;
      for (const liste of [o.links, o.rechts]) linieZeichnen(ctx, liste);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} liste
 */
function linieZeichnen(ctx, liste) {
  ctx.beginPath();
  for (let i = 0; i < liste.length; i += 2) {
    const [bx, by] = weltZuBild(liste[i], liste[i + 1]);
    if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.stroke();
}

// ── Dampf, Schlacke, Ruß ──────────────────────────────────

/**
 * Vier Dampfstöße pro Radumdrehung aus den Zylindern vorne links und rechts — und jedes Mal
 * auch ein Rauchstoß aus dem Schornstein. Dadurch passt das Puffen zum Tempo.
 * @param {OptikJeKoloss} o
 * @param {{x: number, y: number, h: number}} lage
 * @param {number} weg
 * @param {number} staerke @param {number} druckAnteil
 * @param {[number, number]} schornstein @param {{vx: number, vy: number}} wind
 */
function dampfImTakt(o, lage, weg, staerke, druckAnteil, schornstein, wind) {
  const takt = Math.floor((weg / (Math.PI * RAD_DURCHMESSER_M)) * 4);
  if (takt === o.takt) return;
  o.takt = takt;
  if (staerke <= 0.02) return; // ohne Gas kein Abdampf
  rauchStoss(schornstein, staerke, druckAnteil, wind);
  const c = Math.cos(lage.h), s = Math.sin(lage.h);
  const seite = takt % 2 === 0 ? 1 : -1; // abwechselnd links und rechts
  const lx = 9, ly = seite * 4.2;        // Zylinder vorne an der Seite (Fahrzeugmeter)
  const x = lage.x + c * lx - s * ly, y = lage.y + s * lx + c * ly;
  dampfStoss(x, y, -s * seite * 4, c * seite * 4, staerke);
}

/**
 * Schlacke, Asche und Kohlestaub fallen hinten unter dem Feuerraum in den Schnee — über die ganze
 * Breite. Spieltest 2: „deutlich mehr Dreck hinter dem Fahrzeug“. Meist kleine schwarze Brocken,
 * dazu breite, blasse Rußschleier.
 * @param {OptikJeKoloss} o @param {{x: number, y: number, h: number}} lage
 * @param {number} staerke @param {number} druckAnteil @param {number} dtMs
 */
function schlackeFallenLassen(o, lage, staerke, druckAnteil, dtMs) {
  // Spieltest 3: noch viel mehr — bis ~70 Flecken/s bei Volldampf.
  o.schlackeRest += (dtMs / 1000) * (druckAnteil * 10 + staerke * 60);
  const c = Math.cos(lage.h), s = Math.sin(lage.h);
  while (o.schlackeRest >= 1) {
    o.schlackeRest -= 1;
    const hinten = -10 - Math.random() * 6.5, quer = (Math.random() - 0.5) * 7.6;
    const x = lage.x + c * hinten - s * quer, y = lage.y + s * hinten + c * quer;
    const w = Math.random();
    if (w < 0.7) russAblegen(x, y, 0.1 + Math.random() * 0.3, 1.8);        // Schlackebrocken
    else if (w < 0.92) russAblegen(x, y, 0.8 + Math.random() * 1.2, 0.6);  // Rußschleier
    else russAblegen(x, y, 1.6 + Math.random() * 1.4, 0.35);               // breite Ascheflecken
  }
}

/**
 * Bei Volldampf bläst das Sicherheitsventil am Dom immer wieder weißen Dampf ab — auch im Stand.
 * @param {OptikJeKoloss} o @param {{x: number, y: number, h: number}} lage
 * @param {number} druckAnteil @param {number} dtMs
 */
function sicherheitsventil(o, lage, druckAnteil, dtMs) {
  if (druckAnteil < 0.99) return;
  o.ventilRest += (dtMs / 1000) * 2.5;
  while (o.ventilRest >= 1) {
    o.ventilRest -= 1;
    const x = lage.x + Math.cos(lage.h) * 6.6, y = lage.y + Math.sin(lage.h) * 6.6;
    dampfStoss(x, y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.25);
  }
}

/**
 * Legt einen Rußfleck ab.
 * @param {number} x @param {number} y @param {number} r  Meter
 * @param {number} dunkel  0 … 1 (> 1 = Schlacke, kleiner und schwärzer)
 */
function russAblegen(x, y, r, dunkel) {
  if (russ.length >= RUSS_MAX) russ.shift();
  russ.push({ x, y, r, a: Math.min(0.55, 0.05 + dunkel * 0.13), alter: 0 });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function russZeichnen(ctx) {
  if (kamera.zoom < 0.3) return;
  for (const f of russ) {
    const [bx, by] = weltZuBild(f.x, f.y);
    const r = Math.max(0.6, f.r * kamera.zoom);
    if (bx < -r || by < -r || bx > kamera.breite + r || by > kamera.hoehe + r) continue;
    const verblassen = f.alter < RUSS_HALTBAR_MS ? 1 : 1 - (f.alter - RUSS_HALTBAR_MS) / 60000;
    ctx.fillStyle = `rgba(38, 33, 30, ${f.a * verblassen})`;
    // Winzige Brocken als Rechteck: bei tausenden Flecken deutlich schneller als Kreise.
    if (r < 1.5) { ctx.fillRect(bx - r, by - r, r * 2, r * 2); continue; }
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  }
}

/** Zahlen fürs Debug. @returns {{spurpunkte: number, russ: number, teilchen: number}} */
export function optikZahlen() {
  return {
    spurpunkte: jeKoloss.reduce((n, o) => n + (o ? o.links.length / 2 : 0), 0),
    russ: russ.length,
    teilchen: teilchenAnzahl(),
  };
}
