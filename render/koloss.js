// @ts-check
/**
 * koloss.js — Zeichnet einen Dampfkoloss von oben.
 *
 * ZWECK:    Nah: detaillierte Zeichnung (grüner Rumpf, schwarze Kessel, Kupferrohre, rote Räder,
 *           Schornstein). Fern: kleines Symbol, damit man ihn auf der Weltkarte findet.
 * LIEST:    Lage (Meter, Bogenmaß), Kamera, data/ansicht.js, data/koloss.js
 * SCHREIBT: nur das Canvas
 * REGEL:    KONZEPT.md §6 („Grafik am Anfang: alles per Code gezeichnet“)
 * DEBUG:    Zeichnung kaputt? Alles läuft in Metern im Fahrzeug-Koordinatensystem:
 *           +x = vorne, +y = rechts, Mitte = (0, 0). Länge 32, Breite 9.
 */

import { kamera, weltZuBild } from './kamera.js';
import { FARBEN_KOLOSS as F, KOLOSS_SYMBOL_AB_PX, SCHATTEN_PRO_HOEHE, RAD_DURCHMESSER_M, RAD_EINSCHLAG_MAX,
  RAD_BREITE_M, TRAKTION_UEBERSTAND_M } from '../data/ansicht.js';
import { KOLOSS_LAENGE_M, KOLOSS_BREITE_M } from '../data/koloss.js';

const L = KOLOSS_LAENGE_M;
const B = KOLOSS_BREITE_M;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, h: number}} lage
 * @param {number} weg     gefahrene Meter (für die Raddrehung)
 * @param {boolean} eigener  eigener Koloss (anderes Symbol in der Ferne)
 * @param {number} lenk     Radeinschlag (Bogenmaß, aus radEinschlagAktualisieren)
 */
export function kolossZeichnen(ctx, lage, weg, eigener, lenk) {
  const [bx, by] = weltZuBild(lage.x, lage.y);
  if (L * kamera.zoom < KOLOSS_SYMBOL_AB_PX) { symbolZeichnen(ctx, bx, by, lage.h, eigener); return; }
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(lage.h);
  ctx.scale(kamera.zoom, kamera.zoom);
  schatten(ctx, lage.h);
  raeder(ctx, weg, lenk);
  rahmen(ctx);
  kessel(ctx);
  aufbau(ctx);
  ctx.restore();
}

/**
 * Position des Schornsteins in Weltmetern (für den Rauch).
 * @param {{x: number, y: number, h: number}} lage
 * @returns {[number, number]}
 */
export function schornsteinPos(lage) {
  const vor = 2; // Meter vor der Mitte
  return [lage.x + Math.cos(lage.h) * vor, lage.y + Math.sin(lage.h) * vor];
}

// ── Teile (alle in Fahrzeugmetern) ────────────────────────

/**
 * Schatten bei fester Sonne. Gezeichnet wird im Fahrzeug-Koordinatensystem, deshalb wird der
 * Welt-Versatz um −h zurückgedreht — so fällt der Schatten immer nach Südosten, egal wohin der
 * Koloss fährt. Hohe Teile (Schornstein, Dom) werfen längere Schatten.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} h  Fahrtrichtung (Bogenmaß)
 */
function schatten(ctx, h) {
  const c = Math.cos(h), s = Math.sin(h);
  /** @param {number} hoehe @returns {[number, number]} lokaler Versatz für diese Höhe */
  const versatz = (hoehe) => {
    const wx = SCHATTEN_PRO_HOEHE.x * hoehe, wy = SCHATTEN_PRO_HOEHE.y * hoehe;
    return [wx * c + wy * s, -wx * s + wy * c];
  };
  ctx.fillStyle = F.schatten;
  // Rumpf (≈ 4 m hoch): eine Fläche zwischen Fuß und versetzter Oberkante.
  const [rx, ry] = versatz(4);
  rundRechteck(ctx, -L / 2 + rx * 0.5, -B / 2 + ry * 0.5, L, B, 2);
  ctx.fill();
  rundRechteck(ctx, -L / 2 + rx, -B / 2 + ry, L, B, 2);
  ctx.fill();
  // Schornstein (≈ 9 m): Säule → Streifen vom Fuß bis zur Spitze.
  const [sx, sy] = versatz(9);
  ctx.strokeStyle = F.schatten;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.0;
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2 + sx, sy); ctx.stroke();
  // Dampfdom (≈ 6 m)
  const [dx, dy] = versatz(6);
  ctx.beginPath(); ctx.arc(6.6 + dx, dy, 1.3, 0, Math.PI * 2); ctx.fill();
}

