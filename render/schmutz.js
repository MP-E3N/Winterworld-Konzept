// @ts-check
/**
 * schmutz.js — Ruß, Schlacke, Asche und Radabdrücke, eingebrannt in Welt-Kacheln.
 *
 * ZWECK:    Spieltest M2b: In dichten Rußfeldern fiel die Bildrate auf ~16/s — tausende große,
 *           halbdurchsichtige Bildchen wurden JEDES Bild neu gemalt. Jetzt wird jedes Bildchen nur
 *           EINMAL beim Ablegen in eine Kachel (32 × 32 m) gemalt. Pro Bild werden nur die sichtbaren
 *           Kacheln gezeichnet (nah ~12, weit weg höchstens so viele, wie es gibt) — egal wie viel Dreck.
 * VERBLASSEN: Jede Kachel wird alle VERBLASSEN_ALLE_MS (Spielzeit) etwas ausradiert; nach einigen
 *           Minuten ist der Dreck weg. Kacheln ohne neuen Dreck verschwinden nach WEG_NACH_MS.
 * LIEST:    Kamera, render/sprites.js (Bildchen aus dem Atlas)
 * SCHREIBT: eigene Kachel-Leinwände (kein Spielzustand; geht bei Neustart verloren)
 * REGEL:    KONZEPT.md §6, docs/ENTSCHEIDUNGEN.md E-013
 * DEBUG:    `ek.optik().russ` = Anzahl Kacheln. Zu unscharf aus der Nähe → PX_PRO_M erhöhen
 *           (kostet quadratisch Speicher: 8 px/m = 256 KB je Kachel).
 */

import { kamera, weltZuBild } from './kamera.js';
import { sprite, varianten } from './sprites.js';

/** Kachelkante (m) und Auflösung (Pixel je Meter). */
const KACHEL_M = 32, PX_PRO_M = 8;
const KACHEL_PX = KACHEL_M * PX_PRO_M;
/** Höchstens so viele Kacheln (≈ 40 MB); die am längsten nicht beschmutzte fällt zuerst weg. */
const KACHELN_MAX = 160;
/** Alle so viel ms Spielzeit wird eine Kachel um VERBLASSEN_ANTEIL ausradiert (≈ 9 % nach 4 min). */
const VERBLASSEN_ALLE_MS = 20000, VERBLASSEN_ANTEIL = 0.18;
/** Ohne neuen Dreck verschwindet eine Kachel nach so viel Spielzeit (ms). */
const WEG_NACH_MS = 6 * 60 * 1000;
/** Höchstens so viele Kacheln pro Bild ausradieren (verteilt die Arbeit, kein Ruckler). */
const VERBLASSEN_PRO_BILD = 3;

/** @typedef {'russ' | 'russfeld' | 'schlacke' | 'asche' | 'abdruck'} Art */
/**
 * @typedef {Object} Kachel
 * @property {HTMLCanvasElement} bild @property {CanvasRenderingContext2D} ctx
 * @property {number} zuletzt  Spielzeit des letzten Stempels (ms)
 * @property {number} faellig  Spielzeit, ab der sie wieder verblasst (ms)
 */

/** @type {Map<string, Kachel>} */
const kacheln = new Map();
/** Laufende Spielzeit der Darstellung (ms; steht bei Pause). */
let zeit = 0;

/**
 * Legt einen Fleck ab (zufällige Variante, ungedreht — die Varianten sind ohnehin verschieden).
 * @param {Art} art @param {number} x @param {number} y  Weltmeter
 * @param {number} r  Radius (m) @param {number} a  Deckkraft 0 … 1
 */
export function schmutzAblegen(art, x, y, r, a) {
  stempeln(art, Math.floor(Math.random() * varianten(art)), x, y, r * 2, r * 2, 0, a);
}

/**
 * Malt ein Bildchen einmalig in alle Kacheln, die es berührt.
 * @param {Art} art @param {number} nr  Variante
 * @param {number} x @param {number} y  Mitte (Weltmeter)
 * @param {number} laenge @param {number} breite  Größe (m; laenge entlang des Winkels)
 * @param {number} winkel  Bogenmaß @param {number} a  Deckkraft 0 … 1
 */
