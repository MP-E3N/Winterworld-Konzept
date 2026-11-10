// @ts-check
/**
 * welt.js — Entscheidet, welche Gelände-Kacheln wann berechnet und wie sie gezeichnet werden.
 *
 * ZWECK:    Die Welt ist unbegrenzt. Gezeichnet wird nur, was sichtbar ist, und zwar so fein, wie es
 *           der Zoom verlangt: 9 Stufen von 0,25 m bis 64 m je Kachel-Bildpunkt, jede doppelt so grob
 *           wie die vorige. Ein Kachel-Bildpunkt wird nie größer als SCHAERFE_PX Bildschirmpunkte —
 *           so ist die Karte bei 1 km und bei 2 km gleich scharf (Spieltest M2b).
 * LADEN:    Kein Puzzle mehr: Zuerst wird eine 4× gröbere Grundschicht berechnet (kostet nur 1/16),
 *           damit nie ein Loch bleibt. Fehlt eine scharfe Kachel, steht dort die beste vorhandene
 *           (gröbere Elternkachel oder feinere Kinder), und die scharfe blendet weich darüber ein.
 *           Übrige Rechenzeit füllt einen Vorrat: Rand ringsum (Fahren, Verschieben) und die nächst
 *           gröbere Stufe (Herauszoomen ist dann sofort scharf).
 * LIEST:    Kamera, render/weltkachel.js (berechnet ein Kachelbild)
 * SCHREIBT: eigenen Kachel-Speicher (kein Spielzustand)
 * REGEL:    docs/specs/M2-welt.md „Darstellung“
 * DEBUG:    `ek.kacheln()` zeigt Anzahl, Stufe und Rechenzeit. Baut sich zu langsam auf → BUDGET_MS
 *           erhöhen; zu unscharf → SCHAERFE_PX senken (kostet quadratisch mehr Kacheln).
 */

import { kamera } from './kamera.js';
import { kachelErzeugen, messung, PIXEL } from './weltkachel.js';

/** Meter je Kachel-Bildpunkt, Stufe 0 … 8 (fein → grob, jeweils Faktor 2). */
const STUFEN = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
/**
 * Ein Kachel-Bildpunkt darf höchstens so viele Bildschirmpunkte groß werden.
 * WARUM 1,6: Bei 1 km wirkte 1,2 scharf, bei 2 km 3,7 verwaschen. Mit Faktor-2-Stufen liegt die
 * Vergrößerung jetzt immer zwischen 0,8 und 1,6 (nur ganz nah, unter 0,25 m, weiter hochskaliert).
 */
const SCHAERFE_PX = 1.6;
/** Die Grundschicht ist so viele Stufen gröber (2 = 4× gröber, 1/16 der Rechenzeit). */
const GRUND_ABSTAND = 2;
/** So lange blendet eine neue scharfe Kachel über die gröbere ein (ms). */
const EINBLENDEN_MS = 280;
/** Höchstens so viel Rechenzeit pro Bild für neue Kacheln (ms). Eine Kachel ≈ 2 ms. */
const BUDGET_MS = 6;
/** Höchstens so viele Kacheln behalten (je 16 KB → ~40 MB); verworfen wird die am längsten unbenutzte.
 * WARUM so viele: Ganz weit draußen auf einem großen Bildschirm sind samt Vorrat ~1300 sichtbar. */
const SPEICHER_MAX = 2500;

/** @typedef {{bild: HTMLCanvasElement, seit: number}} Kachel  seit = Erzeugungszeit (ms, performance) */
/** @type {Map<string, Kachel>} */
const kacheln = new Map();
let letzteStufe = 0;

/** @typedef {{tx0: number, ty0: number, tx1: number, ty1: number}} Bereich  Kachelnummern, inklusive */

// ── Zeichnen ──────────────────────────────────────────────

/**
 * Berechnet fehlende Kacheln im Zeitbudget und zeichnet alle sichtbaren.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} seed
 */
