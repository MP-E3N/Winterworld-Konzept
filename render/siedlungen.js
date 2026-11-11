// @ts-check
/**
 * siedlungen.js — Die Heimatsiedlung in der Welt: Platz, Hütten, Depot-Schuppen, Wärmeofen, Windschutz (M4d).
 *
 * ZWECK:    Zeichnet jede Siedlung aus data/siedlungen.js. Nah: Hütten aus dunklem Holz mit
 *           Schneedach und Ofenrohr, Schuppen mit Blechdach und dem eigenen Depot davor (Kohle, Holz,
 *           Fässer, Kisten — so viel, wie eingelagert ist), runder Wärmeofen mit Glut. Fern: Messing-
 *           Zeichen mit Namen. Nachts leuchten Fenster und Ofen über der Dunkelheit (lichterZeichnen).
 *           KEIN Rauch aus den Hütten (Leistung, Spieltest-Lehre zu Rauch).
 * LIEST:    data/siedlungen.js, state.depots (eigenes Depot), Kamera, ansichtLicht.nacht
 * SCHREIBT: nichts (nur zeichnen)
 * REGEL:    LEISTUNG — nur zeichnen, was im Bild liegt; ein vorgerendertes Glühbild statt Verläufen je Fenster.
 * DEBUG:    Gebäude liegen falsch? Gleiche Maße prüft die Kollision (sim/siedlung.js gebaeudeAn).
 */

import { kamera, weltZuBild, bildZuWelt } from './kamera.js';
import { SIEDLUNGEN } from '../data/siedlungen.js';
import { depotVon } from '../sim/siedlung.js';

/** @typedef {import('../data/siedlungen.js').Gebaeude} Gebaeude */

/** Schatten fällt nach Südosten (feste Sonne im Nordwesten, wie beim Koloss), m. */
const SCHATTEN = { x: 1.6, y: 1.9 };
/** Unter diesem Zoom (px/m) nur noch das Zeichen mit Namen. */
const FERN_ZOOM = 0.7;

/**
 * Ansichtszustand (nur Darstellung): Über welchem Depot-Schuppen steht die Maus (eingabe/maus.js),
 * welches Depot-Fenster ist offen (ui/depot.js)? Beide bekommen einen Messingrahmen. −1 = keins.
 */
export const siedlungAnsicht = { hover: -1, markiert: -1 };
/** Klickfläche um den Schuppen (m) — die Waren davor gehören dazu. */
const DEPOT_KLICK_RAND_M = 3;

/**
 * Liegt der Bildpunkt auf einem Depot-Schuppen (samt Waren davor)?
 * @param {number} bx @param {number} by
 * @returns {number}  Siedlungs-ID oder −1
 */
export function depotUnter(bx, by) {
  const [wx, wy] = bildZuWelt(bx, by);
  for (let i = 0; i < SIEDLUNGEN.length; i++) {
    const s = SIEDLUNGEN[i], g = s.gebaeude.find((x) => x.art === 'depot');
    if (!g) continue;
    const dx = wx - s.x - g.dx, dy = wy - s.y - g.dy;
    // Nach Norden (vorn) reicht die Fläche über die Waren vor dem Schuppen.
    if (Math.abs(dx) <= g.b / 2 + DEPOT_KLICK_RAND_M && dy <= g.t / 2 + DEPOT_KLICK_RAND_M && dy >= -g.t / 2 - 6) return i;
  }
  return -1;
}

