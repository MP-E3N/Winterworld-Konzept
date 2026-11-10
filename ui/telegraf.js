// @ts-check
/**
 * telegraf.js — Maschinentelegraf in der Anzeige (wie auf alten Dampfschiffen).
 *
 * ZWECK:    Ersetzt den Tempo-Regler (Spieltest M2b). Ein Hebel zeigt die befohlene Stellung
 *           (STOPP oben, VORAUS rechts, ZURÜCK links), der kleine kupferne Antwortzeiger innen zeigt,
 *           wie schnell der Koloss gerade wirklich fährt — stehen beide gleich, ist das Tempo erreicht.
 *           Klicken oder Ziehen auf der Skala stellt den Hebel um; W/S tun dasselbe.
 * LIEST:    Telegrafen-Stellung und Längstempo des eigenen Kolosses (von ui/anzeige.js übergeben)
 * SCHREIBT: nur das eigene Canvas; Klicks gehen als Rückruf an eingabe/tastatur.js telegrafSetzen()
 * REGEL:    data/koloss.js TELEGRAF
 * DEBUG:    Hebel springt falsch? stellungAusPunkt() prüfen (Winkel 0° = oben, im Uhrzeigersinn).
 */

import { TELEGRAF, TELEGRAF_STOPP } from '../data/koloss.js';
import { FARBEN_KOLOSS as F } from '../data/ansicht.js';

/** Zeichenfläche (CSS-Pixel) und Drehpunkt des Hebels. */
const B = 296, H = 168, MX = 148, MY = 120;
/** Radien: Innenfeld, Skalenring, Messingrand. */
const R_INNEN = 64, R_SKALA = 103, R_RAND = 112;
/** Winkelabstand zweier Stellungen (Grad). STOPP liegt oben bei 0°. */
const ABSTAND = 20;
/** Farben der Skala. */
const FARBE = {
  voraus: '#ece2c6', zurueck: '#8e2a1e', stopp: '#17191b', innen: '#22282d',
  schriftHell: '#f3ead2', schriftDunkel: '#1d150c', trenner: '#4a3416', gewaehlt: 'rgba(255, 210, 120, 0.55)',
};

/** Nur Optik: Hebel und Antwortzeiger laufen weich nach (Grad). */
const optik = { hebel: 0, antwort: 0 };

/**
 * Bereitet das Canvas vor (Schärfe) und hängt Klicken/Ziehen an.
 * @param {HTMLCanvasElement} c
 * @param {(stufe: number) => void} beiWahl  Rückruf mit der gewählten Stellung
 */
export function telegrafEinrichten(c, beiWahl) {
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
  c.style.width = B + 'px'; c.style.height = H + 'px';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).setTransform(dpr, 0, 0, dpr, 0, 0);
  let ziehen = false;
  /** @param {PointerEvent} ev */
  const waehlen = (ev) => {
    const stufe = stellungAusPunkt(ev.offsetX, ev.offsetY);
    if (stufe !== null) beiWahl(stufe);
  };
  c.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ziehen = true;
    c.setPointerCapture(ev.pointerId);
    waehlen(ev);
  });
  c.addEventListener('pointermove', (ev) => { if (ziehen) waehlen(ev); });
  c.addEventListener('pointerup', () => { ziehen = false; });
}

/**
 * Welche Stellung liegt unter diesem Punkt? Mitte (Nabe) zählt nicht.
 * @param {number} x @param {number} y  CSS-Pixel im Canvas
 * @returns {number | null}
 */
function stellungAusPunkt(x, y) {
  const dx = x - MX, dy = y - MY;
  if (Math.hypot(dx, dy) < 22) return null;
  const grad = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const stufe = Math.round(grad / ABSTAND) + TELEGRAF_STOPP;
  return Math.max(0, Math.min(TELEGRAF.length - 1, stufe));
}

/**
 * Winkel (Grad, 0 = oben, im Uhrzeigersinn) für ein Tempo — zwischen den Stellungen geteilt.
 * @param {number} kmh
 * @returns {number}
 */
