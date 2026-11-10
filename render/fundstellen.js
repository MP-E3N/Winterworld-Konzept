// @ts-check
/**
 * fundstellen.js — Zeichnet Fundstellen, den Ladebalken beim Bergen und die Markierung unter der Maus.
 *
 * ZWECK:    Fundstellen liegen im Seed (sim/welt/fundstellen.js). Hier wird nur berechnet, welche
 *           gerade sichtbar sind (mit Zwischenspeicher je Fundzelle), und gezeichnet:
 *             nah   vorgerendertes Bild (render/fundstellen-bilder.js), schrumpft mit dem Rest,
 *                   leere Fundstellen bleiben blass liegen
 *             fern  ein kleiner Punkt in der Farbe der Ware
 *           Darüber (nach der Dunkelheit, damit man es auch nachts sieht): Messing-Ladebalken bei
 *           arbeitenden Trupps, Ring + Messingschild unter der Maus, Reichweitenkreis des Kolosses.
 * LIEST:    Zustand (geborgen, trupps) über die Verbindung, Kamera, fundAnsicht.maus
 * SCHREIBT: fundAnsicht.hover, eigenen Zwischenspeicher (kein Spielzustand)
 * REGEL:    docs/specs/M3-fundstellen.md „Darstellung und Bedienung“; keine Warntexte — ob Bergen geht,
 *           zeigt die Farbe des Rings (Messing = ja, grau gestrichelt = nein, kurz rot = abgelehnt).
 * DEBUG:    `ek.funde()` listet sie mit Abstand. Bildchen ansehen: fundBilderAnsehen() in
 *           render/fundstellen-bilder.js.
 */

import { kamera, weltZuBild, bildZuWelt } from './kamera.js';
import { fundBild, PX_JE_M } from './fundstellen-bilder.js';
import { fundstelleInZelle, fundstelleMitId, fundId } from '../sim/welt/fundstellen.js';
import { fundRest, kolossVon, truppVon, alsMeter } from '../sim/abfragen.js';
import { befehlPruefen } from '../sim/befehle.js';
import { FUNDARTEN, WAREN, FUND_ZELLE_M, BERGEN_REICHWEITE_M } from '../data/fundstellen.js';

/** @typedef {import('../sim/welt/fundstellen.js').Fundstelle} Fundstelle */
/** @typedef {import('../sim/types.js').Zustand} Zustand */

/** Unter diesem Zoom (px/m) werden keine Fundstellen gezeichnet (ganz weit draußen). */
const ZOOM_MIN = 0.1;
/** Ist eine Fundstelle kleiner als so viele Bildpunkte (Radius), wird sie als Punkt gezeichnet. */
const PUNKT_UNTER_PX = 10;
/** Höchstens so viele Fundzellen pro Bild neu berechnen (Rest folgt im nächsten Bild). */
const NEU_JE_BILD = 1500;
/** Zwischenspeicher wird geleert, wenn er so groß wird. */
const SPEICHER_MAX = 40000;
/** So lange leuchtet der Ring rot, wenn ein Klick abgelehnt wurde (ms). */
const ABGELEHNT_MS = 450;

/** Maus und Markierung — eingabe/maus.js setzt `maus` und liest `hover`. */
export const fundAnsicht = {
  /** @type {{bx: number, by: number} | null} */ maus: null,
  /** @type {Fundstelle | null} */ hover: null,
  /** Zeitpunkt (performance.now) des letzten abgelehnten Klicks. */ abgelehnt: -1e9,
};

/** @type {Map<number, Fundstelle | null>} */
const speicher = new Map();
let speicherSeed = NaN;

// ── Sichtbare Fundstellen ─────────────────────────────────

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

/** @param {Zustand} s @param {Fundstelle} f @returns {number} 0 … 1 */
function anteilUebrig(s, f) {
  return fundRest(s, f) / f.menge;
}

// ── Zeichnen ──────────────────────────────────────────────