/** Feste Pseudo-Zufallszahl 0 … 1 (kein Flimmern). @param {number} n @returns {number} */
function hash(n) {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Alle Siedlungen (nach den Spuren, vor den Fundstellen).
 * @param {CanvasRenderingContext2D} ctx @param {import('../sim/types.js').Zustand} s @param {number} spieler
 */
export function siedlungenZeichnen(ctx, s, spieler) {
  const z = kamera.zoom;
  SIEDLUNGEN.forEach((sd, id) => {
    const [bx, by] = weltZuBild(sd.x, sd.y);
    const r = 90 * z;
    if (bx < -r - 80 || by < -r - 40 || bx > kamera.breite + r + 80 || by > kamera.hoehe + r + 40) return;
    if (z < FERN_ZOOM) { zeichen(ctx, bx, by, sd.name); return; }
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(z, z);
    platz(ctx, sd.gebaeude);
    for (const g of sd.gebaeude) schatten(ctx, g);
    for (const g of sd.gebaeude) gebaeude(ctx, g);
    laternen(ctx);
    const d = depotVon(s, id, spieler);
    const schuppen = sd.gebaeude.find((g) => g.art === 'depot');
    if (d && schuppen) depotWaren(ctx, schuppen, d);
    if (schuppen && (siedlungAnsicht.hover === id || siedlungAnsicht.markiert === id)) rahmen(ctx, schuppen, z);
    ctx.restore();
    if (z < 6) namensschild(ctx, bx, by + 52 * z, sd.name);
  });
}

// ── Boden und Gebäude ──

/**
 * Festgetretener Platz: grauer, rußiger Schnee, Trampelpfade vom Ofen zu den Türen und zum Parkplatz.
 * @param {CanvasRenderingContext2D} ctx @param {readonly Gebaeude[]} gebaeude
 */
function platz(ctx, gebaeude) {
  const g = ctx.createRadialGradient(0, 10, 6, 0, 10, 58);
  g.addColorStop(0, 'rgba(105, 108, 110, 0.55)');
  g.addColorStop(0.55, 'rgba(130, 136, 142, 0.38)');
  g.addColorStop(1, 'rgba(170, 178, 186, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 10, 58, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(95, 98, 100, 0.16)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  const ofenG = gebaeude.find((x) => x.art === 'ofen');
  if (!ofenG) return;
  for (const h of gebaeude) {
    if (h.art !== 'huette' && h.art !== 'depot') continue;
    ctx.beginPath(); ctx.moveTo(ofenG.dx, ofenG.dy); ctx.lineTo(h.dx, h.dy - h.t / 2 - 1); ctx.stroke();
  }
  ctx.lineWidth = 4; // breiter Weg zum Koloss
  ctx.beginPath(); ctx.moveTo(ofenG.dx, ofenG.dy); ctx.lineTo(0, -50); ctx.stroke();
}

/** Laternenpfähle um den Ofen (m, relativ zur Siedlungsmitte) — nachts leuchten sie. */
export const LATERNEN = [[-12, -6], [12, -6], [-14, 14], [14, 14], [0, -30]];

/** @param {CanvasRenderingContext2D} ctx */
function laternen(ctx) {
  for (const [x, y] of LATERNEN) {
    ctx.fillStyle = 'rgba(40, 55, 75, 0.3)'; ctx.fillRect(x, y, 2.2, 0.35); // langer Schatten
    ctx.fillStyle = '#2a2b2e'; ctx.beginPath(); ctx.arc(x, y, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0a84c'; ctx.beginPath(); ctx.arc(x, y, 0.22, 0, Math.PI * 2); ctx.fill();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function schatten(ctx, g) {
  ctx.fillStyle = 'rgba(40, 55, 75, 0.28)';
  ctx.fillRect(g.dx - g.b / 2 + SCHATTEN.x, g.dy - g.t / 2 + SCHATTEN.y, g.b, g.t);
}

/** @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function gebaeude(ctx, g) {
  if (g.art === 'huette') huette(ctx, g);
  else if (g.art === 'depot') schuppen(ctx, g);
  else if (g.art === 'ofen') ofen(ctx, g);
  else wand(ctx, g);
}

/** Hütte: Holzwände, Satteldach mit Schnee (First längs), Ofenrohr. @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function huette(ctx, g) {
  const x = g.dx - g.b / 2, y = g.dy - g.t / 2, n = g.dx * 7 + g.dy * 13;
  // Holzstapel an der Ostwand, Tür mit Vordach an der Nordseite (zum Platz).
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? '#6e4522' : '#80522a';
    ctx.fillRect(x + g.b + 0.5, y + 1 + i * 0.7, 1.1, 0.6);
  }
  ctx.fillStyle = '#2a1d12';
  ctx.fillRect(g.dx - 1, y - 1.2, 2, 1.3);
  ctx.fillStyle = '#3a281a';
  ctx.fillRect(x - 0.6, y - 0.6, g.b + 1.2, g.t + 1.2); // Dachüberstand, dunkle Traufe
  // Zwei Dachhälften: Nordseite heller (Licht von NW), Südseite im Schatten; Schnee am Rand dünner.
  ctx.fillStyle = '#dde4ea';
  ctx.fillRect(x, y, g.b, g.t / 2);
  ctx.fillStyle = '#a9b7c4';
  ctx.fillRect(x, g.dy, g.b, g.t / 2);
  ctx.fillStyle = 'rgba(90, 64, 44, 0.55)';
  ctx.fillRect(x, y, g.b, 0.45);
  ctx.fillRect(x, y + g.t - 0.45, g.b, 0.45);
  // First und ein paar dunkle Schindeln, wo der Schnee abgerutscht ist.
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(x, g.dy - 0.18, g.b, 0.36);
  for (let i = 0; i < 4; i++) {
    const h = hash(n + i);
    ctx.fillRect(x + h * (g.b - 1.6), y + g.t - 1.1 - hash(i + g.dx) * 0.8, 1.2 + h, 0.55);
  }
  // Ofenrohr mit etwas Glut
  const rx = g.dx + g.b * 0.28, ry = g.dy - g.t * 0.22;
  ctx.fillStyle = '#2a2b2e'; ctx.fillRect(rx - 0.45, ry - 0.45, 0.9, 0.9);
  ctx.fillStyle = 'rgba(255, 140, 50, 0.8)'; ctx.fillRect(rx - 0.2, ry - 0.2, 0.4, 0.4);
}

/** Depot-Schuppen: Blechdach in Bahnen, offene Front nach Norden. @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function schuppen(ctx, g) {
  const x = g.dx - g.b / 2, y = g.dy - g.t / 2;
  ctx.fillStyle = '#2f3236';
  ctx.fillRect(x - 0.3, y - 0.3, g.b + 0.6, g.t + 0.6);
  for (let i = 0; i < g.b; i += 1.5) {
    ctx.fillStyle = i % 3 === 0 ? '#6b7178' : '#5b6168';
    ctx.fillRect(x + i, y, 1.5, g.t);
  }
  // Schnee auf der hinteren Dachhälfte, Rost an den Kanten
  ctx.fillStyle = 'rgba(238, 243, 247, 0.85)';
  ctx.fillRect(x, g.dy, g.b, g.t / 2 - 0.4);
  ctx.fillStyle = '#7a4a28';
  ctx.fillRect(x, y, g.b, 0.35);
  // Messingschild über der Öffnung
  ctx.fillStyle = '#c08f3e';
  ctx.fillRect(g.dx - 2, y - 0.9, 4, 0.7);
}

/** Wärmeofen: eiserner Rundofen mit Messingring und Glut, Bänke drumherum. @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function ofen(ctx, g) {
  const r = g.b / 2;
  ctx.fillStyle = '#5a4030';
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2 + 0.3;
    ctx.save(); ctx.translate(g.dx + Math.cos(w) * (r + 3), g.dy + Math.sin(w) * (r + 3)); ctx.rotate(w + Math.PI / 2);
    ctx.fillRect(-1.3, -0.35, 2.6, 0.7); ctx.restore();
  }
  ctx.fillStyle = '#26282b'; ctx.beginPath(); ctx.arc(g.dx, g.dy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c08f3e'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(g.dx, g.dy, r - 0.4, 0, Math.PI * 2); ctx.stroke();
  const glut = ctx.createRadialGradient(g.dx, g.dy, 0, g.dx, g.dy, r * 0.7);
  glut.addColorStop(0, '#ffd27a'); glut.addColorStop(0.5, '#f07a28'); glut.addColorStop(1, 'rgba(120, 30, 10, 0.9)');
  ctx.fillStyle = glut; ctx.beginPath(); ctx.arc(g.dx, g.dy, r * 0.7, 0, Math.PI * 2); ctx.fill();
}

/** Windschutz: Palisade aus Pfählen. @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g */
function wand(ctx, g) {
  const laengs = g.b >= g.t, n = Math.round((laengs ? g.b : g.t) / 1.1);
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(g.dx - g.b / 2, g.dy - g.t / 2, g.b, g.t);
  ctx.fillStyle = '#6a4c33';
  for (let i = 0; i < n; i++) {
    const a = -0.5 + (i + 0.5) / n;
    const px = laengs ? g.dx + a * g.b : g.dx, py = laengs ? g.dy : g.dy + a * g.t;
    ctx.beginPath(); ctx.arc(px, py, 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(240, 245, 248, 0.7)'; // Schnee an der Wetterseite (Norden/Westen)
  ctx.fillRect(g.dx - g.b / 2, g.dy - g.t / 2, laengs ? g.b : 0.6, laengs ? 0.6 : g.t);
}

/**
 * Das eigene Depot vor dem Schuppen: Kohlehaufen, Holzstapel, Fässer, Kisten — Größe nach Menge.
 * @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g @param {import('../sim/types.js').Depot} d
 */
function depotWaren(ctx, g, d) {
  const vorn = g.dy - g.t / 2 - 3.2;
  /** @param {number} kg @param {number} voll @returns {number} 0 … 1 */
  const anteil = (kg, voll) => Math.min(1, Math.sqrt(kg / voll));
  if (d.kohle > 0) {
    const r = 1 + 3.2 * anteil(d.kohle, 60000);
    ctx.fillStyle = '#1e2023'; ctx.beginPath(); ctx.ellipse(g.dx - 4.5, vorn, r * 1.2, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.ellipse(g.dx - 4.9, vorn - r * 0.3, r * 0.5, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (d.holz > 0) {
    const n = 1 + Math.round(5 * anteil(d.holz, 30000));
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#7a4f26' : '#8a5a2b';
      ctx.fillRect(g.dx - 0.2, vorn - 1.6 + i * 0.55, 3.4, 0.5);
    }
  }
  if (d.oel > 0) {
    const n = 1 + Math.round(4 * anteil(d.oel, 10000));
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#7a2a1a'; ctx.beginPath(); ctx.arc(g.dx + 4.4 + (i % 3) * 0.95, vorn - 0.9 + Math.floor(i / 3) * 0.95, 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (d.nahrung > 0) {
    const n = 1 + Math.round(4 * anteil(d.nahrung, 5000));
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#b89c62' : '#a68a52';
      ctx.fillRect(g.dx + 4.2 + (i % 3) * 1.0, vorn + 0.6 + Math.floor(i / 3) * 1.0, 0.9, 0.9);
    }
  }
}

/**
 * Messingrahmen um Schuppen + Warenplatz: „hier anklicken“ bzw. „dieses Depot ist offen“.
 * @param {CanvasRenderingContext2D} ctx @param {Gebaeude} g @param {number} z  Zoom (für 2 px Linienbreite)
 */
function rahmen(ctx, g, z) {
  ctx.strokeStyle = '#f0d48e';
  ctx.lineWidth = 2 / z;
  ctx.setLineDash([6 / z, 4 / z]);
  ctx.strokeRect(g.dx - g.b / 2 - DEPOT_KLICK_RAND_M, g.dy - g.t / 2 - 6, g.b + 2 * DEPOT_KLICK_RAND_M, g.t + 6 + DEPOT_KLICK_RAND_M);
  ctx.setLineDash([]);
}

// ── Fern und Schrift ──

/** Fern: Messing-Zeichen (Haus im Ring) mit Namen. @param {CanvasRenderingContext2D} ctx @param {number} bx @param {number} by @param {string} name */
function zeichen(ctx, bx, by, name) {
  ctx.fillStyle = 'rgba(20, 24, 28, 0.75)';
  ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c08f3e'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#f0d48e';
  ctx.beginPath(); ctx.moveTo(bx - 5, by + 4); ctx.lineTo(bx - 5, by - 1); ctx.lineTo(bx, by - 5); ctx.lineTo(bx + 5, by - 1); ctx.lineTo(bx + 5, by + 4); ctx.closePath(); ctx.fill();
  namensschild(ctx, bx, by + 22, name);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} bx @param {number} by @param {string} name */
function namensschild(ctx, bx, by, name) {
  ctx.font = '600 13px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20, 24, 28, 0.6)';
  ctx.fillText(name, bx + 1, by + 1);
  ctx.fillStyle = '#f0d48e';
  ctx.fillText(name, bx, by);
}
