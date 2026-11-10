// @ts-check
/**
 * fundstellen.js — Zeichnet Fundstellen und abgeworfene Ware am Boden und findet, was unter der Maus liegt.
 *
 * ZWECK:    Fundstellen liegen im Seed (sim/welt/fundstellen.js), Abwürfe im Zustand (state.abwuerfe,
 *           Spieltest M4a). Beide werden hier auf eine Form gebracht („Marke“) und gezeichnet:
 *             nah   vorgerendertes Bild (render/fundstellen-bilder.js), schrumpft mit dem Rest,
 *                   leere Fundstellen bleiben blass liegen, leere Abwürfe verschwinden
 *             fern  ein kleiner Punkt in der Farbe der Ware
 *           Ladebalken, Ring und Schild darüber zeichnet render/fund-marken.js.
 * LIEST:    Zustand (geborgen, abwuerfe) über die Verbindung, Kamera, fundAnsicht.maus
 * SCHREIBT: fundAnsicht.hover, eigenen Zwischenspeicher (kein Spielzustand)
 * REGEL:    docs/specs/M3-fundstellen.md „Darstellung und Bedienung“
 * DEBUG:    `ek.funde()` listet Fundstellen mit Abstand. Bildchen ansehen: fundBilderAnsehen() in
 *           render/fundstellen-bilder.js.
 */

import { kamera, weltZuBild, bildZuWelt } from './kamera.js';
import { fundBild, PX_JE_M } from './fundstellen-bilder.js';
import { fundstelleInZelle, fundId } from '../sim/welt/fundstellen.js';
import { fundRest, alsMeter } from '../sim/abfragen.js';
import { FUNDARTEN, WAREN, FUND_ZELLE_M } from '../data/fundstellen.js';

/** @typedef {import('../sim/welt/fundstellen.js').Fundstelle} Fundstelle */
/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {import('../sim/types.js').Abwurf} Abwurf */

/**
 * Fundstelle oder Abwurf, auf eine Form gebracht (nur Darstellung).
 * @typedef {Object} Marke
 * @property {number} art      Index in FUNDARTEN (Abwurf: die Fundart seiner Ware)
 * @property {number} x        µm
 * @property {number} y
 * @property {number} radiusM  Größe in der Darstellung
 * @property {number} menge    volle Menge (kg)
 * @property {number} rest     was noch daliegt (kg)
 * @property {number} variante welches Bildchen
 * @property {number} fund     ID der Fundstelle oder −1
 * @property {number} abwurf   ID des Abwurfs oder −1
 * @property {string} name     für das Messingschild
 */

/** Unter diesem Zoom (px/m) wird nichts gezeichnet (ganz weit draußen). */
export const ZOOM_MIN = 0.1;
/** Ist eine Marke kleiner als so viele Bildpunkte (Radius), wird sie als Punkt gezeichnet. */
const PUNKT_UNTER_PX = 10;
/** Höchstens so viele Fundzellen pro Bild neu berechnen (Rest folgt im nächsten Bild). */
const NEU_JE_BILD = 1500;
/** Zwischenspeicher wird geleert, wenn er so groß wird. */
const SPEICHER_MAX = 40000;

/** Maus und Markierung — eingabe/maus.js setzt `maus` und liest `hover`. */
export const fundAnsicht = {
  /** @type {{bx: number, by: number} | null} */ maus: null,
  /** @type {Marke | null} */ hover: null,
  /** Zeitpunkt (performance.now) des letzten abgelehnten Klicks. */ abgelehnt: -1e9,
};

/** @type {Map<number, Fundstelle | null>} */
const speicher = new Map();
let speicherSeed = NaN;

// ── Marken ────────────────────────────────────────────────

/** @param {Zustand} s @param {Fundstelle} f @returns {Marke} */
export function markeVonFund(s, f) {
  const a = FUNDARTEN[f.art];
  return { art: f.art, x: f.x, y: f.y, radiusM: a.radiusM, menge: f.menge, rest: fundRest(s, f), variante: f.variante, fund: f.id, abwurf: -1, name: a.name };
}

/**
 * Abwurf als Marke: so groß, wie viel daliegt (ein voller Haufen dieser Art = volle Größe).
 * @param {Abwurf} a @returns {Marke}
 */
export function markeVonAbwurf(a) {
  const art = Math.max(0, FUNDARTEN.findIndex((f) => f.ware === a.ware));
  const fa = FUNDARTEN[art];
  const anteil = Math.min(1, Math.sqrt(a.kg / (fa.stueckKg * fa.stueckeMax)));
  const ware = WAREN.find((w) => w.ware === a.ware)?.name ?? a.ware;
  return {
    art, x: a.x, y: a.y, radiusM: fa.radiusM * (0.3 + 0.7 * anteil), menge: a.menge, rest: a.kg, variante: a.id * 7,
    fund: -1, abwurf: a.id, name: `${ware} (abgeworfen)`,
  };
}

