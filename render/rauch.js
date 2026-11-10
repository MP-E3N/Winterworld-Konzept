// @ts-check
/**
 * rauch.js — Rauch aus den Schornsteinen (Funken und Rußflocken: render/funken.js).
 *
 * ZWECK:    Man soll sehen, wie hart der Kessel arbeitet: mehr Druck → dichter, dunkler, größerer
 *           Rauch, Rauchstöße im Takt der Räder. Weiße Dampfeffekte gibt es in der Welt nicht mehr
 *           (Spieltest M2b) — nur noch an der kleinen Dampfmaschine in der Anzeige. Rauch treibt mit dem Wind
 *           und lässt unterwegs Ruß auf den Schnee fallen (render/spuren.js).
 * LIEST:    Lage, Stärke, Wind (m/s)
 * SCHREIBT: eigene Teilchenliste (kein Spielzustand)
 * REGEL:    KONZEPT.md §6
 * DEBUG:    `ek.optik()` zeigt die Anzahl Teilchen. Zu viele → TEILCHEN_MAX senken.
 * LEISTUNG: Rauch wird in eine eigene Ebene mit HALBER Auflösung gemalt und dann
 *           hochskaliert (Spieltest M2b: Bildrate). Weiche Wolken sehen dabei gleich aus, aber es
 *           sind nur ein Viertel der Pixel — große, überlappende Kreise waren der teuerste Teil.
 */

import { kamera, weltZuBild } from './kamera.js';
import { funkenWerfen, flockenWerfen } from './funken.js';

const TEILCHEN_MAX = 1200;
/** Auflösung der Rauch-Ebene im Verhältnis zum Bildschirm. */
const RAUCH_AUFLOESUNG = 0.5;
/** Mehr Rauch insgesamt (Spieltest M2b: „Rauchentwicklung erhöhen“). */
const RAUCH_MENGE = 1.35;

/**
 * @typedef {Object} Teilchen
 * @property {'rauch'} art
 * @property {number} x @property {number} y   Meter
 * @property {number} vx @property {number} vy  m/s
 * @property {number} alter @property {number} dauer  ms
 * @property {number} groesse  Startradius (m)
 * @property {number} wachsen  Radius-Zuwachs über die Lebenszeit (m)
 * @property {number} dunkel   0 … 1 (nur Rauch)
 * @property {number} russ     Chance, beim Absinken Ruß abzulegen (0 … 1); −1 = schon geprüft
 * @property {number} russAb   bei welchem Anteil der Lebenszeit der Ruß absinkt (0,2 … 0,95)
 * @property {number} phase    eigener Takt der Verwirbelung (Bogenmaß)
 */

/**
 * Verwirbelung und Böen (Spieltest M2b, Bild 2): Vorher sank jeder Ruß zur gleichen Zeit ab und trieb
 * genau mit dem Wind → ein gleichmäßiges, paralleles Band. Jetzt schlingert jede Wolke (WIRBEL_MS),
 * sinkt zu einer eigenen Zeit ab, und Böen lassen mal viel, mal fast nichts fallen.
 */
const WIRBEL_MS = 3.2;
/** Laufende Zeit für die Böen (ms, nur Optik). */
let boeenZeit = 0;

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
 * @param {number} [skala=1]  kleine Schornsteine: weniger und kleinere Wolken (Spieltest M2b)
 */
export function rauchAusstossen(merker, pos, staerke, druckAnteil, wind, dtMs, skala = 1) {
  // Spieltest 2: schon auf Stufe 1–2 viel Rauch (Grundmenge hängt am Druck).
  // Spieltest 3: wieder dunkel wie zuvor. Dazu kommen Rauchstöße im Radtakt (rauchStoss).
  if (druckAnteil <= 0 && staerke <= 0) {
    merker.rest += (dtMs / 1000) * skala; // ruhender Kessel: ein dünner Faden (1 Wölkchen/s)
  } else {
    merker.rest += (dtMs / 1000) * (8 + druckAnteil * 10 + staerke * 14) * skala * RAUCH_MENGE;
  }
  while (merker.rest >= 1) {
    merker.rest -= 1;
    rauchTeilchen(pos, staerke, druckAnteil, wind, 2, skala);
  }
}

