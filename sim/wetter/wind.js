// @ts-check
/**
 * wind.js — Wechselnder Wind (Tick-System).
 *
 * ZWECK:    Der Wind dreht und ändert seine Stärke langsam. Er liegt im Spielzustand, weil er
 *           später Spielwirkung bekommt (Kälte, Verbrauch bei Gegenwind, Schneeverwehungen) —
 *           dann muss er auf allen Rechnern exakt gleich sein. In M1 sieht man ihn nur
 *           (Rauch, Schneetreiben, Anzeige).
 * LIEST:    state.wetter, state.rng, data/wetter.js
 * SCHREIBT: state.wetter
 * REGEL:    KONZEPT.md §5 „Wetter“, CLAUDE.md Regel 2 (Zufall nur über rng)
 * DEBUG:    `ek.state.wetter`. Neuen Windwechsel sofort erzwingen geht nicht von außen (Zustand);
 *           zum Testen `ek.step(2400)` — spätestens dann wechselt er.
 */

import { rngBereich, rngProzent } from '../lib/rng.js';
import { winkelNorm, klemme } from '../lib/winkel.js';
import {
  WIND_MIN, WIND_MAX, WIND_WECHSEL_MIN, WIND_WECHSEL_MAX, WIND_DREHUNG_NORMAL, WIND_UMSCHWUNG_PROZENT,
  WIND_DREH_PRO_TICK, WIND_STAERKE_PRO_TICK,
} from '../../data/wetter.js';

/** @typedef {import('../types.js').Zustand} Zustand */
/** @typedef {import('../types.js').Wetter} Wetter */

/**
 * Startwetter aus dem Zufall des Zustands.
 * @param {{rng: number[]}} traeger
 * @returns {Wetter}
 */
export function startWetter(traeger) {
  const richtung = rngBereich(traeger, 0, 65535);
  const staerke = rngBereich(traeger, WIND_MIN + 20, WIND_MAX - 60);
  return {
    windRichtung: richtung, windStaerke: staerke, zielRichtung: richtung, zielStaerke: staerke,
    naechsterWechsel: rngBereich(traeger, WIND_WECHSEL_MIN, WIND_WECHSEL_MAX),
  };
}

/**
 * Ein Tick Wind.
 * @param {Zustand} state
 */
export function windSchritt(state) {
  const w = state.wetter;
  if (state.tick >= w.naechsterWechsel) neuesZiel(state);
  // Richtung auf dem kürzeren Weg zum Ziel drehen (−32768 … 32767).
  const rest = winkelNorm(w.zielRichtung - w.windRichtung + 32768) - 32768;
  w.windRichtung = winkelNorm(w.windRichtung + klemme(rest, -WIND_DREH_PRO_TICK, WIND_DREH_PRO_TICK));
  w.windStaerke += klemme(w.zielStaerke - w.windStaerke, -WIND_STAERKE_PRO_TICK, WIND_STAERKE_PRO_TICK);
}

/**
 * Würfelt das nächste Windziel und den Zeitpunkt des übernächsten Wechsels.
 * @param {Zustand} state
 */
function neuesZiel(state) {
  const w = state.wetter;
  const spanne = rngProzent(state, WIND_UMSCHWUNG_PROZENT) ? 32768 : WIND_DREHUNG_NORMAL;
  w.zielRichtung = winkelNorm(w.windRichtung + rngBereich(state, -spanne, spanne));
  w.zielStaerke = rngBereich(state, WIND_MIN, WIND_MAX);
  w.naechsterWechsel = state.tick + rngBereich(state, WIND_WECHSEL_MIN, WIND_WECHSEL_MAX);
}
