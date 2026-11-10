// @ts-check
/**
 * spuren.js — Was der Koloss im Schnee und in der Luft zurücklässt: breite Spuren mit Radabdrücken,
 * Schlacke und Asche, Rauch aller Schornsteine (mit Stößen im Radtakt), Funken und Rußflocken.
 *
 * ZWECK:    Spuren zeigen, wie man gefahren ist (auf Eis liegen sie schräg zur Fahrtrichtung =
 *           Rutschen). Dreck und Rauch zeigen: Hier ist ein gewaltiger, dreckiger Ofen vorbei.
 * LIEST:    Lage (Drehpunkt) und Rumpfmitte je Koloss (Meter), Last, Wind
 * SCHREIBT: eigene Listen (kein Spielzustand); Dreck und Radabdrücke werden in render/schmutz.js
 *           einmalig in Welt-Kacheln gestempelt (Leistung, Spieltest M2b)
 * REGEL:    KONZEPT.md §6
 * DEBUG:    `ek.optik()` zeigt Spurpunkte, Dreck-Kacheln und Teilchen.
 */

import { kamera, weltZuBild } from './kamera.js';
import { rauchAusstossen, rauchStoss, rauchBewegen, teilchenAnzahl, rauchZuruecksetzen } from './rauch.js';
import { funkenWerfen, flockenWerfen, funkenBewegen, funkenAnzahl, funkenZuruecksetzen } from './funken.js';
import { schmutzAblegen, stempeln, schmutzAltern, schmutzAnzahl, schmutzZuruecksetzen } from './schmutz.js';
import { varianten } from './sprites.js';
import { NEBEN_SCHORNSTEINE, rumpfPunkt } from './koloss-mass.js';
import { KOLOSS_BREITE_M } from '../data/koloss.js';
import { TRAKTION_DURCHMESSER_M, TRAKTION_UEBERSTAND_M, MITTE_BREITER_M, RAD_BREITE_M, LENKRAD_BREITE_M } from '../data/ansicht.js';

const SPUR_ABSTAND_M = 1.2;
const SPUR_MAX = 4000;          // je Koloss, ≈ 4,8 km
// Spieltest 2–4: breit und nach INNEN. Außenkante = Außenkante der breiten Traktionsräder; die
// Spur reicht bis 0,5 m an die Mitte heran (das Fahrgestell schiebt den Schnee platt).
const SPUR_AUSSEN_M = KOLOSS_BREITE_M / 2 + TRAKTION_UEBERSTAND_M + MITTE_BREITER_M;
/** Gepflügte Bahn: über die ganze Spurbreite plus Schneewall zu beiden Seiten (m, gesamte Breite). */
const BAHN_BREITE_M = 2 * SPUR_AUSSEN_M + 3;
const SPUR_BREITE_M = SPUR_AUSSEN_M - 0.5;
const SPUR_MITTE_M = SPUR_AUSSEN_M - SPUR_BREITE_M / 2;
/** Radabdrücke: Mitte und Breite der Traktions- und der Lenkradspur quer zur Fahrt (m). */
const TRAKTION_BREITE_M = RAD_BREITE_M + TRAKTION_UEBERSTAND_M;
const ABDRUCK = [
  { quer: KOLOSS_BREITE_M / 2 - RAD_BREITE_M + MITTE_BREITER_M + TRAKTION_BREITE_M / 2, breite: TRAKTION_BREITE_M + 0.3 },
  { quer: KOLOSS_BREITE_M / 2 - LENKRAD_BREITE_M / 2, breite: LENKRAD_BREITE_M + 0.2 },
];
/** Länge eines Abdruck-Stempels (m) — deutlich mehr als SPUR_ABSTAND_M: die weich ausgeblendeten Enden überlappen. */
const ABDRUCK_LAENGE_M = 2.2;