export function weltZeichnen(ctx, seed) {
  const k = stufeFuerZoom(kamera.zoom);
  letzteStufe = k;
  const jetzt = performance.now();
  const ende = jetzt + BUDGET_MS;
  const grob = STUFEN.length - 1;
  // Reihenfolge = Wichtigkeit: Grundschicht (nie Löcher) → scharfe Sicht → Vorrat.
  erzeugenBis(seed, Math.min(grob, k + GRUND_ABSTAND), 0, ende);
  erzeugenBis(seed, k, 0, ende);
  erzeugenBis(seed, k, 1, ende);
  if (k < grob) erzeugenBis(seed, k + 1, 1, ende);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const b = bereich(k, 0);
  for (let ty = b.ty0; ty <= b.ty1; ty++) {
    for (let tx = b.tx0; tx <= b.tx1; tx++) kachelZeichnen(ctx, seed, k, tx, ty, jetzt);
  }
}

/**
 * Zeichnet eine Kachel; solange sie fehlt oder noch einblendet, liegt Ersatz darunter.
 * @param {CanvasRenderingContext2D} ctx @param {number} seed
 * @param {number} k  Stufe @param {number} tx @param {number} ty @param {number} jetzt
 */
function kachelZeichnen(ctx, seed, k, tx, ty, jetzt) {
  const eintrag = holen(seed, k, tx, ty);
  const deckung = eintrag ? Math.min(1, (jetzt - eintrag.seit) / EINBLENDEN_MS) : 0;
  if (deckung < 1) ersatzZeichnen(ctx, seed, k, tx, ty);
  if (!eintrag) return;
  const [bx, by, groesse] = zielRechteck(k, tx, ty);
  ctx.globalAlpha = deckung;
  // +0,5 px Überlappung gegen feine Nähte zwischen den Kacheln.
  ctx.drawImage(eintrag.bild, bx, by, groesse + 0.5, groesse + 0.5);
  ctx.globalAlpha = 1;
}

/**
 * Bester Ersatz für eine fehlende Kachel: der passende Ausschnitt der nächsten vorhandenen
 * gröberen Kachel, darüber die schon vorhandenen feineren Kinder (nach dem Herauszoomen).
 * @param {CanvasRenderingContext2D} ctx @param {number} seed
 * @param {number} k @param {number} tx @param {number} ty
 */
function ersatzZeichnen(ctx, seed, k, tx, ty) {
  const [bx, by, groesse] = zielRechteck(k, tx, ty);
  for (let e = k + 1; e < STUFEN.length; e++) {
    const f = 2 ** (e - k);
    const px = Math.floor(tx / f), py = Math.floor(ty / f);
    const eltern = holen(seed, e, px, py);
    if (!eltern) continue;
    const teil = PIXEL / f;
    ctx.drawImage(eltern.bild, (tx - px * f) * teil, (ty - py * f) * teil, teil, teil, bx, by, groesse + 0.5, groesse + 0.5);
    break;
  }
  if (k === 0) return;
  const halb = groesse / 2;
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const kind = holen(seed, k - 1, tx * 2 + dx, ty * 2 + dy);
      if (kind) ctx.drawImage(kind.bild, bx + dx * halb, by + dy * halb, halb + 0.5, halb + 0.5);
    }
  }
}

// ── Berechnen ─────────────────────────────────────────────

/**
 * Berechnet fehlende Kacheln einer Stufe von der Bildmitte nach außen, bis die Zeit um ist.
 * @param {number} seed @param {number} k  Stufe
 * @param {number} rand  zusätzliche Kachelreihen ringsum (Vorrat)
 * @param {number} ende  performance-Zeit, bis zu der gerechnet werden darf
 */