export function stempeln(art, nr, x, y, laenge, breite, winkel, a) {
  const aus = sprite(art, nr);
  const rand = Math.max(laenge, breite) * 0.75;
  const tx0 = Math.floor((x - rand) / KACHEL_M), tx1 = Math.floor((x + rand) / KACHEL_M);
  const ty0 = Math.floor((y - rand) / KACHEL_M), ty1 = Math.floor((y + rand) / KACHEL_M);
  const c = Math.cos(winkel), s = Math.sin(winkel);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const k = kachelHolen(tx, ty);
      const lx = (x - tx * KACHEL_M) * PX_PRO_M, ly = (y - ty * KACHEL_M) * PX_PRO_M;
      k.ctx.setTransform(c, s, -s, c, lx, ly);
      k.ctx.globalAlpha = Math.min(1, a);
      k.ctx.drawImage(aus.bild, aus.sx, aus.sy, aus.g, aus.g,
        -laenge * PX_PRO_M / 2, -breite * PX_PRO_M / 2, laenge * PX_PRO_M, breite * PX_PRO_M);
      k.zuletzt = zeit;
    }
  }
}

/**
 * Kachel holen oder neu anlegen (bei Bedarf die am längsten unbenutzte verwerfen).
 * @param {number} tx @param {number} ty @returns {Kachel}
 */
function kachelHolen(tx, ty) {
  const schluessel = tx + ',' + ty;
  let k = kacheln.get(schluessel);
  if (k) return k;
  if (kacheln.size >= KACHELN_MAX) {
    let aeltester = '', min = Infinity;
    for (const [s, kk] of kacheln) if (kk.zuletzt < min) { min = kk.zuletzt; aeltester = s; }
    kacheln.delete(aeltester);
  }
  const bild = document.createElement('canvas');
  bild.width = bild.height = KACHEL_PX;
  const ctx = /** @type {CanvasRenderingContext2D} */ (bild.getContext('2d'));
  k = { bild, ctx, zuletzt: zeit, faellig: zeit + VERBLASSEN_ALLE_MS };
  kacheln.set(schluessel, k);
  return k;
}

/**
 * Lässt den Dreck verblassen: wenige fällige Kacheln pro Bild etwas ausradieren, alte entfernen.
 * @param {number} dtMs  Spielzeit (0 bei Pause)
 */
export function schmutzAltern(dtMs) {
  zeit += dtMs;
  let erledigt = 0;
  for (const [s, k] of kacheln) {
    if (zeit - k.zuletzt > WEG_NACH_MS) { kacheln.delete(s); continue; }
    if (erledigt >= VERBLASSEN_PRO_BILD || zeit < k.faellig) continue;
    k.ctx.setTransform(1, 0, 0, 1, 0, 0);
    k.ctx.globalAlpha = 1;
    k.ctx.globalCompositeOperation = 'destination-out';
    k.ctx.fillStyle = `rgba(0, 0, 0, ${VERBLASSEN_ANTEIL})`;
    k.ctx.fillRect(0, 0, KACHEL_PX, KACHEL_PX);
    k.ctx.globalCompositeOperation = 'source-over';
    k.faellig = zeit + VERBLASSEN_ALLE_MS;
    erledigt++;
  }
}

/**
 * Zeichnet die sichtbaren Kacheln.
 * @param {CanvasRenderingContext2D} ctx
 */
export function schmutzZeichnen(ctx) {
  if (kamera.zoom < 0.3 || kacheln.size === 0) return;
  const links = kamera.x - kamera.breite / 2 / kamera.zoom, oben = kamera.y - kamera.hoehe / 2 / kamera.zoom;
  const tx0 = Math.floor(links / KACHEL_M), ty0 = Math.floor(oben / KACHEL_M);
  const tx1 = Math.floor((links + kamera.breite / kamera.zoom) / KACHEL_M);
  const ty1 = Math.floor((oben + kamera.hoehe / kamera.zoom) / KACHEL_M);
  const groesse = KACHEL_M * kamera.zoom;
  // WARUM so herum: Weit weg sind viele Kacheln im Bild, aber nur wenige existieren.
  const viele = (tx1 - tx0 + 1) * (ty1 - ty0 + 1) > kacheln.size;
  /** @param {number} tx @param {number} ty @param {Kachel} k */
  const malen = (tx, ty, k) => {
    const [bx, by] = weltZuBild(tx * KACHEL_M, ty * KACHEL_M);
    // +0,5 px gegen feine Nähte zwischen den Kacheln.
    ctx.drawImage(k.bild, bx, by, groesse + 0.5, groesse + 0.5);
  };
  if (viele) {
    for (const [s, k] of kacheln) {
      const [tx, ty] = s.split(',').map(Number);
      if (tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1) malen(tx, ty, k);
    }
  } else {
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) { const k = kacheln.get(tx + ',' + ty); if (k) malen(tx, ty, k); }
    }
  }
}

/** @returns {number} Anzahl Kacheln mit Dreck */
export function schmutzAnzahl() { return kacheln.size; }

/** Alles löschen (neue Welt). */
export function schmutzZuruecksetzen() { kacheln.clear(); zeit = 0; }
