// @ts-check
/**
 * sturm.js — Schneesturm in der Darstellung: Sturmfront vorher, Schleier mit Sichtkreis, Schneestreifen (M5a).
 *
 * ZWECK:    Nutzerentscheidung: Ein Sturm bringt schlechte Sicht. Über die Welt legt sich ein weiß-grauer
 *           Schleier; frei bleibt nur ein Kreis um den eigenen Koloss (je stärker, desto kleiner), die
 *           Scheinwerfer schneiden ihn ein Stück auf. Darüber jagen vom Wind getriebene Schneestreifen.
 *           Vor dem Sturm (Barometer fällt) zieht auf der Windseite eine graue Front am Bildrand auf.
 * LIEST:    state.wetter (Sturm, Wind), Barometer (sim/wetter/sturm.js), Rumpflagen, Kamera
 * SCHREIBT: nur das Canvas und eine eigene Ebene (kein Spielzustand)
 * REGEL:    LEISTUNG (Spieltest-Lehre zu Rauch und Nacht): EINE Ebene in halber Auflösung, die Streifen sind
 *           ein vorgerendertes Muster, das nur verschoben wird — keine Einzelteilchen. Ohne Sturm: nichts.
 * DEBUG:    `ek.sturm(0.8)` zeigt den Schleier probehalber (null = wieder echt). F3-Zeile „Sturm“.
 */

import { kamera, weltZuBild } from './kamera.js';
import { LAMPEN, rumpfPunkt } from './koloss-mass.js';
import { weicherKegel } from './sucher.js';
import { barometer } from '../sim/wetter/sturm.js';
import { STURM_VOLL, BAROMETER_SCHOEN } from '../data/wetter.js';
import { LICHT_REICHWEITE_M, LICHT_KEGEL_GRAD } from '../data/ansicht.js';

/** @typedef {{x: number, y: number, h: number}} Lage */

/** Stärke für die Darstellung 0 … 1; `vorgabe` aus der Konsole (ek.sturm) geht vor. */
export const ansichtSturm = { staerke: 0, vorgabe: /** @type {number | null} */ (null) };

/** Auflösung der Sturm-Ebene relativ zum Bildschirm. */
const AUFLOESUNG = 0.5;
/** Freie Sicht um den Koloss (m): bei schwachem Sturm weit, bei vollem eng. */
const SICHT_WEIT_M = 240;
const SICHT_ENG_M = 55;
/** Deckkraft des Schleiers bei voller Stärke; in der Fernansicht (Karte) nur ein Teil davon. */
const SCHLEIER_MAX = 0.86;
const FERN_ANTEIL = 0.5;
/** Schleierfarbe (helles Grau-Weiß). */
const SCHLEIER = '214, 222, 230';
/** Wie weit die Streifen je Sekunde wandern (Bildpunkte bei voller Stärke). */
const STREIFEN_TEMPO = 900;

/** @type {HTMLCanvasElement | null} */
let ebene = null;
/** @type {HTMLCanvasElement | null} */
let streifenBild = null;
/** Das Streifenmuster der Ebene (einmal angelegt). @type {CanvasPattern | null} */
let muster = null;
/** Verschiebung der Streifen (Bildpunkte, wächst mit der Zeit). */
let versatz = 0;

/**
 * Sturmfront und Schleier zeichnen (nach Rauch und Funken, vor der Dunkelheit — nachts wird er dunkel).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../sim/types.js').Wetter} w @param {number} tick
 * @param {Lage | null} eigener  Rumpfmitte des eigenen Kolosses
 * @param {boolean} licht  eigene Scheinwerfer an?
 * @param {number} optikDt  Spielzeit seit dem letzten Bild (ms)
 * @param {import('./sucher.js').Kegel | null} [sucher]  Suchscheinwerfer schneidet weit in den Schleier (Spieltest M5b)
 */
export function sturmZeichnen(ctx, w, tick, eigener, licht, optikDt, sucher = null) {
  ansichtSturm.staerke = ansichtSturm.vorgabe ?? w.sturm / STURM_VOLL;
  const windRad = (w.windRichtung / 65536) * Math.PI * 2;
  const vorher = 1 - barometer(w, tick) / BAROMETER_SCHOEN;
  if (vorher > 0 && ansichtSturm.staerke < 0.5) front(ctx, windRad, vorher * (1 - ansichtSturm.staerke * 2));
  const s = ansichtSturm.staerke;
  if (s <= 0) return;
  versatz = (versatz + (optikDt / 1000) * STREIFEN_TEMPO * (0.4 + 0.6 * s)) % 4096;
  const fern = kamera.zoom < 0.5 ? FERN_ANTEIL : 1;
  // WARUM nicht linear: Schon ein mittlerer Sturm (Stärke 600) soll deutlich zu sehen sein.
  const dicht = Math.min(1, s * 1.35);
  const d = ebeneHolen();
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, kamera.breite, kamera.hoehe);
  d.fillStyle = `rgba(${SCHLEIER}, ${SCHLEIER_MAX * dicht * fern})`;
  d.fillRect(0, 0, kamera.breite, kamera.hoehe);
  if (eigener) sichtAufschneiden(d, eigener, licht, s);
  if (sucher) {
    const [sx, sy] = weltZuBild(sucher.x, sucher.y);
    weicherKegel(d, sx, sy, sucher.winkel, sucher.halb, sucher.weite * kamera.zoom, '0, 0, 0', 1);
  }
  // Streifen NACH dem Aufschneiden: Der Schnee jagt auch am Koloss vorbei.
  d.globalCompositeOperation = 'source-over';
  streifen(d, windRad, (0.35 + 0.65 * dicht) * fern);
  ctx.drawImage(/** @type {HTMLCanvasElement} */ (ebene), 0, 0, kamera.breite, kamera.hoehe);
}