/**
 * @typedef {Object} OptikJeKoloss
 * @property {number[]} links  [x0, y0, x1, y1, …]
 * @property {number[]} rechts
 * @property {number[]} mitte  [x0, y0, …] Mittellinie der gepflügten Bahn (= Drehpunkt)
 * @property {number} lx @property {number} ly  letzter Spurpunkt
 * @property {number} weg  gefahrene Meter bis zum letzten Spurpunkt
 * @property {number} wegJetzt  gefahrene Meter inkl. Reststück (für Räder und Dampfmaschine)
 * @property {number} takt  zuletzt ausgelöster Rauchstoß (Zähler)
 * @property {{rest: number}} rauch
 * @property {{rest: number}[]} neben  je kleiner Schornstein
 * @property {number} schlackeRest
 * @property {number} funkenRest @property {number} flockenRest
 * @property {number} px @property {number} py  Rumpfmitte im letzten Bild (für das Tempo)
 * @property {{vx: number, vy: number}} fahrt  Tempo des Kolosses (m/s, geglättet)
 */

/** @type {OptikJeKoloss[]} */
const jeKoloss = [];

/** Löscht alles (neue Welt). */
export function optikZuruecksetzen() {
  jeKoloss.length = 0;
  schmutzZuruecksetzen();
  rauchZuruecksetzen();
  funkenZuruecksetzen();
}

/**
 * Einmal pro Bild und Koloss.
 * @param {number} id
 * @param {{x: number, y: number, h: number}} lage  Drehpunkt (Spuren)
 * @param {[number, number]} schornstein  Weltmeter
 * @param {number} staerke  0 … 1 (Last)
 * @param {number} druckAnteil  0 … 1 (nur Druck; fürs Sicherheitsventil)
 * @param {{vx: number, vy: number}} wind  m/s
 * @param {number} dtMs
 * @param {{x: number, y: number, h: number}} rumpf  Rumpfmitte (alles, was am Rumpf sitzt)
 * @returns {number} gefahrene Meter insgesamt
 */
export function optikAktualisieren(id, lage, schornstein, staerke, druckAnteil, wind, dtMs, rumpf) {
  let o = jeKoloss[id];
  if (!o) {
    o = jeKoloss[id] = { links: [], rechts: [], mitte: [], lx: lage.x, ly: lage.y, weg: 0, wegJetzt: 0, takt: 0,
      rauch: { rest: 0 }, neben: NEBEN_SCHORNSTEINE.map(() => ({ rest: 0 })), schlackeRest: 0,
      funkenRest: 0, flockenRest: 0, px: rumpf.x, py: rumpf.y, fahrt: { vx: 0, vy: 0 } };
  }
  if (dtMs > 0) {
    // Tempo aus der Bewegung zwischen zwei Bildern, leicht geglättet (Funken und Flocken erben es).
    const k = 1 - Math.exp(-dtMs / 150);
    o.fahrt.vx += ((rumpf.x - o.px) / (dtMs / 1000) - o.fahrt.vx) * k;
    o.fahrt.vy += ((rumpf.y - o.py) / (dtMs / 1000) - o.fahrt.vy) * k;
  }
  o.px = rumpf.x; o.py = rumpf.y;
  const d = Math.hypot(lage.x - o.lx, lage.y - o.ly);
  const weg = o.weg + d;
  o.wegJetzt = weg;
  if (d >= SPUR_ABSTAND_M) spurPunkt(o, lage, d);

  rauchAusstossen(o.rauch, schornstein, staerke, druckAnteil, wind, dtMs);
  NEBEN_SCHORNSTEINE.forEach((n, i) => {
    rauchAusstossen(o.neben[i], rumpfPunkt(rumpf, n.x, n.y), staerke, druckAnteil, wind, dtMs, n.anteil);
  });
  funkenUndFlocken(o, schornstein, staerke, druckAnteil, dtMs);
  rauchImTakt(o, weg, staerke, druckAnteil, schornstein, wind);
  schlackeFallenLassen(o, rumpf, staerke, druckAnteil, dtMs);
  return weg;
}

/**
 * Einmal pro Bild für alle: Rauch, Funken und Flocken bewegen (Rauch legt Ruß ab), Dreck verblassen.
 * @param {{vx: number, vy: number}} wind
 * @param {number} dtMs
 */
export function optikBewegen(wind, dtMs) {
  rauchBewegen(wind, dtMs, (x, y, r, a) => schmutzAblegen('russfeld', x, y, r, a));
  funkenBewegen(wind, dtMs);
  schmutzAltern(dtMs);
}

