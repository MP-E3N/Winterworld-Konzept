// @ts-check
/**
 * funken.js — Funkenflug und schwarze Rußflocken aus dem Schornstein, als animierte Sprites.
 *
 * ZWECK:    Glühende Kohlebröckchen fliegen heraus, werden von Fahrt und Wind mitgerissen und kühlen
 *           ab (runde Glut, Spieltest M2b: keine Striche mehr). Dazu viele schwarze Rußflocken, die
 *           im Rauch mittreiben und taumeln.
 * LEISTUNG: Beides sind vorgerenderte Animationen auf je EINEM Bild (Atlas): Funken 12 Abkühl-Stufen,
 *           Flocken 6 Formen × 8 Taumel-Phasen. Pro Teilchen und Bild nur ein drawImage — keine
 *           Pfade, keine Farbverläufe, keine Farbtexte.
 * LIEST:    Schornsteinlage, Fahrt des Kolosses und Wind (m/s)
 * SCHREIBT: eigene Teilchenliste und zwei kleine Atlas-Bilder (kein Spielzustand)
 * REGEL:    KONZEPT.md §6
 * DEBUG:    `ek.optik().teilchen` zählt Rauch + Funken + Flocken.
 */

import { kamera, weltZuBild } from './kamera.js';

const MAX = 1500;
/** Wie schnell sich Funken (schwer) und Flocken (leicht) dem Wind angleichen (je Sekunde). */
const ANGLEICHEN_FUNKE = 1.6, ANGLEICHEN_FLOCKE = 1.2;
/** Verwirbelung der Flocken (m/s). */
const WIRBEL_MS = 2.6;
/** Glut-Animation: Anzahl Abkühl-Stufen und Feldgröße (Pixel). */
const GLUT_STUFEN = 12, GLUT_PX = 24;
/** Flocken-Animation: Formen, Taumel-Phasen, Feldgröße (Pixel), Dauer einer Phase (ms). */
const FLOCKE_FORMEN = 6, FLOCKE_PHASEN = 8, FLOCKE_PX = 16, PHASE_MS = 70;

/**
 * @typedef {Object} Funke
 * @property {'funke' | 'flocke'} art
 * @property {number} x @property {number} y @property {number} vx @property {number} vy  m, m/s
 * @property {number} alter @property {number} dauer  ms
 * @property {number} groesse  m @property {number} phase  Startphase der Animation
 * @property {number} form  Flocken-Form (0 … FLOCKE_FORMEN−1)
 */

/** @type {Funke[]} */
const liste = [];

/**
 * Glühende Bröckchen: starten mit der Fahrt des Kolosses plus Wurf in alle Richtungen,
 * glühen 0,6–1,8 s (weiß-gelb → orange → dunkelrot).
 * @param {[number, number]} pos @param {number} anzahl
 * @param {{vx: number, vy: number}} fahrt  Tempo des Kolosses (m/s)
 */
export function funkenWerfen(pos, anzahl, fahrt) {
  for (let i = 0; i < anzahl && liste.length < MAX; i++) {
    const w = Math.random() * Math.PI * 2, v = 4 + Math.random() * 10;
    liste.push({ art: 'funke', x: pos[0] + (Math.random() - 0.5) * 0.8, y: pos[1] + (Math.random() - 0.5) * 0.8,
      vx: fahrt.vx + Math.cos(w) * v, vy: fahrt.vy + Math.sin(w) * v,
      alter: 0, dauer: 600 + Math.random() * 1200, groesse: 0.12 + Math.random() * 0.2, phase: 0, form: 0 });
  }
}

/**
 * Schwarze Rußflocken: leicht, treiben mit dem Rauch, taumeln, 2,5–6 s sichtbar.
 * @param {[number, number]} pos @param {number} anzahl
 * @param {{vx: number, vy: number}} fahrt  Tempo des Kolosses (m/s)
 */
export function flockenWerfen(pos, anzahl, fahrt) {
  for (let i = 0; i < anzahl && liste.length < MAX; i++) {
    liste.push({ art: 'flocke', x: pos[0] + (Math.random() - 0.5) * 1.6, y: pos[1] + (Math.random() - 0.5) * 1.6,
      vx: fahrt.vx * 0.7 + (Math.random() - 0.5) * 3, vy: fahrt.vy * 0.7 + (Math.random() - 0.5) * 3,
      alter: 0, dauer: 2500 + Math.random() * 3500, groesse: 0.12 + Math.random() * 0.25,
      phase: Math.floor(Math.random() * FLOCKE_PHASEN), form: Math.floor(Math.random() * FLOCKE_FORMEN) });
  }
}

/**
 * Bewegt alles: Funken gleichen sich zügig dem Wind an (bremsen von der Fahrt ab — so ziehen sie
 * hinter dem Koloss her), Flocken langsamer und mit Verwirbelung.
 * @param {{vx: number, vy: number}} wind @param {number} dtMs
 */
export function funkenBewegen(wind, dtMs) {
  const s = dtMs / 1000;
  const kf = 1 - Math.exp(-s * ANGLEICHEN_FUNKE), kl = 1 - Math.exp(-s * ANGLEICHEN_FLOCKE);
  for (let i = liste.length - 1; i >= 0; i--) {
    const t = liste[i];
    t.alter += dtMs;
    if (t.alter >= t.dauer) { liste.splice(i, 1); continue; }
    if (t.art === 'funke') {
      t.vx += (wind.vx - t.vx) * kf; t.vy += (wind.vy - t.vy) * kf;
    } else {
      const wx = WIRBEL_MS * Math.sin(t.alter / 420 + t.phase), wy = WIRBEL_MS * Math.cos(t.alter / 560 + t.phase * 1.3);
      t.vx += (wind.vx + wx - t.vx) * kl; t.vy += (wind.vy + wy - t.vy) * kl;
    }
    t.x += t.vx * s; t.y += t.vy * s;
  }
}

