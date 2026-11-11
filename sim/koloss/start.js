// @ts-check
/**
 * start.js — Ein frischer Koloss: Startwerte beim Beitreten und beim Neustart nach dem Liegenbleiben.
 *
 * ZWECK:    Eine einzige Stelle für „so sieht ein neuer Koloss aus“. Gebraucht von BEITRETEN
 *           (sim/befehle.js) und vom Neustart nach dem Liegenbleiben (sim/koloss/wrack.js, F6).
 * LIEST:    data/koloss.js, data/crew.js, data/klima.js, data/fundstellen.js
 * SCHREIBT: — (gibt ein neues Objekt zurück)
 * REGEL:    KONZEPT.md F6 (Neustart mit einfachem Koloss in der letzten Siedlung — bis M4d am Startpunkt)
 * DEBUG:    Neues Feld im Koloss? Hier den Startwert eintragen, sonst fehlt es nach dem Neustart.
 */

import {
  START_DRUCK, START_X, START_Y, START_RICHTUNG, KOLOSS_BREITE_M, UM_PRO_METER, TELEGRAF_STOPP,
  START_KOHLE_KG, START_HOLZ_KG, DAMPF_MAX,
} from '../../data/koloss.js';
import { BRENNSTOFFLAGER } from '../../data/fundstellen.js';
import { VOLL, START_HEIZER, START_ARBEITER, START_NAHRUNG_KG } from '../../data/crew.js';
import { START_WAERME } from '../../data/klima.js';

/** @typedef {import('../types.js').Koloss} Koloss */

/**
 * Startwerte eines Kolosses.
 * @param {number} id  Koloss-ID
 * @param {number} spieler  Besitzer
 * @param {string} name
 * @param {number} trupp  ID seines Bergungstrupps
 * @returns {Koloss}
 */
export function kolossStartwerte(id, spieler, name, trupp) {
  // Weitere Spieler starten nebeneinander (Abstand 3 Breiten), damit sie sich nicht überlappen.
  const versatz = spieler * KOLOSS_BREITE_M * 3 * UM_PRO_METER;
  return {
    id, besitzer: spieler, name,
    x: START_X + versatz, y: START_Y, vx: 0, vy: 0, h: START_RICHTUNG, dreh: 0,
    druck: START_DRUCK, gas: 0, lenkung: 0, telegraf: TELEGRAF_STOPP, antrieb: 0, licht: 0,
    // Voller Kessel beim Start, etwas Brennstoff an Bord (M4a).
    dampf: DAMPF_MAX, brennstoff: 0, feuerMg: 0, heizung: 0, waerme: START_WAERME,
    lager: { brennstoff: { kohle: START_KOHLE_KG, holz: START_HOLZ_KG, oel: 0 }, waren: { holz: 0, nahrung: START_NAHRUNG_KG } },
    holzZiel: BRENNSTOFFLAGER, trupp,
    // Crew (M4b): gesund, satt, zufrieden.
    crew: { heizer: START_HEIZER, arbeiter: START_ARBEITER, satt: VOLL, gesundheit: VOLL, moral: VOLL, essenMg: 0, sterben: 0, tote: 0 },
    // Liegenbleiben (M4c): Ticks ohne Brennstoff und Druck.
    kalt: 0,
  };
}