/**
 * Gefahrene Meter eines Kolosses (für die Dampfmaschine im HUD).
 * @param {number} id
 * @returns {number}
 */
export function wegVon(id) { return jeKoloss[id] ? jeKoloss[id].wegJetzt : 0; }

// ── Spuren ────────────────────────────────────────────────

/**
 * Neuer Spurpunkt: Linienpunkte für die Bahn und — einmalig — vier Radabdrücke in die Dreck-Kacheln.
 * @param {OptikJeKoloss} o
 * @param {{x: number, y: number, h: number}} lage
 * @param {number} d
 */
function spurPunkt(o, lage, d) {
  o.weg += d;
  o.lx = lage.x; o.ly = lage.y;
  // Quer zur FAHRZEUGrichtung (nicht zur Bewegung) → Rutschen wird sichtbar.
  const sin = Math.sin(lage.h), cos = Math.cos(lage.h);
  o.links.push(lage.x + sin * SPUR_MITTE_M, lage.y - cos * SPUR_MITTE_M);
  o.rechts.push(lage.x - sin * SPUR_MITTE_M, lage.y + cos * SPUR_MITTE_M);
  o.mitte.push(lage.x, lage.y);
  if (o.mitte.length > SPUR_MAX * 2) { o.links.splice(0, 2); o.rechts.splice(0, 2); o.mitte.splice(0, 2); }
  for (const a of ABDRUCK) {
    for (const seite of [-1, 1]) {
      const nr = Math.floor(Math.random() * varianten('abdruck') * 2);
      // Gespiegelt (Drehung + π) bei ungerader Nummer → doppelt so viele Varianten.
      stempeln('abdruck', nr, lage.x - sin * seite * a.quer, lage.y + cos * seite * a.quer,
        ABDRUCK_LAENGE_M, a.breite, lage.h + (nr % 2) * Math.PI, 0.85);
    }
  }
}

/**
 * Die gepflügte Bahn und die beiden gepressten Spuren als breite Linien (Radabdrücke liegen
 * schon in den Dreck-Kacheln).
 * @param {CanvasRenderingContext2D} ctx
 */
export function spurenZeichnen(ctx) {
  if (kamera.zoom < 0.3) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  // Zuerst die gepflügte Bahn: Schneewall (hell, ganz breit), darin die festgedrückte Fläche.
  for (const bahn of [
    { breite: BAHN_BREITE_M, farbe: 'rgba(170, 182, 198, 0.20)' },
    { breite: BAHN_BREITE_M - 2.4, farbe: 'rgba(138, 152, 170, 0.20)' },
  ]) {
    ctx.strokeStyle = bahn.farbe;
    ctx.lineWidth = Math.max(2, bahn.breite * kamera.zoom);
    for (const o of jeKoloss) if (o) linieZeichnen(ctx, o.mitte, ctx.lineWidth);
  }
  // Dann je Seite die gepresste Spur.
  ctx.strokeStyle = 'rgba(140, 155, 174, 0.22)';
  ctx.lineWidth = Math.max(1.5, SPUR_BREITE_M * kamera.zoom);
  for (const o of jeKoloss) {
    if (!o) continue;
    for (const liste of [o.links, o.rechts]) linieZeichnen(ctx, liste, ctx.lineWidth);
  }
}

/**
 * Zeichnet nur den sichtbaren Teil einer Spurlinie. WARUM: Eine 4000-Punkte-Linie, die aus der
 * Nähe 300 Pixel breit ist, komplett zu zeichnen, kostet viel — auch wenn fast alles außerhalb
 * liegt (Spieltest M2b: Bildrate). Unsichtbare Abschnitte werden übersprungen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} liste @param {number} breitePx  Strichbreite (für den Sichtrand)
 */
