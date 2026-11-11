// @ts-check
/**
 * lager-blick.js — Blick von oben in den offenen Laderaum für das Lager-Popup (M4b).
 *
 * ZWECK:    Nutzerwunsch: „wie wenn man in das Fahrzeug reinschaut“. Der Rumpf steht LÄNGS (Bug oben,
 *           wie der Koloss), im Steampunk-Stil: dunkles Eisen, mattes Messing, gedeckte Farben.
 *           Vorn das Warenlager (Fächer Holz und Vorräte), hinten der Brennstoffbunker mit GETRENNTEN
 *           Fächern für Kohle, Holz und Öl. Jedes Fach füllt sich von hinten (unten) nach vorn — so
 *           hoch, wie die Ware vom Lager einnimmt. Kohle als Brocken, Holz als gestapelte Stämme mit
 *           Jahresringen, Öl als Fässer, Vorräte als Kisten und Säcke.
 * LIEST:    k.lager (über lagerMenge), data/fundstellen.js LAGER
 * SCHREIBT: nur das eigene Canvas
 * LEISTUNG: Spieltest M4b: Vorher wurde bei jedem verbrannten kg alles neu gemalt (beim Fahren fast
 *           jedes Bild, hunderte Kreise). Jetzt: Rumpf und Muster werden EINMAL vorgemalt; neu
 *           zusammengesetzt wird nur, wenn sich eine Menge um mindestens STUFE_KG ändert — und dann
 *           sind es nur ein paar drawImage-Aufrufe.
 * DEBUG:    Falsche Füllhöhe? fuellHoehe() — Höhe = kg / Lagergröße × Fachhöhe.
 */