/**
 * Ein Rauchstoß aus dem Schornstein — kommt im Takt der Kolben (vier pro Radumdrehung).
 * WARUM: So passt der Rauch zum Tempo: langsam = gemächliches Puffen, schnell = dichtes Stakkato.
 * @param {[number, number]} pos
 * @param {number} staerke @param {number} druckAnteil
 * @param {{vx: number, vy: number}} wind
 * @param {{vx: number, vy: number}} fahrt  Tempo des Kolosses (m/s) — Funken und Flocken erben es
 */
export function rauchStoss(pos, staerke, druckAnteil, wind, fahrt) {
  const anzahl = 3 + Math.round(staerke * 5);
  for (let i = 0; i < anzahl; i++) rauchTeilchen(pos, staerke, druckAnteil, wind, 5);
  // Jeder kräftige Stoß reißt glühende Brocken und Rußflocken mit (wie bei echten Dampfloks).
  if (staerke > 0.3) funkenWerfen(pos, Math.floor(Math.random() * (1 + staerke * 3)), fahrt);
  flockenWerfen(pos, 2 + Math.floor(Math.random() * (1 + staerke * 10)), fahrt);
}

/**
 * @param {[number, number]} pos
 * @param {number} staerke @param {number} druckAnteil
 * @param {{vx: number, vy: number}} wind
 * @param {number} wurf  Anfangstempo in zufälliger Richtung (m/s); Stöße werfen weiter
 * @param {number} [skala=1]  Größe (kleine Schornsteine < 1)
 */
function rauchTeilchen(pos, staerke, druckAnteil, wind, wurf, skala = 1) {
  if (teilchen.length >= TEILCHEN_MAX) return;
  teilchen.push({
    art: 'rauch',
    x: pos[0] + (Math.random() - 0.5) * 1.2, y: pos[1] + (Math.random() - 0.5) * 1.2,
    vx: wind.vx * 0.3 + (Math.random() - 0.5) * wurf, vy: wind.vy * 0.3 + (Math.random() - 0.5) * wurf,
    alter: 0, dauer: 3500 + Math.random() * 2000 + druckAnteil * 2000 + staerke * 2500,
    groesse: (0.9 + druckAnteil * 0.6 + staerke * 0.8) * skala, wachsen: (4 + druckAnteil * 2 + staerke * 5) * skala,
    dunkel: Math.min(1, 0.55 + druckAnteil * 0.25 + staerke * 0.3), russ: 0.04 + staerke * 0.2,
    russAb: 0.2 + Math.random() * 0.75, phase: Math.random() * Math.PI * 2,
  });
}

/**
 * Bewegt alle Teilchen. Rauch gleicht sich langsam dem Wind an und schlingert.
 * @param {{vx: number, vy: number}} wind
 * @param {number} dtMs
 * @param {(x: number, y: number, r: number, deckkraft: number) => void} russAblegen  legt EIN Bildchen ab
 */
