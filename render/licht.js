// @ts-check
/**
 * licht.js — Scheinwerfer-Lichtkegel und Dunkelheit.
 *
 * ZWECK:    Eingeschaltete Scheinwerfer (k.licht) werfen zwei warme Lichtkegel nach vorn auf den
 *           Schnee. Bei Tag sieht man sie als goldenen Schimmer; ist es dunkel (ansichtLicht.nacht > 0),
 *           schneiden sie die Dunkelheit auf — dann braucht man sie (Nacht/Sturm kommen in M4).
 * LIEST:    Rumpflagen und Licht-Schalter der Kolosse, Kamera, data/ansicht.js, render/koloss-mass.js
 * SCHREIBT: nur das Canvas und eine eigene Dunkel-Ebene (kein Spielzustand)
 * REGEL:    Darstellung liest nur (CLAUDE.md Regel 1). Wie dunkel es ist, entscheidet ab M4 die
 *           Tageszeit im Zustand; bis dahin nur zum Ausprobieren über die Konsole: `ek.nacht(0.85)`.
 * DEBUG:    Kegel zeigt in die falsche Richtung? LAMPEN in render/koloss-mass.js und rumpfPunkt() prüfen.
 */

import { kamera, weltZuBild } from './kamera.js';
import { LICHT_REICHWEITE_M, LICHT_KEGEL_GRAD, LICHT_TAG_DECKKRAFT, LICHT_NACHT_DECKKRAFT, NACHT_FARBE } from '../data/ansicht.js';
import { LAMPEN, rumpfPunkt } from './koloss-mass.js';
import { weicherKegel } from './sucher.js';

/** So viel der Nacht hebt Licht in der Kegelmitte auf (Spieltest M5b: nicht ganz — sonst „blendet es weg“). */
const LICHT_AUFHELLUNG = 0.72;
import { LATERNE_SICHT_M } from '../data/laternen.js';

/**
 * Wie dunkel es gerade ist: 0 = heller Tag, 1 = tiefe Nacht. Nur Darstellung — render/zeichnen.js
 * setzt `nacht` jedes Bild aus der Tageszeit (M4a). `vorgabe` (Konsole `ek.nacht(x)`) geht vor.
 */
export const ansichtLicht = { nacht: 0, vorgabe: /** @type {number | null} */ (null) };

/** @typedef {{x: number, y: number, h: number}} Lage */

/** Auflösung der Dunkel-Ebene relativ zum Bildschirm. */
const DUNKEL_AUFLOESUNG = 0.5;

/** Eigene Zeichenfläche für die Dunkelheit (Löcher für das Licht werden hineingeschnitten). */
let dunkel = /** @type {HTMLCanvasElement | null} */ (null);

/**
 * Lichtkegel auf dem Boden (unter den Kolossen zeichnen).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Lage[]} rumpfe  Rumpfmitten aller Kolosse mit eingeschaltetem Licht
 * @param {import('./sucher.js').Kegel | null} [sucher]  eigener Suchscheinwerfer (Spieltest M5b)
 */
export function lichtkegelZeichnen(ctx, rumpfe, sucher = null) {
  // Nur ein warmer Schimmer auf dem Boden — das eigentliche Sehen macht das Aufschneiden der Dunkelheit.
  // WARUM so wenig (Spieltest M5b): Vorher füllte der Kegel nachts fast deckend gelb und „blendete alles
  // davor weg“; jetzt bleibt das Gelände im Licht erkennbar.
  const deckkraft = LICHT_TAG_DECKKRAFT + (LICHT_NACHT_DECKKRAFT - LICHT_TAG_DECKKRAFT) * ansichtLicht.nacht;
  for (const r of rumpfe) {
    for (const [lx, ly] of LAMPEN) kegel(ctx, r, lx, ly, '255, 214, 140', deckkraft);
  }
  // Suchscheinwerfer: kaltweißer Schimmer (Bogenlampe), ebenso zurückhaltend.
  if (sucher) sucherWeich(ctx, sucher, '235, 242, 255', deckkraft);
}

/**
 * Suchscheinwerfer-Kegel mit weichen Rändern (Bildpunkte).
 * @param {CanvasRenderingContext2D} ctx @param {import('./sucher.js').Kegel} k @param {string} rgb @param {number} staerke
 */
function sucherWeich(ctx, k, rgb, staerke) {
  const [px, py] = weltZuBild(k.x, k.y);
  weicherKegel(ctx, px, py, k.winkel, k.halb, k.weite * kamera.zoom, rgb, staerke);
}

