// @ts-check
/**
 * lager.js — Die zwei Lager des Kolosses: Brennstofflager und Warenlager (Spieltest M4a).
 *
 * ZWECK:    Eine Stelle für „wie viel ist wo, wohin kommt eine Ware, ist noch Platz“. Kohle und Öl
 *           gehören ins Brennstofflager, Vorräte ins Warenlager, Holz in beide (k.holzZiel sagt,
 *           wohin neu geborgenes Holz kommt). Der Kessel heizt nur aus dem Brennstofflager.
 * LIEST:    k.lager, k.holzZiel, data/fundstellen.js LAGER
 * SCHREIBT: k.lager — NUR über einlagern(), aufgerufen von Befehlen (sim/befehle.js) und
 *           Tick-Systemen (sim/bergen.js); alle anderen lesen nur.
 * REGEL:    docs/specs/M4a-kessel-kaelte.md „Lager“, CLAUDE.md Regel 1
 * DEBUG:    `ek.ladung()` zeigt beide Lager in t.
 */

import { LAGER, BRENNSTOFFLAGER, WARENLAGER, GEWICHT_BREMST_PROMILLE, GEWICHT_BEZUG_KG } from '../../data/fundstellen.js';
import { teile } from '../lib/winkel.js';

/** @typedef {import('../types.js').Koloss} Koloss */
/** @typedef {import('../../data/fundstellen.js').Ware} Ware */

/**
 * Die Waren eines Lagers als Objekt (kg je Ware).
 * @param {Koloss} k
 * @param {number} lager  Index in LAGER
 * @returns {Record<string, number>}
 */
export function lagerInhalt(k, lager) {
  return /** @type {Record<string, number>} */ (k.lager[LAGER[lager].schluessel]);
}

/**
 * kg einer Ware in einem Lager (0, wenn die Ware dort nicht hingehört).
 * @param {Koloss} k @param {number} lager @param {string} ware
 * @returns {number}
 */
export function lagerMenge(k, lager, ware) {
  return lagerInhalt(k, lager)[ware] ?? 0;
}

/**
 * Gesamtgewicht eines Lagers (kg).
 * @param {Koloss} k @param {number} lager
 * @returns {number}
 */
export function lagerKg(k, lager) {
  let summe = 0;
  for (const w of LAGER[lager].waren) summe += lagerMenge(k, lager, w);
  return summe;
}

/**
 * Freier Platz in einem Lager (kg).
 * @param {Koloss} k @param {number} lager
 * @returns {number}
 */
export function lagerFrei(k, lager) {
  return LAGER[lager].kg - lagerKg(k, lager);
}

/**
 * Gesamtgewicht beider Lager (kg) — bremst den Koloss.
 * @param {Koloss} k
 * @returns {number}
 */
export function ladungKg(k) {
  return lagerKg(k, BRENNSTOFFLAGER) + lagerKg(k, WARENLAGER);
}

/**
 * In welches Lager kommt eine neu geborgene Ware?
 * @param {Koloss} k @param {string} ware
 * @returns {number} Index in LAGER
 */
export function zielLager(k, ware) {
  if (ware === 'holz') return k.holzZiel;
  return LAGER[BRENNSTOFFLAGER].waren.includes(/** @type {Ware} */ (ware)) ? BRENNSTOFFLAGER : WARENLAGER;
}

/**
 * Darf diese Ware in dieses Lager?
 * @param {number} lager @param {string} ware
 * @returns {boolean}
 */
export function passtIns(lager, ware) {
  return LAGER[lager] !== undefined && LAGER[lager].waren.includes(/** @type {Ware} */ (ware));
}

/**
 * Legt kg einer Ware in ein Lager (negativ = herausnehmen). Prüft NICHT auf Platz — das tun die
 * Aufrufer vorher (Befehlsprüfung bzw. Bergen).
 * @param {Koloss} k @param {number} lager @param {string} ware @param {number} kg
 */
export function einlagern(k, lager, ware, kg) {
  const inhalt = lagerInhalt(k, lager);
  inhalt[ware] = Math.max(0, inhalt[ware] + kg);
}

/**
 * Schub nach Abzug für das Gewicht der Ladung: GEWICHT_BREMST_PROMILLE je GEWICHT_BEZUG_KG.
 * Leer = genau der volle Schub.
 * @param {Koloss} k
 * @param {number} schub  µm/Tick²
 * @returns {number}
 */
export function schubMitLadung(k, schub) {
  const abzug = teile(ladungKg(k) * GEWICHT_BREMST_PROMILLE, GEWICHT_BEZUG_KG);
  return teile(schub * (1000 - abzug), 1000);
}
