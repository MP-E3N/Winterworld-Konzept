// @ts-check
/**
 * nebel.js — Nebel- und Schneewehen-Decke über der Welt: Man sieht nur ums Licht, Gesehenes weht wieder zu (M5b).
 *
 * ZWECK:    Nutzerwunsch: Die Karte ist überwiegend verdeckt, man muss den Weg finden, ohne alles zu sehen.
 *           Frei ist der Sichtkreis um den eigenen Koloss (Tag 300 m, nachts und im Sturm weniger), was die
 *           Scheinwerfer und der Suchscheinwerfer ausleuchten und der Schein gesetzter Laternen. Was man
 *           gesehen hat, merkt sich eine Welt-Maske (10 m je Punkt); sie weht alle 5 s ein Stück zu.
 *           Spieltest M5b: Die eigene Spur bleibt NICHT mehr frei (verschwindet wie alles) — dafür Laternen.
 *           Aussehen (Spieltest M5b: „sieht wie große Reiskörner aus“): weiche Nebelschwaden aus einem
 *           vorgerechneten, nahtlosen Rauschen in zwei Größen, die beim Zoomen ineinander überblenden (so
 *           sieht der Nebel in jeder Zoomstufe gleich aus) und langsam mit dem Wind ziehen.
 * LIEST:    eigene Rumpflage, Licht, Suchscheinwerfer-Kegel, Laternen, Wind, state.tick, Kamera
 * SCHREIBT: nur eigene Zeichenflächen (kein Spielzustand)
 * REGEL:    NUR Darstellung (ab M6 muss der Server die Sicht prüfen, KONZEPT §8). LEISTUNG: Decke in
 *           halber Auflösung, Rauschen einmal vorgerechnet, Maske nie ausgelesen (siehe maskeCtx).
 * DEBUG:    Testknopf „Nebel aus“, Konsole ek.nebel(false). Maske ansehen: (await import('/render/nebel.js')).maskeAnsehen().
 */

import { kamera, weltZuBild } from './kamera.js';
import { LAMPEN, rumpfPunkt } from './koloss-mass.js';
import { sucherKegel, weicherKegel } from './sucher.js';
import { LICHT_KEGEL_GRAD } from '../data/ansicht.js';
import {
  SICHT_TAG_M, SICHT_NACHT_M, SICHT_STURM_ANTEIL, SICHT_LICHT_M, MASKE_M_JE_PX, MASKE_PX, ZUWEHEN_TICKS,
  ZUWEHEN_ANTEIL, DECKE_DECKKRAFT, DECKE_FARBE, SCHWADEN_PX, SCHWADEN_ZUG,
} from '../data/nebel.js';
import { LATERNE_SICHT_M } from '../data/laternen.js';

/** @typedef {{x: number, y: number, h: number}} Lage */
/** @typedef {import('./sucher.js').Kegel} Kegel */
/** @typedef {{x: number, y: number}} Ort  Weltmeter */

/** Testknopf / Konsole: Decke an oder aus (nur Darstellung). */
export const ansichtNebel = { an: true };

/** Weltmeter der linken oberen Maskenecke (Start in der Mitte). */
const URSPRUNG_M = -(MASKE_PX * MASKE_M_JE_PX) / 2;
const AUFLOESUNG = 0.5;
/** Kantenlänge des vorgerechneten Rauschens (Punkte). */
const RAUSCH_PX = 256;

/** Gedächtnis: deckend = gesehen. @type {HTMLCanvasElement | null} */
let maske = null;
/** Decke in halber Bildschirmauflösung. @type {HTMLCanvasElement | null} */
let decke = null;
/** @type {CanvasPattern | null} */
let schwaden = null;
const zeit = { zuwehen: -1, tick: -1 };
/** Wie weit die Schwaden mit dem Wind gezogen sind (Weltmeter). */
const zug = { x: 0, y: 0 };

/**
 * Sichtweite jetzt (m).
 * @param {number} nacht  0 = Tag … 1 = tiefe Nacht @param {number} sturm  0 … 1
 * @returns {number}
 */
export function sichtweite(nacht, sturm) {
  const tag = SICHT_TAG_M + (SICHT_NACHT_M - SICHT_TAG_M) * Math.min(1, nacht);
  return tag * (1 - (1 - SICHT_STURM_ANTEIL) * Math.min(1, sturm));
}

