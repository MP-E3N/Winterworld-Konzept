// @ts-check
/**
 * koloss.js — Zeichnet einen Dampfkoloss von oben.
 *
 * ZWECK:    Nah: detaillierte Zeichnung (Schatten, Räder, Fahrgestell, Rumpf, Kessel, Aufbau mit
 *           Scheinwerfern). Fern: kleines Symbol, damit man ihn auf der Weltkarte findet.
 * LIEST:    Rumpflage (Meter, Bogenmaß), Kamera, render/koloss-mass.js, data/ansicht.js
 * SCHREIBT: nur das Canvas
 * REGEL:    KONZEPT.md §6 („Grafik am Anfang: alles per Code gezeichnet“)
 * DEBUG:    Gezeichnet wird um die RUMPFmitte (rumpfLage() aus der Lage des Drehpunkts). Alles in
 *           Metern im Rumpf-System: +x = vorne, +y = rechts. Länge 40, Breite 9 (+ Mittelteil).
 */

import { kamera, weltZuBild } from './kamera.js';
import { FARBEN_KOLOSS as F, KOLOSS_SYMBOL_AB_PX, SCHATTEN_PRO_HOEHE, RAD_DURCHMESSER_M, RAD_EINSCHLAG_MAX,
  RAD_BREITE_M, LENKRAD_BREITE_M, TRAKTION_UEBERSTAND_M, MITTE_BREITER_M, TRAKTION_DURCHMESSER_M } from '../data/ansicht.js';
import { rundRechteck } from './formen.js';
import { L, B, RAD_X, TRAKTION, EINSCHLAG, MITTE_VON, MITTE_BIS, SCHORNSTEIN_X, DOM_X, NEBEN_SCHORNSTEINE,
  rumpfPunkt } from './koloss-mass.js';
import { fahrgestell, rumpf, kessel, aufbau, feuerGlut } from './koloss-aufbau.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, h: number}} lage  RUMPFmitte (render/koloss-mass.js rumpfLage)
 * @param {number} weg     gefahrene Meter (für die Raddrehung)
 * @param {boolean} eigener  eigener Koloss (anderes Symbol in der Ferne)
 * @param {number} lenk     Radeinschlag (Bogenmaß, aus radEinschlagAktualisieren)
 * @param {boolean} licht   Scheinwerfer an
 * @param {number} last     0 … 1, wie hart die Maschine arbeitet (Feuerschein in den Schornsteinen)
 */
export function kolossZeichnen(ctx, lage, weg, eigener, lenk, licht, last) {
  const [bx, by] = weltZuBild(lage.x, lage.y);
  if (L * kamera.zoom < KOLOSS_SYMBOL_AB_PX) { symbolZeichnen(ctx, bx, by, lage.h, eigener); return; }
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(lage.h);
  ctx.scale(kamera.zoom, kamera.zoom);
  schatten(ctx, lage.h);
  // WARUM zwei Durchgänge: die Traktionsräder liegen außen neben dem Fahrgestell, die Lenkräder
  // reichen weit darunter — sie liegen über dem schwarzen Gestell, aber unter dem grünen Rumpf.
  raeder(ctx, weg, lenk, true);
  fahrgestell(ctx);
  raeder(ctx, weg, lenk, false);
  rumpf(ctx);
  kessel(ctx, last);
  aufbau(ctx, licht, last);
  ctx.restore();
}

/**
 * Feuerschein der Schornsteine ÜBER dem Rauch (nach rauchZeichnen aufrufen). WARUM: Der eigene
 * Rauch quillt genau aus dem Schornstein und deckte den Schein im Inneren fast ganz zu (Spieltest
 * M2b). Ein heller Kern und ein warmer Hof leuchten jetzt durch den Qualm — je mehr Last, desto mehr.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, h: number}} lage  Rumpfmitte
 * @param {number} last  0 … 1
 */