/**
 * Dunkelheit über allem (nach dem Rauch zeichnen). Wo Scheinwerfer leuchten, wird sie aufgeschnitten;
 * um jeden Koloss bleibt ein kleiner Schein, damit man das eigene Fahrzeug noch sieht.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Lage[]} alle    Rumpfmitten aller Kolosse
 * @param {Lage[]} mitLicht  Rumpfmitten der Kolosse mit eingeschaltetem Licht
 * @param {import('./sucher.js').Kegel | null} [sucher]  eigener Suchscheinwerfer
 * @param {{x: number, y: number}[]} [laternen]  brennende Laternen (Meter)
 */
export function dunkelheitZeichnen(ctx, alle, mitLicht, sucher = null, laternen = []) {
  if (ansichtLicht.nacht <= 0) return;
  // Halbe Auflösung (wie der Rauch): Die Dunkelheit ist weich, man sieht keinen Unterschied.
  // WARUM: Nutzer hatte nachts nur 16 Bilder/s — eine bildschirmgroße Fläche mit Verläufen und
  // „destination-out“ in voller Auflösung kostet die Grafikkarte viel (Spieltest M4a).
  const dpr = (window.devicePixelRatio || 1) * DUNKEL_AUFLOESUNG;
  if (!dunkel) dunkel = document.createElement('canvas');
  const w = Math.round(kamera.breite * dpr), h = Math.round(kamera.hoehe * dpr);
  if (dunkel.width !== w || dunkel.height !== h) { dunkel.width = w; dunkel.height = h; }
  const d = /** @type {CanvasRenderingContext2D} */ (dunkel.getContext('2d'));
  d.setTransform(dpr, 0, 0, dpr, 0, 0);
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, kamera.breite, kamera.hoehe);
  d.fillStyle = `rgba(${NACHT_FARBE}, ${0.92 * ansichtLicht.nacht})`;
  d.fillRect(0, 0, kamera.breite, kamera.hoehe);
  d.globalCompositeOperation = 'destination-out';
  // WARUM nicht ganz aufschneiden (Spieltest M5b): Lässt das Licht die Nacht komplett verschwinden, erscheint
  // reinweißer Schnee mit harter Kante — das wirkt wie Wegblenden. Ein Rest Nacht bleibt im Licht.
  for (const r of mitLicht) {
    for (const [lx, ly] of LAMPEN) kegel(d, r, lx, ly, '0, 0, 0', LICHT_AUFHELLUNG);
  }
  for (const r of alle) schein(d, r, mitLicht.includes(r) ? 0.75 : 0.35);
  if (sucher) sucherWeich(d, sucher, '0, 0, 0', LICHT_AUFHELLUNG);
  for (const l of laternen) {
    const [bx, by] = weltZuBild(l.x, l.y), rad = LATERNE_SICHT_M * kamera.zoom;
    const g = d.createRadialGradient(bx, by, 0, bx, by, rad);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.6)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    d.fillStyle = g; d.beginPath(); d.arc(bx, by, rad, 0, Math.PI * 2); d.fill();
  }
  ctx.drawImage(dunkel, 0, 0, kamera.breite, kamera.hoehe);
}

/**
 * Ein Lichtkegel aus einer Lampe, nach vorn, mit weichen Rändern und weichem Verlauf zur Reichweite hin.
 * @param {CanvasRenderingContext2D} ctx @param {Lage} r  Rumpfmitte
 * @param {number} lx @param {number} ly  Lampe im Rumpf-System (m)
 * @param {string} rgb  „r, g, b“ @param {number} staerke  0 … 1
 */
function kegel(ctx, r, lx, ly, rgb, staerke) {
  const [wx, wy] = rumpfPunkt(r, lx, ly);
  const [bx, by] = weltZuBild(wx, wy);
  const halb = (LICHT_KEGEL_GRAD * Math.PI) / 180;
  // Leicht nach außen gedreht, damit beide Kegel zusammen die ganze Fahrbahn ausleuchten.
  weicherKegel(ctx, bx, by, r.h + Math.sign(ly) * halb * 0.25, halb, LICHT_REICHWEITE_M * kamera.zoom, rgb, staerke);
}

/**
 * Schwacher Schein um einen Koloss in der Dunkelheit (Feuerraum, Laternen an Bord).
 * @param {CanvasRenderingContext2D} ctx @param {Lage} r @param {number} staerke 0 … 1
 */
function schein(ctx, r, staerke) {
  const [bx, by] = weltZuBild(r.x, r.y);
  const radius = 26 * kamera.zoom;
  const g = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
  g.addColorStop(0, `rgba(0, 0, 0, ${staerke})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(bx, by, radius, 0, Math.PI * 2); ctx.fill();
}
