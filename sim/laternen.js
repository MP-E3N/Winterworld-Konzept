// @ts-check
/**
 * laternen.js — Laternen setzen: temporäre Wegpunkte, die ein paar Stunden leuchten (Spieltest M5b).
 *
 * ZWECK:    Nutzerwunsch: Die eigene Spur verschwindet mit der Zeit (wie Dreck und Schnee); um den Weg
 *           zu markieren, setzt man Laternen hinter dem Koloss ab. Sie leuchten LATERNE_DAUER_TICKS lang,
 *           höchstens LATERNEN_MAX je Spieler — wer eine sechste setzt, löscht die älteste.
 *           Liegen im Zustand (nicht nur Darstellung), weil später auch Mitspieler sie sehen sollen.
 * LIEST:    Koloss (Rumpfmitte, Richtung), state.tick, data/laternen.js
 * SCHREIBT: state.laternen — nur über den Befehl LATERNE (sim/befehle.js)
 * REGEL:    CLAUDE.md Regeln 1–4 (Liste ohne Löcher: erloschene bleiben mit bis ≤ tick stehen)
 * DEBUG:    F3-Zeile „Laternen“. Tests: tests/laternen.test.js.
 */

import { rumpfMitte } from './abfragen.js';
import { cosW, sinW, teile, TRIG_EINS } from './lib/winkel.js';
import { UM_PRO_METER } from '../data/koloss.js';
import { LATERNEN_MAX, LATERNE_DAUER_TICKS, LATERNE_HINTER_M } from '../data/laternen.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Koloss} Koloss */
/** @typedef {import('./types.js').Laterne} Laterne */

/**
 * Brennt die Laterne noch?
 * @param {Laterne} l @param {number} tick
 * @returns {boolean}
 */
export function laterneBrennt(l, tick) {
  return tick < l.bis;
}

/**
 * Die brennenden Laternen eines Spielers, älteste zuerst.
 * @param {Zustand} state @param {number} spieler
 * @returns {Laterne[]}
 */
export function brennendeLaternen(state, spieler) {
  return state.laternen.filter((l) => l.spieler === spieler && laterneBrennt(l, state.tick));
}

/**
 * Setzt eine Laterne hinter dem Heck ab. Brennen schon LATERNEN_MAX, erlischt die älteste.
 * @param {Zustand} state @param {Koloss} k @param {number} spieler
 */
export function laterneSetzen(state, k, spieler) {
  const brennend = brennendeLaternen(state, spieler);
  if (brennend.length >= LATERNEN_MAX) brennend[0].bis = state.tick;
  const m = rumpfMitte(k), hinten = LATERNE_HINTER_M * UM_PRO_METER;
  state.laternen.push({
    id: state.laternen.length, spieler,
    x: m.x - teile(hinten * cosW(k.h), TRIG_EINS), y: m.y - teile(hinten * sinW(k.h), TRIG_EINS),
    ab: state.tick, bis: state.tick + LATERNE_DAUER_TICKS,
  });
}