export function feuerscheinZeichnen(ctx, lage, last) {
  if (L * kamera.zoom < KOLOSS_SYMBOL_AB_PX) return;
  const glut = feuerGlut(last);
  const quellen = [{ x: SCHORNSTEIN_X, y: 0, r: 1.05, glut }];
  for (const n of NEBEN_SCHORNSTEINE) quellen.push({ x: n.x, y: n.y, r: n.r * 0.62, glut: glut * 0.7 });
  for (const q of quellen) {
    const [wx, wy] = rumpfPunkt(lage, q.x, q.y);
    const [bx, by] = weltZuBild(wx, wy);
    const hof = q.r * 3 * kamera.zoom, kern = q.r * 0.75 * kamera.zoom;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, hof);
    g.addColorStop(0, `rgba(255, 190, 90, ${0.6 * q.glut})`);
    g.addColorStop(0.4, `rgba(255, 120, 30, ${0.3 * q.glut})`);
    g.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, hof, 0, Math.PI * 2); ctx.fill();
    const c = ctx.createRadialGradient(bx, by, 0, bx, by, kern);
    c.addColorStop(0, `rgba(255, 250, 225, ${q.glut})`);
    c.addColorStop(0.5, `rgba(255, 205, 100, ${0.8 * q.glut})`);
    c.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(bx, by, kern, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Position des Schornsteins in Weltmetern (für den Rauch).
 * @param {{x: number, y: number, h: number}} lage  Rumpfmitte
 * @returns {[number, number]}
 */
export function schornsteinPos(lage) {
  return rumpfPunkt(lage, SCHORNSTEIN_X, 0);
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
  const bm = B + 2 * MITTE_BREITER_M;
  rundRechteck(ctx, MITTE_VON + rx, -bm / 2 + ry, MITTE_BIS - MITTE_VON, bm, 1.5);
  ctx.fill();
  // Schornstein (≈ 13 m, Spieltest M2b: höher und dicker): Säule → Streifen vom Fuß bis zur Spitze.
  const [sx, sy] = versatz(13);
  ctx.strokeStyle = F.schatten;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.9;
  ctx.beginPath(); ctx.moveTo(SCHORNSTEIN_X, 0); ctx.lineTo(SCHORNSTEIN_X + sx, sy); ctx.stroke();
  // Kleiner Schornstein (≈ 8 m)
  const [kx, ky] = versatz(8);
  for (const n of NEBEN_SCHORNSTEINE) {
    ctx.lineWidth = n.r * 2.4;
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x + kx, n.y + ky); ctx.stroke();
  }
  // Dampfdom (≈ 6 m)
  const [dx, dy] = versatz(6);
  ctx.beginPath(); ctx.arc(DOM_X + dx, dy, 1.3, 0, Math.PI * 2); ctx.fill();
}

/**
 * Radpaare einer Sorte. Von oben sieht man die Lauffläche: rot mit dunklen Querrillen.
 * Die Rillen laufen GENAU mit dem gefahrenen Weg mit (1 m Fahrt = 1 m Rillenweg), dadurch passt
 * die Raddrehung immer zum Tempo (Spieltest 3).
 * Traktionsräder: zwei große, ungelenkt, breit nach AUSSEN über den Rumpf, am Mittelteil.
 * Lenkräder: Spieltest M2b nach INNEN viel breiter (LENKRAD_BREITE_M), Außenkante bleibt.
 * Allradlenkung um den Drehpunkt: vorne mit der Kurve, hinten dagegen (siehe EINSCHLAG).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} weg
 * @param {number} lenk  Radeinschlag des vordersten Radsatzes (Bogenmaß, + = rechts)
 * @param {boolean} traktion  true = nur Traktionsräder, false = nur Lenkräder
 */
function raeder(ctx, weg, lenk, traktion) {
  const durchmesser = traktion ? TRAKTION_DURCHMESSER_M : RAD_DURCHMESSER_M, rille = 0.7;
  const versatz = ((weg % rille) + rille) % rille;
  const breite = traktion ? RAD_BREITE_M + TRAKTION_UEBERSTAND_M : LENKRAD_BREITE_M;
  // Mitte quer: Traktionsrad innen an der Mittelteil-Kante; Lenkrad außen bündig mit dem Rumpf.
  const quer = traktion ? B / 2 - RAD_BREITE_M + MITTE_BREITER_M + breite / 2 : B / 2 - breite / 2;
  for (let i = 0; i < RAD_X.length; i++) {
    if (TRAKTION[i] !== traktion) continue;
    for (const seite of [-1, 1]) {
      ctx.save();
      ctx.translate(RAD_X[i], seite * quer);
      ctx.rotate(lenk * EINSCHLAG[i]);
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
      // Doppelte Lauffläche: dunkle Mittelrille längs + Nabenring.
      ctx.fillStyle = 'rgba(25, 8, 6, 0.75)';
      ctx.fillRect(-durchmesser / 2, -0.09, durchmesser, 0.18);
      ctx.strokeStyle = F.kupfer; ctx.lineWidth = 0.14;
      ctx.strokeRect(-0.35, -breite / 2 + 0.12, 0.7, breite - 0.24);
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