function winkelFuerTempo(kmh) {
  const t = TELEGRAF;
  if (kmh <= t[0].kmh) return -TELEGRAF_STOPP * ABSTAND;
  for (let i = 0; i < t.length - 1; i++) {
    if (kmh <= t[i + 1].kmh) {
      const anteil = (kmh - t[i].kmh) / (t[i + 1].kmh - t[i].kmh);
      return (i + anteil - TELEGRAF_STOPP) * ABSTAND;
    }
  }
  return (t.length - 1 - TELEGRAF_STOPP) * ABSTAND;
}

/**
 * Zeichnet den Telegrafen.
 * @param {HTMLCanvasElement} c
 * @param {{stufe: number, kmh: number, dtMs: number}} w  kmh = echtes Längstempo (− = rückwärts)
 */
export function telegrafZeichnen(c, w) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const k = 1 - Math.exp(-w.dtMs / 90);
  optik.hebel += ((w.stufe - TELEGRAF_STOPP) * ABSTAND - optik.hebel) * k;
  optik.antwort += (winkelFuerTempo(w.kmh) - optik.antwort) * (1 - Math.exp(-w.dtMs / 200));
  ctx.clearRect(0, 0, B, H);
  gehaeuse(ctx);
  skala(ctx, w.stufe);
  bogenText(ctx, 'ZURÜCK', R_INNEN - 11, -ABSTAND * 2, 9, '#d98a74');
  bogenText(ctx, 'VORAUS', R_INNEN - 11, ABSTAND * 3, 9, '#e0c68c');
  antwortzeiger(ctx, optik.antwort);
  hebel(ctx, optik.hebel);
}

// ── Teile ─────────────────────────────────────────────────

/** Bogenmaß (Canvas) aus Grad (0 = oben). @param {number} grad */
function rad(grad) { return ((grad - 90) * Math.PI) / 180; }

/**
 * Fächerförmiges Gehäuse: Messingrand, dunkles Innenfeld.
 * @param {CanvasRenderingContext2D} ctx
 */
