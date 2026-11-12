// @ts-check
/**
 * verbrauch.js — Misst, wie viel Brennstoff gerade verfeuert wird (kg je Spielminute), für die Feuer-Anzeige.
 *
 * ZWECK:    Spieltest M5a: Die Feuer-Anzeige soll aussagekräftiger sein — dazu gehört der echte Verbrauch
 *           (Kessel + Heizung). Gemessen aus der Änderung des Vorrats, nicht nachgerechnet: So stimmt die
 *           Zahl immer mit dem überein, was tatsächlich aus dem Lager verschwindet.
 * LIEST:    gewählter Brennstoff im Brennstofflager und der angefangene Rest k.feuerMg, state.tick
 * SCHREIBT: nur eigene Messwerte
 * REGEL:    Darstellung liest nur (CLAUDE.md Regel 1)
 * DEBUG:    Zahl springt? Beim Bergen/Umlagern steigt der Vorrat — diese Messung wird verworfen.
 */

import { lagerMenge } from '../sim/koloss/lager.js';
import { BRENNSTOFFE } from '../data/koloss.js';
import { BRENNSTOFFLAGER } from '../data/fundstellen.js';

/** Gemessen wird über mindestens so viele Ticks (1 s), geglättet über einige Messungen. */
const MESS_TICKS = 20;
const GLAETTEN = 0.35;

const mess = { tick: -1, mg: 0, wahl: -1, kgMin: 0 };

/**
 * Verbrauch in kg je Spielminute (geglättet).
 * @param {import('../sim/types.js').Koloss} k @param {number} tick
 * @returns {number}
 */
export function verbrauchKgMin(k, tick) {
  // Vorrat in mg, ohne den schon angefangenen Rest: sinkt gleichmäßig, solange das Feuer brennt.
  const mg = lagerMenge(k, BRENNSTOFFLAGER, BRENNSTOFFE[k.brennstoff].ware) * 1000000 - k.feuerMg;
  if (mess.wahl !== k.brennstoff || mess.tick < 0 || tick < mess.tick) {
    Object.assign(mess, { tick, mg, wahl: k.brennstoff, kgMin: 0 });
    return 0;
  }
  const dt = tick - mess.tick;
  if (dt < MESS_TICKS) return mess.kgMin;
  const weg = mess.mg - mg;
  // Mehr geworden (geborgen, umgelagert)? Diese Messung zählt nicht.
  if (weg >= 0) mess.kgMin += ((weg / 1000000 / dt) * 1200 - mess.kgMin) * GLAETTEN;
  mess.tick = tick; mess.mg = mg;
  return mess.kgMin;
}