/**
 * Sieben Radpaare. Von oben sieht man die Lauffläche: rot mit dunklen Querrillen.
 * Die Rillen laufen GENAU mit dem gefahrenen Weg mit (1 m Fahrt = 1 m Rillenweg), dadurch passt
 * die Raddrehung immer zum Tempo (Spieltest 3; vorher liefen sie viel zu langsam).
 * Allradlenkung: Die zwei vorderen Radsätze schwenken in die Kurve, die zwei hinteren gegen —
 * so wie bei langen Schwerlastfahrzeugen. Die drei mittleren bleiben gerade.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} weg
 * @param {number} lenk  Radeinschlag vorne (Bogenmaß, + = rechts)
 */
function raeder(ctx, weg, lenk) {
  const durchmesser = RAD_DURCHMESSER_M, rille = 0.7;
  /** Einschlag je Radsatz (Index 0 = hinten): hinten gegen, vorne mit der Kurve. */
  const einschlag = [-1, -0.55, 0, 0, 0, 0.55, 1];
  const versatz = ((weg % rille) + rille) % rille;
  for (let i = 0; i < 7; i++) {
    const mx = -12.5 + i * 3.9;
    // Die drei mittleren Radsätze sind die Antriebs-(Traktions-)räder: viel breiter, und zwar
    // nach AUSSEN über den Rumpf hinaus (Spieltest 4). Innenkante bleibt, wo sie war.
    const traktion = einschlag[i] === 0;
    const breite = traktion ? RAD_BREITE_M + TRAKTION_UEBERSTAND_M : RAD_BREITE_M;
    for (const seite of [-1, 1]) {
      const my = seite * (B / 2 - RAD_BREITE_M + breite / 2);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(lenk * einschlag[i]);
      ctx.fillStyle = F.schwarz;
      rundRechteck(ctx, -durchmesser / 2 - 0.1, -breite / 2 - 0.1, durchmesser + 0.2, breite + 0.2, 0.3);
      ctx.fill();
      ctx.fillStyle = F.rot;
      rundRechteck(ctx, -durchmesser / 2, -breite / 2, durchmesser, breite, 0.25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 10, 8, 0.6)';
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      for (let x = -durchmesser / 2 + versatz; x < durchmesser / 2; x += rille) {
        ctx.moveTo(x, -breite / 2); ctx.lineTo(x, breite / 2);
      }
      ctx.stroke();
      if (traktion) {
        // Doppelte Lauffläche: dunkle Mittelrille längs + Nabenring.
        ctx.fillStyle = 'rgba(25, 8, 6, 0.75)';
        ctx.fillRect(-durchmesser / 2, -0.09, durchmesser, 0.18);
        ctx.strokeStyle = F.kupfer; ctx.lineWidth = 0.14;
        ctx.strokeRect(-0.35, -breite / 2 + 0.12, 0.7, breite - 0.24);
      }
      ctx.restore();
    }
  }
}

/** Geglätteter Radeinschlag je Koloss-ID (nur Optik, Bogenmaß). @type {number[]} */
const radEinschlag = [];

/**
 * Nähert den gezeichneten Radeinschlag weich dem Lenkwunsch an (Räder schwenken nicht ruckartig).
 * @param {number} id
 * @param {number} lenkung  −100 … 100 (aus dem Zustand)
 * @param {number} dtMs
 * @returns {number} Einschlag (Bogenmaß)
 */
export function radEinschlagAktualisieren(id, lenkung, dtMs) {
  const ziel = (lenkung / 100) * RAD_EINSCHLAG_MAX;
  const alt = radEinschlag[id] ?? 0;
  const neu = alt + (ziel - alt) * (1 - Math.exp(-dtMs / 180));
  radEinschlag[id] = neu;
  return neu;
}