/** @returns {CanvasRenderingContext2D} */
function maskeCtx() {
  if (!maske) {
    maske = document.createElement('canvas');
    maske.width = maske.height = MASKE_PX;
  }
  // WARUM ohne willReadFrequently: Dann läge die Maske im Hauptspeicher und müsste jedes Bild neu auf die
  // Grafikkarte — gemessen +6 ms je Bild in der Fernansicht. Ausgelesen wird sie deshalb nie (sichtbar()).
  return /** @type {CanvasRenderingContext2D} */ (maske.getContext('2d'));
}

/** Neue Welt oder Spielstand geladen: alles wieder zugeweht. */
export function nebelZuruecksetzen() {
  maskeCtx().clearRect(0, 0, MASKE_PX, MASKE_PX);
  zeit.zuwehen = -1; zeit.tick = -1;
}

/** Weltmeter → Maskenpunkt. @param {number} m @returns {number} */
const px = (m) => (m - URSPRUNG_M) / MASKE_M_JE_PX;
/** @param {number} x @param {number} y @returns {[number, number]} */
const inMaske = (x, y) => [px(x), px(y)];

/**
 * Jedes Bild: Gesehenes in die Maske, Zuwehen fortschreiben, Schwaden ziehen lassen.
 * @param {number} tick @param {Lage | null} r  eigene Rumpfmitte (m) @param {number} sicht  m
 * @param {Kegel | null} sucher @param {Ort[]} laternen @param {{vx: number, vy: number}} wind  m/s @param {number} dtMs
 */
export function nebelAktualisieren(tick, r, sicht, sucher, laternen, wind, dtMs) {
  if (tick < zeit.tick) nebelZuruecksetzen(); // Zeit läuft rückwärts = andere Welt
  zeit.tick = tick;
  zug.x += wind.vx * SCHWADEN_ZUG * (dtMs / 1000);
  zug.y += wind.vy * SCHWADEN_ZUG * (dtMs / 1000);
  const m = maskeCtx();
  if (zeit.zuwehen < 0) zeit.zuwehen = tick;
  // Zuwehen: in festen Schritten (gleich bei 1× und 4×), nach großen Sprüngen höchstens 50 Schritte.
  const schritte = Math.min(50, Math.floor((tick - zeit.zuwehen) / ZUWEHEN_TICKS));
  zeit.zuwehen += schritte * ZUWEHEN_TICKS;
  if (schritte > 0) {
    m.globalCompositeOperation = 'destination-out';
    m.fillStyle = `rgba(0, 0, 0, ${1 - Math.pow(1 - ZUWEHEN_ANTEIL, schritte)})`;
    m.fillRect(0, 0, MASKE_PX, MASKE_PX);
  }
  m.globalCompositeOperation = 'source-over';
  const voll = 'rgba(255, 255, 255, 1)', leer = 'rgba(255, 255, 255, 0)';
  if (r) kreis(m, px(r.x), px(r.y), sicht / MASKE_M_JE_PX, voll, leer, 0.5);
  if (sucher) sucherKegel(m, sucher, voll, leer, inMaske, 1 / MASKE_M_JE_PX);
  for (const l of laternen) kreis(m, px(l.x), px(l.y), LATERNE_SICHT_M / MASKE_M_JE_PX, voll, leer, 0.4);
}

/**
 * Weicher Kreis (innen voll, ab `kern` × Radius auslaufend).
 * @param {CanvasRenderingContext2D} c @param {number} x @param {number} y @param {number} rad
 * @param {string} innen @param {string} aussen @param {number} kern
 */
function kreis(c, x, y, rad, innen, aussen, kern) {
  const g = c.createRadialGradient(x, y, rad * kern, x, y, rad);
  g.addColorStop(0, innen);
  g.addColorStop(1, aussen);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
}

/**
 * Die Decke zeichnen (nach den Kolossen, vor Rauch und Sturm).
 * @param {CanvasRenderingContext2D} ctx @param {Lage | null} r @param {number} sicht @param {boolean} licht
 * @param {Kegel | null} sucher @param {Ort[]} laternen
 */