function gehaeuse(ctx) {
  const von = -(TELEGRAF_STOPP + 0.5) * ABSTAND - 3, bis = (TELEGRAF.length - TELEGRAF_STOPP - 0.5) * ABSTAND + 3;
  const g = ctx.createRadialGradient(MX - 30, MY - 60, 10, MX, MY, R_RAND + 6);
  g.addColorStop(0, '#f6dc9a'); g.addColorStop(0.55, '#c08f3e'); g.addColorStop(1, '#6b4416');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(MX, MY); ctx.arc(MX, MY, R_RAND, rad(von), rad(bis)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = FARBE.innen;
  ctx.beginPath(); ctx.moveTo(MX, MY); ctx.arc(MX, MY, R_SKALA + 1, rad(von + 3), rad(bis - 3)); ctx.closePath(); ctx.fill();
  // Nieten auf dem Rand
  for (let grad = von + 6; grad <= bis - 5; grad += 22) {
    const x = MX + Math.sin((grad * Math.PI) / 180) * (R_RAND - 3.5), y = MY - Math.cos((grad * Math.PI) / 180) * (R_RAND - 3.5);
    ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3d79a'; ctx.beginPath(); ctx.arc(x - 0.4, y - 0.4, 0.9, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Skalenring: ein Feld je Stellung mit dem Tempo (km/h), gewählte Stellung leuchtet.
 * @param {CanvasRenderingContext2D} ctx @param {number} gewaehlt
 */
function skala(ctx, gewaehlt) {
  for (let i = 0; i < TELEGRAF.length; i++) {
    const mitte = (i - TELEGRAF_STOPP) * ABSTAND;
    const t = TELEGRAF[i];
    const grund = t.kmh < 0 ? FARBE.zurueck : t.kmh === 0 ? FARBE.stopp : FARBE.voraus;
    ctx.beginPath();
    ctx.arc(MX, MY, R_SKALA, rad(mitte - ABSTAND / 2), rad(mitte + ABSTAND / 2));
    ctx.arc(MX, MY, R_INNEN, rad(mitte + ABSTAND / 2), rad(mitte - ABSTAND / 2), true);
    ctx.closePath();
    ctx.fillStyle = grund; ctx.fill();
    if (i === gewaehlt) { ctx.fillStyle = FARBE.gewaehlt; ctx.fill(); }
    ctx.strokeStyle = FARBE.trenner; ctx.lineWidth = 1; ctx.stroke();
    // Beschriftung quer zum Radius, oben lesbar
    ctx.save();
    ctx.translate(MX, MY);
    ctx.rotate((mitte * Math.PI) / 180);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = t.kmh > 0 ? FARBE.schriftDunkel : FARBE.schriftHell;
    if (t.kmh === 0) { ctx.font = 'bold 9px Georgia, serif'; ctx.fillText('STOPP', 0, -(R_INNEN + R_SKALA) / 2); }
    else { ctx.font = 'bold 13px Georgia, serif'; ctx.fillText(String(Math.abs(t.kmh)), 0, -(R_INNEN + R_SKALA) / 2); }
    ctx.restore();
  }
}

/**
 * Text entlang eines Bogens (Buchstabe für Buchstabe), mittig um einen Winkel.
 * @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} r
 * @param {number} mitteGrad @param {number} gradJeZeichen @param {string} farbe
 */
function bogenText(ctx, text, r, mitteGrad, gradJeZeichen, farbe) {
  ctx.save();
  ctx.fillStyle = farbe; ctx.font = 'bold 9px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const start = mitteGrad - ((text.length - 1) * gradJeZeichen) / 2;
  for (let i = 0; i < text.length; i++) {
    const grad = start + i * gradJeZeichen;
    ctx.save();
    ctx.translate(MX, MY);
    ctx.rotate((grad * Math.PI) / 180);
    ctx.fillText(text[i], 0, -r);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Kupferner Antwortzeiger am Innenrand der Skala: echtes Tempo.
 * @param {CanvasRenderingContext2D} ctx @param {number} grad
 */
function antwortzeiger(ctx, grad) {
  ctx.save();
  ctx.translate(MX, MY);
  ctx.rotate((grad * Math.PI) / 180);
  ctx.fillStyle = F.kupfer; ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -R_INNEN + 1); ctx.lineTo(-4, -R_INNEN + 11); ctx.lineTo(4, -R_INNEN + 11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/**
 * Hebel: dunkle Stange von der Nabe bis über den Rand, quer ein Messinggriff, hinten ein
 * Gegengewicht; Nabe aus Messing.
 * @param {CanvasRenderingContext2D} ctx @param {number} grad
 */
function hebel(ctx, grad) {
  ctx.save();
  ctx.translate(MX, MY);
  ctx.rotate((grad * Math.PI) / 180);
  // Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-2, -R_RAND + 2, 7, R_RAND + 16);
  // Stange
  const g = ctx.createLinearGradient(-4, 0, 4, 0);
  g.addColorStop(0, '#1b1e21'); g.addColorStop(0.45, '#6d757c'); g.addColorStop(1, '#1b1e21');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-3.5, -R_RAND + 4, 7, R_RAND + 14, 3); ctx.fill();
  // Griff quer am Ende
  const gg = ctx.createLinearGradient(0, -R_RAND - 4, 0, -R_RAND + 6);
  gg.addColorStop(0, '#fff1c4'); gg.addColorStop(0.5, '#d4a24f'); gg.addColorStop(1, '#6b4416');
  ctx.fillStyle = gg; ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-13, -R_RAND - 3, 26, 9, 4.5); ctx.fill(); ctx.stroke();
  // Zeigerspitze auf die Skala
  ctx.fillStyle = F.rot;
  ctx.beginPath(); ctx.moveTo(0, -R_SKALA + 3); ctx.lineTo(-3.5, -R_INNEN - 2); ctx.lineTo(3.5, -R_INNEN - 2); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Nabe
  const n = ctx.createRadialGradient(MX - 4, MY - 4, 1, MX, MY, 13);
  n.addColorStop(0, '#fff1c4'); n.addColorStop(0.5, '#c08f3e'); n.addColorStop(1, '#5a3a10');
  ctx.fillStyle = n;
  ctx.beginPath(); ctx.arc(MX, MY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#3b2a12'; ctx.beginPath(); ctx.arc(MX, MY, 2.5, 0, Math.PI * 2); ctx.fill();
}