/**
 * Zeichnet Flocken und darüber die Funken — je ein Feld aus dem passenden Atlas.
 * @param {CanvasRenderingContext2D} ctx
 */
export function funkenZeichnen(ctx) {
  if (kamera.zoom < 0.3 || liste.length === 0) return;
  const glut = glutAtlas(), flocke = flockenAtlas();
  for (const t of liste) {
    if (t.art !== 'flocke') continue;
    const f = t.alter / t.dauer;
    const [bx, by] = weltZuBild(t.x, t.y);
    const d = Math.max(2, t.groesse * kamera.zoom * 1.6);
    const phase = (t.phase + Math.floor(t.alter / PHASE_MS)) % FLOCKE_PHASEN;
    ctx.globalAlpha = f < 0.75 ? 0.9 : 0.9 * (1 - f) * 4; // nur am Ende ausblenden
    ctx.drawImage(flocke, phase * FLOCKE_PX, t.form * FLOCKE_PX, FLOCKE_PX, FLOCKE_PX, bx - d / 2, by - d / 2, d, d);
  }
  ctx.globalAlpha = 1;
  for (const t of liste) {
    if (t.art !== 'funke') continue;
    const [bx, by] = weltZuBild(t.x, t.y);
    const d = Math.max(5, t.groesse * kamera.zoom * 5.2); // inkl. Schein rundherum
    const stufe = Math.min(GLUT_STUFEN - 1, Math.floor((t.alter / t.dauer) * GLUT_STUFEN));
    ctx.drawImage(glut, stufe * GLUT_PX, 0, GLUT_PX, GLUT_PX, bx - d / 2, by - d / 2, d, d);
  }
}

// ── Atlanten (einmal beim ersten Gebrauch) ────────────────

let glutBild = /** @type {HTMLCanvasElement | null} */ (null);
let flockenBild = /** @type {HTMLCanvasElement | null} */ (null);

/**
 * Glut-Animation: heller Kern mit warmem Schein, der von Stufe zu Stufe abkühlt
 * (weiß-gelb → orange → dunkelrot) und am Ende verlischt.
 * @returns {HTMLCanvasElement}
 */
function glutAtlas() {
  if (glutBild) return glutBild;
  const c = document.createElement('canvas');
  c.width = GLUT_STUFEN * GLUT_PX; c.height = GLUT_PX;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const m = GLUT_PX / 2;
  for (let i = 0; i < GLUT_STUFEN; i++) {
    const f = i / (GLUT_STUFEN - 1);
    const gruen = Math.round(235 - f * 190), blau = Math.round(Math.max(0, 150 - f * 260));
    const a = 1 - f * f * f; // glühen lange, verlöschen erst am Ende
    const x = i * GLUT_PX + m;
    const v = g.createRadialGradient(x, m, 0, x, m, m);
    v.addColorStop(0, `rgba(255, ${Math.min(255, gruen + 20)}, ${blau + 40}, ${a})`);
    v.addColorStop(0.2, `rgba(255, ${gruen}, ${blau}, ${a})`);
    v.addColorStop(0.32, `rgba(255, ${gruen}, ${blau}, ${a * 0.3})`);
    v.addColorStop(1, `rgba(255, ${gruen}, ${blau}, 0)`);
    g.fillStyle = v;
    g.fillRect(i * GLUT_PX, 0, GLUT_PX, GLUT_PX);
  }
  glutBild = c;
  return c;
}

/**
 * Flocken-Animation: unregelmäßige schwarze Plättchen (eine Zeile je Form), die sich drehen und
 * dabei schmal und wieder breit werden (Taumeln) — eine Spalte je Phase.
 * @returns {HTMLCanvasElement}
 */
function flockenAtlas() {
  if (flockenBild) return flockenBild;
  const c = document.createElement('canvas');
  c.width = FLOCKE_PHASEN * FLOCKE_PX; c.height = FLOCKE_FORMEN * FLOCKE_PX;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const m = FLOCKE_PX / 2;
  for (let form = 0; form < FLOCKE_FORMEN; form++) {
    const ecken = 5 + Math.floor(Math.random() * 4);
    /** @type {[number, number][]} */
    const punkte = [];
    for (let e = 0; e < ecken; e++) {
      const w = (e / ecken) * Math.PI * 2, r = m * (0.45 + Math.random() * 0.45);
      punkte.push([Math.cos(w) * r, Math.sin(w) * r]);
    }
    for (let p = 0; p < FLOCKE_PHASEN; p++) {
      const w = (p / FLOCKE_PHASEN) * Math.PI * 2;
      g.setTransform(1, 0, 0, 1, p * FLOCKE_PX + m, form * FLOCKE_PX + m);
      g.rotate(w * 0.5);
      g.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(w))); // Taumeln: kippt weg und wieder zurück
      g.beginPath();
      punkte.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
      g.closePath();
      g.fillStyle = `rgb(${14 + form * 3}, ${11 + form * 2}, ${10 + form})`;
      g.fill();
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  flockenBild = c;
  return c;
}

/** @returns {number} */
export function funkenAnzahl() { return liste.length; }

/** Löscht alles (neue Welt). */
export function funkenZuruecksetzen() { liste.length = 0; }