/** @returns {CanvasRenderingContext2D}  Ebene in halber Auflösung, auf Bildschirmmaße eingerichtet */
function ebeneHolen() {
  const dpr = (window.devicePixelRatio || 1) * AUFLOESUNG;
  if (!ebene) ebene = document.createElement('canvas');
  const b = Math.round(kamera.breite * dpr), h = Math.round(kamera.hoehe * dpr);
  if (ebene.width !== b || ebene.height !== h) { ebene.width = b; ebene.height = h; }
  const d = /** @type {CanvasRenderingContext2D} */ (ebene.getContext('2d'));
  d.setTransform(dpr, 0, 0, dpr, 0, 0);
  return d;
}

/**
 * Graue Front am Bildrand, aus dem der Wind kommt (Vorwarnung).
 * @param {CanvasRenderingContext2D} ctx @param {number} windRad  wohin der Wind weht @param {number} staerke 0 … 1
 */
function front(ctx, windRad, staerke) {
  if (staerke <= 0.01) return;
  const mx = kamera.breite / 2, my = kamera.hoehe / 2, r = Math.hypot(mx, my);
  // Von der Luv-Seite (gegen die Windrichtung) zur Mitte hin auslaufen.
  const ax = mx - Math.cos(windRad) * r, ay = my - Math.sin(windRad) * r;
  const g = ctx.createLinearGradient(ax, ay, mx - Math.cos(windRad) * r * 0.1, my - Math.sin(windRad) * r * 0.1);
  g.addColorStop(0, `rgba(96, 106, 118, ${0.62 * staerke})`);
  g.addColorStop(1, 'rgba(96, 106, 118, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, kamera.breite, kamera.hoehe);
}

/**
 * Vom Wind getriebene Schneestreifen: ein Muster, gedreht in Windrichtung und verschoben.
 * @param {CanvasRenderingContext2D} d @param {number} windRad @param {number} deckkraft
 */
function streifen(d, windRad, deckkraft) {
  // WARUM zwischenspeichern: createPattern jedes Bild neu anzulegen kostet spürbar (Leistung).
  if (!muster) muster = d.createPattern(streifenMuster(), 'repeat');
  if (!muster) return;
  muster.setTransform(new DOMMatrix().translate(versatz, 0));
  const r = Math.hypot(kamera.breite, kamera.hoehe) / 2;
  d.save();
  d.globalAlpha = Math.min(1, deckkraft);
  d.translate(kamera.breite / 2, kamera.hoehe / 2);
  d.rotate(windRad);
  d.fillStyle = muster;
  d.fillRect(-r, -r, r * 2, r * 2);
  d.restore();
}

/** Einmal erzeugtes Streifenbild (256 × 256, nahtlos wiederholbar). @returns {HTMLCanvasElement} */
function streifenMuster() {
  if (streifenBild) return streifenBild;
  streifenBild = document.createElement('canvas');
  streifenBild.width = streifenBild.height = 256;
  const c = /** @type {CanvasRenderingContext2D} */ (streifenBild.getContext('2d'));
  c.lineCap = 'round';
  let saat = 7;
  const zufall = () => { saat = (saat * 16807) % 2147483647; return saat / 2147483647; };
  // 75 Striche (M5a-Spieltest: Windeffekte halbiert, vorher 150).
  for (let i = 0; i < 75; i++) {
    const x = zufall() * 256, y = zufall() * 256, l = 10 + zufall() * 34, a = 0.3 + zufall() * 0.5;
    // Meist bläulich-grau (Weiß sähe man auf Schnee nicht), ein Teil hell für die Tiefe.
    c.strokeStyle = zufall() < 0.7 ? `rgba(128, 148, 172, ${a})` : `rgba(245, 248, 252, ${a})`;
    c.lineWidth = 0.8 + zufall() * 1.6;
    // Über den Rand hinaus zweimal zeichnen, damit das Muster nahtlos ist.
    for (const dx of [0, -256]) { c.beginPath(); c.moveTo(x + dx, y); c.lineTo(x + dx + l, y + (zufall() - 0.5) * 3); c.stroke(); }
  }
  return streifenBild;
}

/**
 * Freier Kreis um den eigenen Koloss, Scheinwerfer schneiden weiter hinein.
 * @param {CanvasRenderingContext2D} d @param {Lage} r @param {boolean} licht @param {number} s  Stärke 0 … 1
 */
function sichtAufschneiden(d, r, licht, s) {
  d.globalCompositeOperation = 'destination-out';
  const [bx, by] = weltZuBild(r.x, r.y);
  const radius = (SICHT_WEIT_M + (SICHT_ENG_M - SICHT_WEIT_M) * s) * kamera.zoom;
  const g = d.createRadialGradient(bx, by, radius * 0.3, bx, by, radius);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  d.fillStyle = g;
  d.beginPath(); d.arc(bx, by, radius, 0, Math.PI * 2); d.fill();
  if (!licht) return;
  const halb = (LICHT_KEGEL_GRAD * Math.PI) / 180, weite = LICHT_REICHWEITE_M * 1.6 * kamera.zoom;
  for (const [lx, ly] of LAMPEN) {
    const [wx, wy] = rumpfPunkt(r, lx, ly);
    const [px, py] = weltZuBild(wx, wy);
    // Spieltest M5b: Licht soll im Sturm weiter sehen lassen — weiche Ränder statt harter Kante.
    weicherKegel(d, px, py, r.h, halb, weite, '0, 0, 0', 1);
  }
}