function linieZeichnen(ctx, liste, breitePx) {
  const rand = breitePx + 2;
  ctx.beginPath();
  let offen = false, vorherDrin = false, vx = 0, vy = 0;
  for (let i = 0; i < liste.length; i += 2) {
    const [bx, by] = weltZuBild(liste[i], liste[i + 1]);
    const drin = bx > -rand && by > -rand && bx < kamera.breite + rand && by < kamera.hoehe + rand;
    if (drin || vorherDrin) {
      // Den letzten Punkt vor dem Eintritt mitnehmen, damit die Linie bis zum Rand reicht.
      if (!offen) { ctx.moveTo(i > 0 && !vorherDrin ? vx : bx, i > 0 && !vorherDrin ? vy : by); offen = true; }
      ctx.lineTo(bx, by);
    } else {
      offen = false;
    }
    vorherDrin = drin; vx = bx; vy = by;
  }
  ctx.stroke();
}

// ── Rauchstöße, Funken, Schlacke ──────────────────────────

/**
 * Vier Rauchstöße pro Radumdrehung aus dem Schornstein — dadurch passt das Puffen zum Tempo.
 * (Die weißen Zylinder-Dampfstöße sind seit Spieltest M2b weg.)
 * @param {OptikJeKoloss} o @param {number} weg
 * @param {number} staerke @param {number} druckAnteil
 * @param {[number, number]} schornstein @param {{vx: number, vy: number}} wind
 */
function rauchImTakt(o, weg, staerke, druckAnteil, schornstein, wind) {
  const takt = Math.floor((weg / (Math.PI * TRAKTION_DURCHMESSER_M)) * 4);
  if (takt === o.takt) return;
  o.takt = takt;
  if (staerke <= 0.02) return; // ohne Gas kein Stoß
  rauchStoss(schornstein, staerke, druckAnteil, wind, o.fahrt);
}

/**
 * Funkenflug und schwarze Rußflocken aus dem großen Schornstein: ein steter Strom je nach Last,
 * dazu kommen welche bei jedem Rauchstoß (render/rauch.js rauchStoss).
 * @param {OptikJeKoloss} o @param {[number, number]} schornstein
 * @param {number} staerke @param {number} druckAnteil @param {number} dtMs
 */
function funkenUndFlocken(o, schornstein, staerke, druckAnteil, dtMs) {
  if (staerke >= 0.15) o.funkenRest += (dtMs / 1000) * (staerke - 0.15) * 16;
  o.flockenRest += (dtMs / 1000) * (druckAnteil * 6 + staerke * 40); // Spieltest M2b: dreimal so viele
  const n = Math.floor(o.funkenRest), m = Math.floor(o.flockenRest);
  if (n > 0) { o.funkenRest -= n; funkenWerfen(schornstein, n, o.fahrt); }
  if (m > 0) { o.flockenRest -= m; flockenWerfen(schornstein, m, o.fahrt); }
}

/**
 * Schlacke, Asche und Kohlestaub fallen hinten unter dem Feuerraum in den Schnee — über die ganze
 * Breite, jeder Fleck ein vorgerendertes Häufchen (render/sprites.js).
 * @param {OptikJeKoloss} o @param {{x: number, y: number, h: number}} lage  Rumpfmitte
 * @param {number} staerke @param {number} druckAnteil @param {number} dtMs
 */
function schlackeFallenLassen(o, lage, staerke, druckAnteil, dtMs) {
  o.schlackeRest += (dtMs / 1000) * (druckAnteil * 3 + staerke * 20);
  while (o.schlackeRest >= 1) {
    o.schlackeRest -= 1;
    const [x, y] = rumpfPunkt(lage, -14 - Math.random() * 6.5, (Math.random() - 0.5) * 7.6);
    const w = Math.random();
    if (w < 0.6) schmutzAblegen('schlacke', x, y, 0.5 + Math.random() * 0.8, 0.7 + Math.random() * 0.3);
    else if (w < 0.85) schmutzAblegen('russ', x, y, 0.9 + Math.random() * 1.4, 0.45 + Math.random() * 0.35);
    else schmutzAblegen('asche', x, y, 1.6 + Math.random() * 1.6, 0.6 + Math.random() * 0.4);
  }
}

/** Zahlen fürs Debug. @returns {{spurpunkte: number, russ: number, teilchen: number}} */
export function optikZahlen() {
  return {
    spurpunkte: jeKoloss.reduce((n, o) => n + (o ? o.mitte.length / 2 : 0), 0),
    russ: schmutzAnzahl(),
    teilchen: teilchenAnzahl() + funkenAnzahl(),
  };
}