export function nebelZeichnen(ctx, r, sicht, licht, sucher, laternen) {
  if (!ansichtNebel.an) return;
  const d = deckeCtx();
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, kamera.breite, kamera.hoehe);
  d.globalAlpha = DECKE_DECKKRAFT;
  // Kühler als der Schnee darunter, damit man sieht, wo die Decke liegt.
  d.fillStyle = DECKE_FARBE;
  d.fillRect(0, 0, kamera.breite, kamera.hoehe);
  schwadenMalen(d);
  d.globalAlpha = 1;
  // Gesehenes aus der Maske ausschneiden (Ausschnitt um die Kamera, weich vergrößert).
  d.globalCompositeOperation = 'destination-out';
  const bM = kamera.breite / kamera.zoom, hM = kamera.hoehe / kamera.zoom;
  d.imageSmoothingEnabled = true;
  d.drawImage(maskeCtx().canvas, px(kamera.x - bM / 2), px(kamera.y - hM / 2), bM / MASKE_M_JE_PX, hM / MASKE_M_JE_PX, 0, 0, kamera.breite, kamera.hoehe);
  const schwarz = 'rgba(0, 0, 0, 1)', weg = 'rgba(0, 0, 0, 0)';
  if (r) {
    const [bx, by] = weltZuBild(r.x, r.y);
    kreis(d, bx, by, sicht * kamera.zoom, schwarz, weg, 0.55);
    if (licht) scheinwerfer(d, r);
  }
  if (sucher) {
    const [sx, sy] = weltZuBild(sucher.x, sucher.y);
    weicherKegel(d, sx, sy, sucher.winkel, sucher.halb, sucher.weite * kamera.zoom, '0, 0, 0', 1);
  }
  for (const l of laternen) {
    const [lx, ly] = weltZuBild(l.x, l.y);
    kreis(d, lx, ly, LATERNE_SICHT_M * kamera.zoom, schwarz, weg, 0.35);
  }
  d.globalCompositeOperation = 'source-over';
  ctx.drawImage(d.canvas, 0, 0, kamera.breite, kamera.hoehe);
}

/** @returns {CanvasRenderingContext2D} */
function deckeCtx() {
  const dpr = (window.devicePixelRatio || 1) * AUFLOESUNG;
  if (!decke) decke = document.createElement('canvas');
  const b = Math.round(kamera.breite * dpr), h = Math.round(kamera.hoehe * dpr);
  if (decke.width !== b || decke.height !== h) { decke.width = b; decke.height = h; }
  const d = /** @type {CanvasRenderingContext2D} */ (decke.getContext('2d'));
  d.setTransform(dpr, 0, 0, dpr, 0, 0);
  return d;
}

// ── Nebelschwaden ──

/**
 * Zwei Lagen weiches Rauschen, an der Welt verankert. Ihre Weltgröße ist eine Zweierpotenz, so gewählt,
 * dass eine Kachel auf dem Bildschirm etwa SCHWADEN_PX groß ist; zwischen den beiden nächsten Größen wird
 * stufenlos überblendet. WARUM: Ein festes Muster wächst beim Hineinzoomen zu Klecksen (die „Reiskörner“)
 * und schrumpft beim Herauszoomen zu Krümeln.
 * @param {CanvasRenderingContext2D} d
 */
function schwadenMalen(d) {
  if (!schwaden) schwaden = d.createPattern(rauschBild(), 'repeat');
  if (!schwaden) return;
  const f = Math.log2(SCHWADEN_PX / kamera.zoom), stufe = Math.floor(f), anteil = f - stufe;
  const grund = d.globalAlpha;
  for (const [groesseM, gewicht, tempo] of /** @type {[number, number, number][]} */ ([
    [2 ** stufe, 1 - anteil, 1], [2 ** (stufe + 1), anteil, 0.6],
  ])) {
    if (gewicht < 0.02) continue;
    const s = (groesseM * kamera.zoom) / RAUSCH_PX, kachel = groesseM * kamera.zoom;
    // Weltursprung des Musters (zieht mit dem Wind) auf dem Bildschirm, auf eine Kachel genau gekürzt.
    const ox = ((zug.x * tempo - kamera.x) * kamera.zoom + kamera.breite / 2) % kachel;
    const oy = ((zug.y * tempo - kamera.y) * kamera.zoom + kamera.hoehe / 2) % kachel;
    schwaden.setTransform(new DOMMatrix().translate(ox, oy).scale(s));
    d.globalAlpha = grund * gewicht;
    d.fillStyle = schwaden;
    d.fillRect(0, 0, kamera.breite, kamera.hoehe);
  }
  d.globalAlpha = grund;
}

/**
 * Nahtloses, weiches Rauschen (vier Oktaven Werterauschen mit glatter Überblendung), einmal berechnet:
 * hell = lichter Nebel, dunkel = kalte, dichtere Schwaden. Ohne harte Formen.
 * @returns {HTMLCanvasElement}
 */