function erzeugenBis(seed, k, rand, ende) {
  if (performance.now() >= ende) return;
  const b = bereich(k, rand);
  /** @type {[number, number][]} */
  const fehlend = [];
  for (let ty = b.ty0; ty <= b.ty1; ty++) {
    for (let tx = b.tx0; tx <= b.tx1; tx++) if (!kacheln.has(schluessel(seed, k, tx, ty))) fehlend.push([tx, ty]);
  }
  const mx = (b.tx0 + b.tx1) / 2, my = (b.ty0 + b.ty1) / 2;
  fehlend.sort((a, c) => Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(c[0] - mx, c[1] - my));
  for (const [tx, ty] of fehlend) {
    if (performance.now() >= ende) return;
    merken(schluessel(seed, k, tx, ty), { bild: kachelErzeugen(seed, STUFEN[k], tx, ty), seit: performance.now() });
  }
}

// ── Hilfen ────────────────────────────────────────────────

/**
 * Gröbste Stufe, deren Bildpunkt höchstens SCHAERFE_PX Bildschirmpunkte groß wird.
 * @param {number} zoom  Bildpunkte pro Meter @returns {number}
 */
function stufeFuerZoom(zoom) {
  for (let k = STUFEN.length - 1; k >= 0; k--) if (STUFEN[k] * zoom <= SCHAERFE_PX) return k;
  return 0;
}

/**
 * Sichtbare Kacheln einer Stufe, auf Wunsch mit Rand.
 * @param {number} k @param {number} rand @returns {Bereich}
 */
function bereich(k, rand) {
  const kachelM = PIXEL * STUFEN[k];
  const links = kamera.x - kamera.breite / 2 / kamera.zoom, oben = kamera.y - kamera.hoehe / 2 / kamera.zoom;
  return {
    tx0: Math.floor(links / kachelM) - rand,
    ty0: Math.floor(oben / kachelM) - rand,
    tx1: Math.floor((links + kamera.breite / kamera.zoom) / kachelM) + rand,
    ty1: Math.floor((oben + kamera.hoehe / kamera.zoom) / kachelM) + rand,
  };
}

/**
 * Lage und Größe einer Kachel auf dem Bildschirm (CSS-Pixel).
 * @param {number} k @param {number} tx @param {number} ty @returns {[number, number, number]}
 */
function zielRechteck(k, tx, ty) {
  const kachelM = PIXEL * STUFEN[k];
  return [
    (tx * kachelM - kamera.x) * kamera.zoom + kamera.breite / 2,
    (ty * kachelM - kamera.y) * kamera.zoom + kamera.hoehe / 2,
    kachelM * kamera.zoom,
  ];
}

/** @param {number} seed @param {number} k @param {number} tx @param {number} ty */
function schluessel(seed, k, tx, ty) { return `${seed},${k},${tx},${ty}`; }

/**
 * Holt eine Kachel und markiert sie als frisch benutzt.
 * WARUM: Die Map behält die Einfügereihenfolge — wer benutzt wird, wandert ans Ende und wird
 * zuletzt verworfen (die Grundschicht bleibt so immer erhalten).
 * @param {number} seed @param {number} k @param {number} tx @param {number} ty
 * @returns {Kachel | undefined}
 */
function holen(seed, k, tx, ty) {
  const s = schluessel(seed, k, tx, ty);
  const e = kacheln.get(s);
  if (e) { kacheln.delete(s); kacheln.set(s, e); }
  return e;
}

/** @param {string} s @param {Kachel} kachel */
function merken(s, kachel) {
  if (kacheln.size >= SPEICHER_MAX) {
    // Das am längsten unbenutzte Viertel verwerfen.
    let n = SPEICHER_MAX / 4;
    for (const alt of kacheln.keys()) { kacheln.delete(alt); if (--n <= 0) break; }
  }
  kacheln.set(s, kachel);
}

/** @returns {{kacheln: number, stufeM: number, erzeugt: number, msLetzte: number}} */
export function kachelZahlen() {
  return { kacheln: kacheln.size, stufeM: STUFEN[letzteStufe], erzeugt: messung.erzeugt,
    msLetzte: Number(messung.msLetzte.toFixed(2)) };
}

/** Alle Kacheln verwerfen (neue Welt). */
export function weltZuruecksetzen() { kacheln.clear(); }