import { lagerMenge } from '../sim/koloss/lager.js';
import { LAGER, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';

/** Zeichenfläche (CSS-Pixel). */
const B = 176, H = 300;
/** Erst ab so viel kg Änderung wird neu zusammengesetzt (sieht man ohnehin nicht feiner). */
const STUFE_KG = 100;
/** Ölfass: Reihenhöhe (Pixel) — Öl füllt in ganzen Fass-Reihen. */
const FASS_REIHE = 13;
/** Stammdicke und Kistenreihe (Pixel). */
const STAMM = 8, KISTE = 12;
/** Ganze Reihen je Ware: Holz, Öl und Vorräte zeigen nie halbe Stämme/Fässer/Kisten — und schon
 * wenig Ware füllt eine ganze Reihe, damit man sie erkennt (Spieltest M4b: „Holz muss erkennbar sein“). */
const REIHE = { holz: STAMM, oel: FASS_REIHE, nahrung: KISTE, kohle: 3 };

/**
 * Fächer: Lager, Ware, Rechteck (x, y = oben, b, h) und Schild.
 * WARUM Brennstoff hinten: Dort sitzt der Kessel; vorn (Bug) liegen die Waren.
 * @type {readonly {lager: number, ware: string, x: number, y: number, b: number, h: number, schild: string}[]}
 */
const FAECHER = [
  { lager: WARENLAGER, ware: 'holz', x: 16, y: 44, b: 70, h: 78, schild: 'HOLZ' },
  { lager: WARENLAGER, ware: 'nahrung', x: 90, y: 44, b: 70, h: 78, schild: 'VORRÄTE' },
  { lager: BRENNSTOFFLAGER, ware: 'kohle', x: 16, y: 152, b: 56, h: 128, schild: 'KOHLE' },
  { lager: BRENNSTOFFLAGER, ware: 'holz', x: 76, y: 152, b: 42, h: 128, schild: 'HOLZ' },
  { lager: BRENNSTOFFLAGER, ware: 'oel', x: 122, y: 152, b: 38, h: 128, schild: 'ÖL' },
];

/** Farben: gedeckt, Eisen und Messing (Nutzerwunsch: Steampunk, nicht so farbenfroh). */
const F = {
  eisenDunkel: '#1c1d1b', eisen: '#34362f', eisenHell: '#4a4c43', boden: '#24251f',
  messing: '#9c7c4a', messingHell: '#c9a96a', niete: '#7d6440', schrift: '#e2cc95',
};

/** Vorgemalter Rumpf ohne Ladung und je Fach das volle Muster. */
let grund = /** @type {HTMLCanvasElement | null} */ (null);
/** @type {HTMLCanvasElement[]} */
let muster = [];
/** Zuletzt gezeigte Mengen (gerundet) — nur bei Änderung neu zusammensetzen. */
let zuletzt = '';
let dpr = 1;

/**
 * Bereitet das Canvas vor (scharf auf hochauflösenden Bildschirmen).
 * @param {HTMLCanvasElement} c
 */
export function blickEinrichten(c) {
  dpr = window.devicePixelRatio || 1;
  c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
  c.style.width = B + 'px'; c.style.height = H + 'px';
  zuletzt = '';
}

/**
 * Setzt den Blick zusammen, wenn sich eine Menge sichtbar geändert hat.
 * @param {HTMLCanvasElement} c
 * @param {import('../sim/types.js').Koloss} k
 */
export function blickZeichnen(c, k) {
  const mengen = FAECHER.map((f) => lagerMenge(k, f.lager, f.ware));
  const schluessel = mengen.map((kg) => Math.ceil(kg / STUFE_KG)).join('|');
  if (schluessel === zuletzt) return;
  zuletzt = schluessel;
  if (!grund) vorbereiten();
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, B, H);
  ctx.drawImage(/** @type {HTMLCanvasElement} */ (grund), 0, 0, B, H);
  FAECHER.forEach((f, i) => {
    const h = fuellHoehe(f, mengen[i]);
    if (h <= 0) return;
    // Das Muster füllt das Fach von unten (Heck) nach oben (Bug).
    ctx.drawImage(muster[i], 0, (f.h - h) * dpr, f.b * dpr, h * dpr, f.x, f.y + f.h - h, f.b, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; // Schattenkante oben auf der Ladung
    ctx.fillRect(f.x, f.y + f.h - h, f.b, 1.5);
  });
  FAECHER.forEach((f) => schild(ctx, f.schild, f.x + f.b / 2, f.y + 6));
}

/**
 * Füllhöhe eines Fachs (Pixel): Anteil der Ware am ganzen Lager × Fachhöhe, aufgerundet auf ganze
 * Reihen (REIHE) — etwas Ware ist also immer mindestens eine Reihe.
 * @param {{lager: number, ware: string, h: number}} f @param {number} kg
 * @returns {number}
 */
function fuellHoehe(f, kg) {
  if (kg <= 0) return 0;
  const reihe = REIHE[/** @type {keyof typeof REIHE} */ (f.ware)];
  return Math.min(f.h, Math.ceil((f.h * kg) / LAGER[f.lager].kg / reihe) * reihe);
}

// ── Einmal vorgemalt ──

/** Malt Rumpf und Muster einmal (in Bildschirm-Auflösung). */
function vorbereiten() {
  grund = leinwand(B, H, rumpf);
  muster = FAECHER.map((f) => leinwand(f.b, f.h, (ctx) => MUSTER[f.ware](ctx, f.b, f.h)));
}

/**
 * Neue Leinwand in Bildschirm-Auflösung, bemalt von `malen`.
 * @param {number} b @param {number} h @param {(ctx: CanvasRenderingContext2D) => void} malen
 * @returns {HTMLCanvasElement}
 */
function leinwand(b, h, malen) {
  const c = document.createElement('canvas');
  c.width = Math.round(b * dpr); c.height = Math.round(h * dpr);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  malen(ctx);
  return c;
}

/** Rumpf von oben, Bug oben: Eisen, Messingkante, Nieten, Schotten, leere Fächer. @param {CanvasRenderingContext2D} ctx */
function rumpf(ctx) {
  ctx.fillStyle = F.eisenDunkel;
  ctx.beginPath();
  ctx.moveTo(B / 2, 2); ctx.lineTo(B - 4, 26); ctx.lineTo(B - 4, H - 12); ctx.quadraticCurveTo(B - 4, H - 2, B - 14, H - 2);
  ctx.lineTo(14, H - 2); ctx.quadraticCurveTo(4, H - 2, 4, H - 12); ctx.lineTo(4, 26); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = F.messing; ctx.lineWidth = 1.5; ctx.stroke();
  const g = ctx.createLinearGradient(8, 0, B - 8, 0);
  g.addColorStop(0, F.eisen); g.addColorStop(0.5, F.eisenHell); g.addColorStop(1, F.eisen);
  ctx.fillStyle = g;
  ctx.fillRect(9, 28, B - 18, H - 36);
  // Nieten an der Bordwand
  ctx.fillStyle = F.niete;
  for (let y = 34; y < H - 10; y += 10) { ctx.fillRect(10.5, y, 1.6, 1.6); ctx.fillRect(B - 12, y, 1.6, 1.6); }
  // Raumschilder
  raumSchild(ctx, 'WARENLAGER', 32);
  raumSchild(ctx, 'BRENNSTOFFBUNKER', 140);
  for (const f of FAECHER) fach(ctx, f);
}

/** Leeres Fach: Eisenboden mit Plattenfugen, Messingrahmen. @param {CanvasRenderingContext2D} ctx @param {{x: number, y: number, b: number, h: number}} f */
function fach(ctx, f) {
  ctx.fillStyle = F.boden;
  ctx.fillRect(f.x, f.y, f.b, f.h);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.lineWidth = 1;
  for (let y = f.y + 16; y < f.y + f.h; y += 16) { ctx.beginPath(); ctx.moveTo(f.x, y + 0.5); ctx.lineTo(f.x + f.b, y + 0.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(160, 130, 90, 0.18)';
  for (let y = f.y + 4; y < f.y + f.h; y += 16) { ctx.fillRect(f.x + 2, y, 1.2, 1.2); ctx.fillRect(f.x + f.b - 3.2, y, 1.2, 1.2); }
  ctx.strokeStyle = F.messing; ctx.lineWidth = 1.2;
  ctx.strokeRect(f.x - 0.5, f.y - 0.5, f.b + 1, f.h + 1);
}

/** Schild über einem Raum (quer über die Breite). @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} y */
function raumSchild(ctx, text, y) {
  ctx.font = 'bold 7.5px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const b = ctx.measureText(text).width + 14;
  ctx.fillStyle = F.eisenDunkel; ctx.fillRect(B / 2 - b / 2, y - 5, b, 10);
  ctx.strokeStyle = F.messing; ctx.lineWidth = 1; ctx.strokeRect(B / 2 - b / 2 + 0.5, y - 4.5, b - 1, 9);
  ctx.fillStyle = F.schrift; ctx.fillText(text, B / 2, y + 0.5);
}

/** Kleines Messingschild oben im Fach (wird über die Ladung gemalt). @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} x @param {number} y */
function schild(ctx, text, x, y) {
  ctx.font = 'bold 6.5px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const b = ctx.measureText(text).width + 8;
  ctx.fillStyle = 'rgba(20, 18, 14, 0.9)'; ctx.fillRect(x - b / 2, y - 4, b, 8);
  ctx.strokeStyle = F.messing; ctx.lineWidth = 0.8; ctx.strokeRect(x - b / 2 + 0.5, y - 3.5, b - 1, 7);
  ctx.fillStyle = F.schrift; ctx.fillText(text, x, y + 0.4);
}

/** Feste Pseudo-Zufallszahl 0 … 1 (Muster flimmern nicht). @param {number} n @returns {number} */
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── Muster (einmal je Fach vorgemalt, Fachgröße b × h) ──

/** @type {Record<string, (ctx: CanvasRenderingContext2D, b: number, h: number) => void>} */
const MUSTER = {
  /** Kohle: dunkle Brocken mit matten Glanzkanten. */
  kohle(ctx, b, h) {
    ctx.fillStyle = '#141412'; ctx.fillRect(0, 0, b, h);
    let n = 0;
    for (let y = 2; y < h + 3; y += 4) {
      for (let x = (n % 2) * 2; x < b + 3; x += 4, n++) {
        const z = hash(n);
        const g = 26 + Math.round(z * 30);
        ctx.fillStyle = `rgb(${g}, ${g}, ${g - 2})`;
        ctx.beginPath(); ctx.arc(x + z * 2, y + hash(n + 7) * 2, 1.5 + z * 1.5, 0, Math.PI * 2); ctx.fill();
        if (z > 0.72) { ctx.fillStyle = 'rgba(170, 170, 160, 0.3)'; ctx.fillRect(x + z * 2 - 1, y - 1, 1, 1); }
      }
    }
  },
  /** Holz: quer gestapelte Stämme — Rinde längs, an einem Ende die helle Schnittfläche mit Ringen. */
  holz(ctx, b, h) {
    ctx.fillStyle = '#1e1913'; ctx.fillRect(0, 0, b, h);
    const d = STAMM;
    // Von unten in ganzen Stämmen, damit fuellHoehe() nie einen halben zeigt.
    for (let y = h - d, reihe = 0; y > -d; y -= d, reihe++) {
      const links = reihe % 2 === 0; // Schnittflächen abwechselnd links/rechts
      const kuerzer = hash(reihe) * 6;
      const x0 = links ? 2 : 1 + kuerzer, x1 = links ? b - 1 - kuerzer : b - 2;
      // Rinde
      const g = ctx.createLinearGradient(0, y, 0, y + d);
      g.addColorStop(0, '#6a5440'); g.addColorStop(0.5, '#4f3d2c'); g.addColorStop(1, '#2e2419');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x0, y + 0.5, x1 - x0, d - 1, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(25, 18, 10, 0.6)'; ctx.lineWidth = 0.6;
      for (let x = x0 + 4 + hash(reihe + 3) * 5; x < x1 - 4; x += 7 + hash(x) * 4) {
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 3, y + d - 2); ctx.stroke();
      }
      // Schnittfläche mit Jahresringen
      const sx = links ? x0 + 3 : x1 - 3, sy = y + d / 2;
      ctx.fillStyle = '#a88e64';
      ctx.beginPath(); ctx.ellipse(sx, sy, 3, d / 2 - 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6e5a3c'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(sx, sy, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(sx, sy, 0.7, 0.9, 0, 0, Math.PI * 2); ctx.stroke();
    }
  },
  /** Öl: Fässer von oben, Eisenreifen, Messing-Spund. */
  oel(ctx, b, h) {
    ctx.fillStyle = F.boden; ctx.fillRect(0, 0, b, h);
    const spalten = Math.floor(b / FASS_REIHE);
    const rand = (b - spalten * FASS_REIHE) / 2;
    // Von unten in ganzen Reihen, damit fuellHoehe() immer ganze Fässer zeigt.
    for (let y = h - FASS_REIHE / 2; y > 0; y -= FASS_REIHE) {
      for (let s = 0; s < spalten; s++) {
        const x = rand + FASS_REIHE / 2 + s * FASS_REIHE;
        ctx.fillStyle = '#3d2620';
        ctx.beginPath(); ctx.arc(x, y, 5.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6b6860'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(x, y, 3.3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = F.messing; ctx.fillRect(x + 1.4, y - 2.4, 1.5, 1.5);
      }
    }
  },
  /** Vorräte: Holzkisten und Jutesäcke durcheinander. */
  nahrung(ctx, b, h) {
    ctx.fillStyle = F.boden; ctx.fillRect(0, 0, b, h);
    let i = 0;
    for (let y = h - KISTE; y > -KISTE; y -= KISTE) {
      for (let x = 1 + (i % 2) * 3; x < b - 2; x += KISTE, i++) {
        if (hash(i * 3) < 0.55) {
          ctx.fillStyle = '#5f4c33'; ctx.fillRect(x, y, 11, 11);
          ctx.strokeStyle = '#2f2518'; ctx.lineWidth = 0.9; ctx.strokeRect(x + 0.5, y + 0.5, 10, 10);
          ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 10, y + 10); ctx.stroke();
        } else {
          ctx.fillStyle = '#7e7155';
          ctx.beginPath(); ctx.ellipse(x + 5.5, y + 5.5, 5.4, 4.4, hash(i) * 2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#4c4330'; ctx.lineWidth = 0.7; ctx.stroke();
        }
      }
    }
  },
};