/** @param {CanvasRenderingContext2D} ctx */
function rahmen(ctx) {
  // Fahrgestell
  ctx.fillStyle = F.schwarz;
  rundRechteck(ctx, -L / 2, -B / 2 + 0.9, L - 1.5, B - 1.8, 0.8);
  ctx.fill();
  // Schneepflug vorne (Keil)
  ctx.fillStyle = F.grau;
  ctx.beginPath();
  ctx.moveTo(L / 2 - 2.2, -B / 2 + 0.4);
  ctx.lineTo(L / 2 + 0.8, -0.6);
  ctx.lineTo(L / 2 + 0.8, 0.6);
  ctx.lineTo(L / 2 - 2.2, B / 2 - 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = F.schwarz;
  ctx.lineWidth = 0.2;
  ctx.stroke();
  // Grüner Rumpf
  const g = ctx.createLinearGradient(0, -B / 2, 0, B / 2);
  g.addColorStop(0, F.gruenHell);
  g.addColorStop(0.45, F.gruen);
  g.addColorStop(1, F.gruenDunkel);
  ctx.fillStyle = g;
  rundRechteck(ctx, -L / 2 + 0.5, -B / 2 + 1.2, L - 3, B - 2.4, 1.2);
  ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx */
function kessel(ctx) {
  // Zwei schwarze Druckkessel hinten, längs, mit Kupferbändern.
  for (const y of [-1.65, 1.65]) {
    zylinder(ctx, -14, y, 12, 2.9, '#0d0f10', '#4a5157');
    ctx.fillStyle = F.kupfer;
    for (let x = -13; x < -2.5; x += 2.2) ctx.fillRect(x, y - 1.45, 0.35, 2.9);
  }
  // Langer grüner Hauptkessel vorne.
  zylinder(ctx, -1.5, 0, 14, 3.6, F.gruenDunkel, F.gruenHell);
  ctx.fillStyle = F.schwarz;
  for (const x of [1, 5, 9.5]) ctx.fillRect(x, -1.8, 0.3, 3.6);
  // Dampfdom
  kreis(ctx, 6.6, 0, 1.3, F.gruenDunkel);
  kreis(ctx, 6.4, -0.25, 0.8, F.gruenHell);
  // Schornstein: Rand, Kupferring, schwarzes Loch.
  kreis(ctx, 2, 0, 1.6, F.schwarz);
  kreis(ctx, 2, 0, 1.25, F.kupfer);
  kreis(ctx, 2, 0, 0.95, '#050505');
}

/** @param {CanvasRenderingContext2D} ctx */
function aufbau(ctx) {
  // Führerhaus hinten
  ctx.fillStyle = F.gruenDunkel;
  rundRechteck(ctx, -L / 2 + 0.3, -B / 2 + 1.5, 2.8, B - 3, 0.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 140, 0.55)';
  ctx.fillRect(-L / 2 + 2.6, -1.6, 0.4, 3.2);
  // Kupferrohre an beiden Seiten
  ctx.strokeStyle = F.kupfer;
  ctx.lineWidth = 0.28;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-12, s * 3.3);
    ctx.lineTo(-2, s * 3.3);
    ctx.lineTo(-0.5, s * 2.3);
    ctx.lineTo(11, s * 2.3);
    ctx.stroke();
  }
  // Rote Akzente und Laternen vorne
  ctx.fillStyle = F.rot;
  ctx.fillRect(L / 2 - 3.6, -2.4, 0.5, 4.8);
  kreis(ctx, L / 2 - 2.3, -2.6, 0.35, '#f3d27a');
  kreis(ctx, L / 2 - 2.3, 2.6, 0.35, '#f3d27a');
}

// ── Grundformen ───────────────────────────────────────────

/**
 * Liegender Zylinder von oben: Rechteck mit Querverlauf hell in der Mitte.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x  hinteres Ende
 * @param {number} y  Mittellinie
 * @param {number} laenge @param {number} durchmesser
 * @param {string} dunkel @param {string} hell
 */
function zylinder(ctx, x, y, laenge, durchmesser, dunkel, hell) {
  const g = ctx.createLinearGradient(0, y - durchmesser / 2, 0, y + durchmesser / 2);
  g.addColorStop(0, dunkel);
  g.addColorStop(0.35, hell);
  g.addColorStop(1, dunkel);
  ctx.fillStyle = g;
  rundRechteck(ctx, x, y - durchmesser / 2, laenge, durchmesser, durchmesser / 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} r @param {string} farbe
 */
function kreis(ctx, x, y, r, farbe) {
  ctx.fillStyle = farbe;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} b @param {number} h @param {number} r
 */
function rundRechteck(ctx, x, y, b, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, b, h, r);
}

/**
 * Fernansicht: Pfeilspitze in Fahrtrichtung, eigener Koloss mit hellem Ring.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} bx @param {number} by @param {number} h @param {boolean} eigener
 */
function symbolZeichnen(ctx, bx, by, h, eigener) {
  ctx.save();
  ctx.translate(bx, by);
  if (eigener) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.rotate(h);
  ctx.fillStyle = F.gruen;
  ctx.strokeStyle = F.schwarz;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