/**
 * Fundstellen am Boden (vor dem Koloss zeichnen). Bestimmt auch, was unter der Maus liegt.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Zustand} s
 */
export function fundstellenZeichnen(ctx, s) {
  fundAnsicht.hover = null;
  if (kamera.zoom < ZOOM_MIN) return;
  const maus = fundAnsicht.maus;
  let besterAbstand = Infinity;
  for (const f of sichtbare(s.seed)) {
    const art = FUNDARTEN[f.art];
    const [bx, by] = weltZuBild(alsMeter(f.x), alsMeter(f.y));
    const rPx = art.radiusM * kamera.zoom;
    const uebrig = anteilUebrig(s, f);
    if (rPx < PUNKT_UNTER_PX) punkt(ctx, bx, by, f.art, uebrig);
    else bild(ctx, f, bx, by, uebrig);
    if (maus) {
      const d = Math.hypot(maus.bx - bx, maus.by - by);
      if (d <= Math.max(rPx, 12) && d < besterAbstand) { besterAbstand = d; fundAnsicht.hover = f; }
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {Fundstelle} f
 * @param {number} bx @param {number} by @param {number} uebrig  0 … 1
 */
function bild(ctx, f, bx, by, uebrig) {
  const b = fundBild(f.art, f.variante);
  // Mit dem Rest schrumpfen; leer bleiben blasse Reste liegen (man sieht, wo man schon war).
  const leer = uebrig <= 0;
  const skala = leer ? 0.55 : 0.45 + 0.55 * Math.sqrt(uebrig);
  const g = (b.width / PX_JE_M) * kamera.zoom * skala;
  ctx.globalAlpha = leer ? 0.3 : 1;
  ctx.drawImage(b, bx - g / 2, by - g / 2, g, g);
  ctx.globalAlpha = 1;
}

/**
 * Fern: kleiner Punkt in der Farbe der Ware (leer: nur ein Ring).
 * @param {CanvasRenderingContext2D} ctx @param {number} bx @param {number} by @param {number} art @param {number} uebrig
 */
function punkt(ctx, bx, by, art, uebrig) {
  const farbe = WAREN.find((w) => w.ware === FUNDARTEN[art].ware)?.farbe ?? '#000';
  ctx.beginPath();
  ctx.arc(bx, by, 4, 0, Math.PI * 2);
  if (uebrig > 0) { ctx.fillStyle = farbe; ctx.fill(); }
  ctx.strokeStyle = uebrig > 0 ? 'rgba(240, 215, 150, 0.9)' : 'rgba(60, 70, 80, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * Was über allem liegt: Ladebalken der arbeitenden Trupps und die Markierung unter der Maus.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Zustand} s
 * @param {number} spieler  eigene Spielernummer (verbindung.spieler)
 * @param {{x: number, y: number} | null} rumpf  eigene Rumpfmitte (Meter, überblendet) oder null
 */
export function fundMarkenZeichnen(ctx, s, spieler, rumpf) {
  if (kamera.zoom < ZOOM_MIN) return;
  for (const t of s.trupps) {
    const f = t.fund >= 0 ? fundstelleMitId(s.seed, t.fund) : null;
    if (f) ladebalken(ctx, s, f, t.fortschritt / FUNDARTEN[f.art].arbeit);
  }
  const f = fundAnsicht.hover;
  const k = kolossVon(s, spieler);
  if (!f || !k) return;
  const arbeitetHier = truppVon(s, k).fund === f.id;
  const moeglich = arbeitetHier || befehlPruefen(s, { art: 'BERGEN_START', spieler, fund: f.id }) === null;
  const rot = performance.now() - fundAnsicht.abgelehnt < ABGELEHNT_MS;
  if (rumpf) reichweite(ctx, rumpf);
  ring(ctx, f, rot ? '#c2452d' : moeglich ? '#e7bd62' : 'rgba(205, 214, 222, 0.85)', moeglich && !rot ? [] : [5, 4]);
  const rest = fundRest(s, f);
  schild(ctx, f, rest > 0 ? `${FUNDARTEN[f.art].name} · ${tonnen(rest)}` : `${FUNDARTEN[f.art].name} · leer`);
}

/**
 * Messing-Ladebalken über der Fundstelle: oben der geborgene Anteil, darunter das aktuelle Stück.
 * @param {CanvasRenderingContext2D} ctx @param {Zustand} s @param {Fundstelle} f @param {number} stueck  0 … 1
 */
function ladebalken(ctx, s, f, stueck) {
  const [bx, by] = weltZuBild(alsMeter(f.x), alsMeter(f.y));
  const b = 54, h = 10, x = Math.round(bx - b / 2), y = Math.round(by - Math.max(FUNDARTEN[f.art].radiusM * kamera.zoom, 6) - 22);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f0d48e'); g.addColorStop(0.6, '#c08f3e'); g.addColorStop(1, '#7d5523');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 1, y + 2, b, h + 4);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, b, h + 4);
  ctx.fillStyle = '#16191c';
  ctx.fillRect(x + 2, y + 2, b - 4, h - 4);
  ctx.fillStyle = '#e8a54a'; // Glut-Bernstein: geborgener Anteil
  ctx.fillRect(x + 2, y + 2, (b - 4) * (1 - anteilUebrig(s, f)), h - 4);
  ctx.fillStyle = '#16191c';
  ctx.fillRect(x + 2, y + h, b - 4, 2);
  ctx.fillStyle = '#b5703a'; // Kupferleiste: das Stück, an dem der Trupp gerade arbeitet
  ctx.fillRect(x + 2, y + h, (b - 4) * Math.min(1, stueck), 2);
}

/** @param {CanvasRenderingContext2D} ctx @param {Fundstelle} f @param {string} farbe @param {number[]} strich */
function ring(ctx, f, farbe, strich) {
  const [bx, by] = weltZuBild(alsMeter(f.x), alsMeter(f.y));
  ctx.beginPath();
  ctx.arc(bx, by, Math.max(FUNDARTEN[f.art].radiusM * kamera.zoom, 6) + 5, 0, Math.PI * 2);
  ctx.setLineDash(strich);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = farbe;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Reichweite des Trupps um die Rumpfmitte. @param {CanvasRenderingContext2D} ctx @param {{x: number, y: number}} rumpf */
function reichweite(ctx, rumpf) {
  const [bx, by] = weltZuBild(rumpf.x, rumpf.y);
  ctx.beginPath();
  ctx.arc(bx, by, BERGEN_REICHWEITE_M * kamera.zoom, 0, Math.PI * 2);
  ctx.setLineDash([3, 6]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(231, 189, 98, 0.6)';
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Graviertes Messingschild über der Fundstelle (wie das Telegrafenschild in der Anzeige).
 * @param {CanvasRenderingContext2D} ctx @param {Fundstelle} f @param {string} text
 */
function schild(ctx, f, text) {
  const [bx, by] = weltZuBild(alsMeter(f.x), alsMeter(f.y));
  ctx.font = '600 12px Georgia, "Times New Roman", serif';
  const b = Math.ceil(ctx.measureText(text).width) + 18, h = 19;
  const x = Math.round(bx - b / 2), y = Math.round(by + Math.max(FUNDARTEN[f.art].radiusM * kamera.zoom, 6) + 10);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f0d48e'); g.addColorStop(0.6, '#c08f3e'); g.addColorStop(1, '#93652a');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 1, y + 2, b, h);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, b, h);
  ctx.strokeStyle = '#3a240c'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, b - 1, h - 1);
  ctx.fillStyle = '#6b4416'; // Nieten
  for (const nx of [x + 5, x + b - 5]) { ctx.beginPath(); ctx.arc(nx, y + h / 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#2a1806';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + b / 2, y + h / 2 + 1);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
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
