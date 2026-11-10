// @ts-check
/**
 * zustand.js — Legt einen neuen, leeren Spielzustand an.
 *
 * ZWECK:    Startpunkt jeder Welt. Spieler und Kolosse kommen erst über den Befehl BEITRETEN
 *           dazu — im Einzelspiel genauso wie später im Multiplayer.
 * LIEST:    data/takt.js
 * SCHREIBT: — (gibt ein neues Objekt zurück)
 * REGEL:    KONZEPT.md §8 Regel 10 (Zustand mit Versionsnummer)
 */

import { rngAusSeed } from './lib/rng.js';
import { startWetter } from './wetter/wind.js';
import { ZUSTAND_VERSION } from '../data/takt.js';

/** @typedef {import('./types.js').Zustand} Zustand */

/**
 * @param {number} seed  Welt-Seed (Ganzzahl)
 * @returns {Zustand}
 */
export function neuerZustand(seed) {
  const zufall = { rng: rngAusSeed(seed) };
  // Das Startwetter würfelt mit demselben Zufall; danach gehört er dem Zustand.
  const wetter = startWetter(zufall);
  return {
    version: ZUSTAND_VERSION,
    seed,
    tick: 0,
    rng: zufall.rng,
    wetter,
    spieler: [],
    kolosse: [],
  };
}