export function rauchBewegen(wind, dtMs, russAblegen) {
  const s = dtMs / 1000;
  const anpassung = 1 - Math.exp(-s * 0.9);
  boeenZeit += dtMs;
  // Böe 0 … ~1,6: zwei langsame, unterschiedlich lange Wellen → unregelmäßige Abschnitte.
  const boee = Math.max(0, 0.55 + 0.6 * Math.sin(boeenZeit / 3700) * Math.sin(boeenZeit / 8300 + 1.3)
    + 0.35 * Math.sin(boeenZeit / 1900 + 2.1));
  for (let i = teilchen.length - 1; i >= 0; i--) {
    const t = teilchen[i];
    t.alter += dtMs;
    if (t.alter >= t.dauer) { teilchen.splice(i, 1); continue; }
    // Rauch schlingert: jede Wolke mit eigenem Takt quer und längs zum Wind.
    const wx = WIRBEL_MS * Math.sin(t.alter / 650 + t.phase);
    const wy = WIRBEL_MS * Math.cos(t.alter / 830 + t.phase * 1.7);
    const zielVx = wind.vx * (0.7 + 0.3 * boee) + wx;
    const zielVy = wind.vy * (0.7 + 0.3 * boee) + wy;
    t.vx += (zielVx - t.vx) * anpassung;
    t.vy += (zielVy - t.vy) * anpassung;
    t.x += t.vx * s; t.y += t.vy * s;
    // Zu einer eigenen Zeit sinkt Ruß aus der Wolke ab — einmal pro Teilchen würfeln, je nach Böe
    // mehr oder weniger. Abgelegt wird ein Rußbildchen (render/sprites.js: verstreute Körnchen).
    if (t.russ >= 0 && t.alter > t.dauer * t.russAb) {
      if (Math.random() < t.russ * boee * 0.6) {
        // Spieltest M2b: großflächige Rußfelder statt vieler kleiner Häufchen (render/sprites.js).
        const radius = (t.groesse + t.wachsen * t.russAb * 0.6) * (1.3 + Math.random() * 1.1);
        russAblegen(t.x, t.y, radius, (0.35 + t.dunkel * 0.5) * (0.6 + Math.random() * 0.5));
      }
      t.russ = -1;
    }
  }
}

/** Eigene Ebene in halber Auflösung (siehe LEISTUNG im Dateikopf). */
let ebene = /** @type {HTMLCanvasElement | null} */ (null);

/**
 * Malt den Rauch in die halbe Auflösung und legt das Ergebnis über das Bild.
 * @param {CanvasRenderingContext2D} ctx
 */
export function rauchZeichnen(ctx) {
  if (kamera.zoom < 0.3 || teilchen.length === 0) return;
  if (!ebene) ebene = document.createElement('canvas');
  const w = Math.ceil(kamera.breite * RAUCH_AUFLOESUNG), h = Math.ceil(kamera.hoehe * RAUCH_AUFLOESUNG);
  if (ebene.width !== w || ebene.height !== h) { ebene.width = w; ebene.height = h; }
  const e = /** @type {CanvasRenderingContext2D} */ (ebene.getContext('2d'));
  e.setTransform(1, 0, 0, 1, 0, 0);
  e.clearRect(0, 0, w, h);
  e.setTransform(RAUCH_AUFLOESUNG, 0, 0, RAUCH_AUFLOESUNG, 0, 0);
  for (const t of teilchen) {
    const f = t.alter / t.dauer;
    const [bx, by] = weltZuBild(t.x, t.y);
    const radius = (t.groesse + f * t.wachsen) * kamera.zoom;
    if (bx < -radius || by < -radius || bx > kamera.breite + radius || by > kamera.hoehe + radius) continue;
    const einblenden = Math.min(1, f * 10);
    // Kohlenrauch: frisch fast schwarz, wird mit dem Alter heller und dünner. Spieltest 3+4:
    // „noch dunkler und mehr“ → dunkler Grundton, kräftigere Deckkraft.
    const grau = Math.round(22 + (1 - t.dunkel) * 60 + f * 95);
    e.fillStyle = `rgba(${grau}, ${grau}, ${grau + 3}, ${einblenden * (1 - f) * (0.12 + t.dunkel * 0.16)})`;
    e.beginPath(); e.arc(bx, by, radius, 0, Math.PI * 2); e.fill();
  }
  ctx.drawImage(ebene, 0, 0, kamera.breite, kamera.hoehe);
}

/** @returns {number} */
export function teilchenAnzahl() { return teilchen.length; }

/** Löscht alles (neue Welt). */
export function rauchZuruecksetzen() { teilchen.length = 0; }