/**
 * Fundstellen im Bildausschnitt (mit Rand), aus dem Zwischenspeicher.
 * @param {number} seed
 * @returns {Fundstelle[]}
 */
function sichtbare(seed) {
  if (seed !== speicherSeed || speicher.size > SPEICHER_MAX) { speicher.clear(); speicherSeed = seed; }
  const rand = 15 / kamera.zoom + 15; // Bildpunkte + Meter, damit nichts am Rand aufploppt
  const [x0, y0] = bildZuWelt(0, 0), [x1, y1] = bildZuWelt(kamera.breite, kamera.hoehe);
  const z = (/** @type {number} */ m) => Math.floor(m / FUND_ZELLE_M);
  /** @type {Fundstelle[]} */
  const liste = [];
  let neu = 0;
  for (let zy = z(y0 - rand); zy <= z(y1 + rand); zy++) {
    for (let zx = z(x0 - rand); zx <= z(x1 + rand); zx++) {
      const id = fundId(zx, zy);
      let f = speicher.get(id);
      if (f === undefined) {
        if (neu >= NEU_JE_BILD) continue;
        f = fundstelleInZelle(seed, zx, zy);
        speicher.set(id, f);
        neu += 1;
      }
      if (f) liste.push(f);
    }
  }
  return liste;
}

// ── Zeichnen ──────────────────────────────────────────────

/**
 * Fundstellen und Abwürfe am Boden (vor dem Koloss zeichnen). Bestimmt auch, was unter der Maus liegt.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Zustand} s
 */
export function fundstellenZeichnen(ctx, s) {
  fundAnsicht.hover = null;
  if (kamera.zoom < ZOOM_MIN) return;
  /** @type {Marke[]} */
  const marken = sichtbare(s.seed).map((f) => markeVonFund(s, f));
  for (const a of s.abwuerfe) if (a.kg > 0) marken.push(markeVonAbwurf(a));
  const maus = fundAnsicht.maus;
  let besterAbstand = Infinity;
  for (const m of marken) {
    const [bx, by] = weltZuBild(alsMeter(m.x), alsMeter(m.y));
    const rPx = m.radiusM * kamera.zoom;
    if (rPx < PUNKT_UNTER_PX) punkt(ctx, bx, by, m);
    else bild(ctx, m, bx, by);
    if (maus) {
      const d = Math.hypot(maus.bx - bx, maus.by - by);
      if (d <= Math.max(rPx, 12) && d < besterAbstand) { besterAbstand = d; fundAnsicht.hover = m; }
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {Marke} m @param {number} bx @param {number} by
 */
function bild(ctx, m, bx, by) {
  const b = fundBild(m.art, m.variante);
  const uebrig = m.rest / m.menge;
  // Fundstellen schrumpfen mit dem Rest; leer bleiben blasse Reste liegen. Abwürfe sind schon so
  // groß, wie viel daliegt (markeVonAbwurf).
  const leer = uebrig <= 0;
  const skala = m.abwurf >= 0 ? m.radiusM / FUNDARTEN[m.art].radiusM : leer ? 0.55 : 0.45 + 0.55 * Math.sqrt(uebrig);
  const g = (b.width / PX_JE_M) * kamera.zoom * skala;
  ctx.globalAlpha = leer ? 0.3 : 1;
  ctx.drawImage(b, bx - g / 2, by - g / 2, g, g);
  ctx.globalAlpha = 1;
}

/**
 * Fern: kleiner Punkt in der Farbe der Ware (leer: nur ein Ring).
 * @param {CanvasRenderingContext2D} ctx @param {number} bx @param {number} by @param {Marke} m
 */
function punkt(ctx, bx, by, m) {
  const farbe = WAREN.find((w) => w.ware === FUNDARTEN[m.art].ware)?.farbe ?? '#000';
  ctx.beginPath();
  ctx.arc(bx, by, m.abwurf >= 0 ? 3 : 4, 0, Math.PI * 2);
  if (m.rest > 0) { ctx.fillStyle = farbe; ctx.fill(); }
  ctx.strokeStyle = m.rest > 0 ? 'rgba(240, 215, 150, 0.9)' : 'rgba(60, 70, 80, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * kg → „12,5 t“ (Anzeige, deutsch mit Komma).
 * @param {number} kg
 * @returns {string}
 */
export function tonnen(kg) {
  return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
}

/** Nach ek.neu(): Zwischenspeicher und Maus-Markierung vergessen. */
export function fundstellenZuruecksetzen() {
  speicher.clear();
  fundAnsicht.hover = null;
}
