// @ts-check
/**
 * kollision.js — Hält den Koloss aus Fels und Schluchten heraus.
 *
 * ZWECK:    Nach der Fahrphysik wird geprüft, ob die neue Lage frei ist. Wenn nicht, wird der Reihe
 *           nach versucht: ohne Drehung → nur in x → nur in y (an der Wand entlangrutschen) →
 *           stehen bleiben. So bleibt er nie stecken und dringt nie ein.
 * LIEST:    Untergrund über sim/welt/untergrund.js, data/koloss.js
 * SCHREIBT: k.x, k.y, k.vx, k.vy, k.h, k.dreh (nur zurücksetzen/abbremsen)
 * REGEL:    docs/specs/M2-welt.md „Kollision“, CLAUDE.md Regeln 2+3
 * DEBUG:    tests/kollision.test.js (Felsblock im Testgelände, Seed 0). Prüfpunkte siehe PRUEFPUNKTE.
 *
 * Schaden beim Aufprall kommt in M4 (dann hier die Aufprall-Wucht melden).
 */

import { befahrbarAn } from '../welt/untergrund.js';
import { gebaeudeAn } from '../siedlung.js';
import { cosW, sinW, teile, TRIG_EINS } from '../lib/winkel.js';
import { KOLOSS_LAENGE_M, KOLOSS_BREITE_M, UM_PRO_METER, RUMPF_VOR_DREHPUNKT_M } from '../../data/koloss.js';

/** @typedef {import('../types.js').Koloss} Koloss */

/**
 * Prüfpunkte im Fahrzeug-Koordinatensystem (µm, +x = vorne, +y = rechts, Ursprung = Drehpunkt,
 * siehe RUMPF_VOR_DREHPUNKT_M): beide Seiten alle 4 m, dazu Bugspitze und Heckmitte. WARUM alle 4 m: Zellen sind 4 m groß — so rutscht keine Ecke
 * zwischen zwei Punkten in eine Felszelle.
 * @type {readonly [number, number][]}
 */
const PRUEFPUNKTE = (() => {
  /** @type {[number, number][]} */
  const punkte = [];
  const halbL = (KOLOSS_LAENGE_M / 2) * UM_PRO_METER, halbB = (KOLOSS_BREITE_M / 2) * UM_PRO_METER;
  for (let x = -halbL; x <= halbL; x += 4 * UM_PRO_METER) {
    punkte.push([x, -halbB], [x, halbB]);
  }
  punkte.push([halbL, -halbB], [halbL, halbB]);         // vordere Ecken
  punkte.push([halbL + 1.5 * UM_PRO_METER, 0], [-halbL, 0]); // Bugspitze (Pflug), Heck
  // Vom Rumpf-Ursprung auf den Drehpunkt umrechnen: Der Rumpf liegt vor dem Drehpunkt.
  const vor = RUMPF_VOR_DREHPUNKT_M * UM_PRO_METER;
  return punkte.map(([x, y]) => /** @type {[number, number]} */ ([x + vor, y]));
})();

/**
 * Ist der Koloss in dieser Lage frei (alle Prüfpunkte auf befahrbarem Boden)?
 * @param {number} seed
 * @param {number} x @param {number} y  µm
 * @param {number} h  Winkel
 * @returns {boolean}
 */
export function lageFrei(seed, x, y, h) {
  const c = cosW(h), s = sinW(h);
  for (const [lx, ly] of PRUEFPUNKTE) {
    const wx = x + teile(lx * c - ly * s, TRIG_EINS);
    const wy = y + teile(lx * s + ly * c, TRIG_EINS);
    if (!befahrbarAn(seed, wx, wy) || gebaeudeAn(wx, wy)) return false;
  }
  return true;
}

/**
 * Übernimmt die gewünschte neue Lage, soweit sie frei ist.
 * @param {Koloss} k  enthält noch die ALTE Lage (x, y, h) und das neue Tempo (vx, vy)
 * @param {number} seed
 * @param {number} neuH  gewünschte neue Richtung
 */
export function bewegenMitKollision(k, seed, neuH) {
  const nx = k.x + k.vx, ny = k.y + k.vy;
  if (lageFrei(seed, nx, ny, neuH)) { k.x = nx; k.y = ny; k.h = neuH; return; }
  // Drehung verhindert? Dann ohne Drehung weiter.
  k.dreh = 0;
  if (lageFrei(seed, nx, ny, k.h)) { k.x = nx; k.y = ny; return; }
  // An der Wand entlang: nur die freie Richtung behalten, die andere stoppen.
  if (k.vx !== 0 && lageFrei(seed, nx, k.y, k.h)) { k.x = nx; k.vy = 0; return; }
  if (k.vy !== 0 && lageFrei(seed, k.x, ny, k.h)) { k.y = ny; k.vx = 0; return; }
  // Festgefahren an der Wand: stehen bleiben.
  k.vx = 0;
  k.vy = 0;
}