function rauschBild() {
  const c = document.createElement('canvas');
  c.width = c.height = RAUSCH_PX;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const bild = g.createImageData(RAUSCH_PX, RAUSCH_PX);
  let saat = 23;
  const zufall = () => { saat = (saat * 16807) % 2147483647; return saat / 2147483647; };
  const oktaven = [4, 8, 16, 32].map((n) => ({ n, gitter: Array.from({ length: n * n }, zufall) }));
  /** @param {number} t */ const glatt = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < RAUSCH_PX; y++) {
    for (let x = 0; x < RAUSCH_PX; x++) {
      let wert = 0, gewicht = 0, w = 1;
      for (const o of oktaven) {
        const fx = (x / RAUSCH_PX) * o.n, fy = (y / RAUSCH_PX) * o.n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = glatt(fx - x0), ty = glatt(fy - y0);
        const at = (/** @type {number} */ i, /** @type {number} */ j) => o.gitter[((j % o.n) * o.n) + (i % o.n)];
        const oben = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const unten = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        wert += (oben + (unten - oben) * ty) * w; gewicht += w; w *= 0.5;
      }
      const v = wert / gewicht, i = (y * RAUSCH_PX + x) * 4;
      if (v > 0.5) { bild.data[i] = 248; bild.data[i + 1] = 251; bild.data[i + 2] = 255; bild.data[i + 3] = Math.min(255, (v - 0.5) * 2 * 210); }
      else { bild.data[i] = 120; bild.data[i + 1] = 136; bild.data[i + 2] = 156; bild.data[i + 3] = Math.min(255, (0.5 - v) * 2 * 170); }
    }
  }
  g.putImageData(bild, 0, 0);
  return c;
}

// ── Licht schneidet die Decke auf ──

/** Frontscheinwerfer-Kegel aus der Decke schneiden (weiche Ränder). @param {CanvasRenderingContext2D} d @param {Lage} r */
function scheinwerfer(d, r) {
  const halb = (LICHT_KEGEL_GRAD * Math.PI) / 180, weite = SICHT_LICHT_M * kamera.zoom;
  for (const [lx, ly] of LAMPEN) {
    const [wx, wy] = rumpfPunkt(r, lx, ly);
    const [qx, qy] = weltZuBild(wx, wy);
    weicherKegel(d, qx, qy, r.h, halb, weite, '0, 0, 0', 1);
  }
}

/**
 * Sieht man diesen Weltpunkt gerade? Für das Anklicken: im Sichtkreis, im Suchscheinwerfer oder am Licht einer
 * Laterne. WARUM nicht aus der Maske lesen: Auslesen der Grafikkarte bremst (siehe maskeCtx).
 * @param {number} wx @param {number} wy  Meter @param {Lage | null} r @param {number} sicht
 * @param {Kegel | null} [sucher] @param {Ort[]} [laternen]
 * @returns {boolean}
 */
export function sichtbar(wx, wy, r, sicht, sucher = null, laternen = []) {
  if (!ansichtNebel.an) return true;
  if (r && Math.hypot(wx - r.x, wy - r.y) <= sicht * 0.8) return true;
  if (sucher) {
    const d = Math.hypot(wx - sucher.x, wy - sucher.y);
    const w = Math.atan2(wy - sucher.y, wx - sucher.x) - sucher.winkel;
    if (d <= sucher.weite * 0.8 && Math.abs(Math.atan2(Math.sin(w), Math.cos(w))) <= sucher.halb) return true;
  }
  return laternen.some((l) => Math.hypot(wx - l.x, wy - l.y) <= LATERNE_SICHT_M * 0.8);
}

/** Sicht dieses Bildes (für Mausabfragen zwischen zwei Bildern, eingabe/maus.js). */
const sichtZuletzt = { r: /** @type {Lage | null} */ (null), sicht: SICHT_TAG_M, sucher: /** @type {Kegel | null} */ (null), laternen: /** @type {Ort[]} */ ([]) };

/**
 * Jedes Bild: die aktuelle Sicht merken.
 * @param {Lage | null} r @param {number} sicht @param {Kegel | null} sucher @param {Ort[]} laternen
 */
export function sichtMerken(r, sicht, sucher, laternen) {
  Object.assign(sichtZuletzt, { r, sicht, sucher, laternen });
}

/**
 * Sieht man den Punkt im zuletzt gezeichneten Bild?
 * @param {number} wx @param {number} wy  Meter
 * @returns {boolean}
 */
export function sichtbarJetzt(wx, wy) {
  const z = sichtZuletzt;
  return sichtbar(wx, wy, z.r, z.sicht, z.sucher, z.laternen);
}

/** Konsole: Maske als Bild in einem neuen Tab ansehen. */
export function maskeAnsehen() {
  if (maske) window.open(maske.toDataURL());
}
