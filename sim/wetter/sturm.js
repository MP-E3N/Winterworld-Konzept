// @ts-check
/**
 * sturm.js — Schneestürme mit Vorwarnung (Tick-System, M5a).
 *
 * ZWECK:    Von Zeit zu Zeit zieht ein Schneesturm auf. Er ist weltweit (alle Kolosse erleben ihn
 *           gleich) und vorher planbar: Wann er kommt, steht im Zustand (sturmAb), darum kann das
 *           Barometer schon Minuten vorher fallen. Im Sturm sieht man wenig (Darstellung) und fährt
 *           langsamer (Schneelast, sim/koloss/fahren.js). Nutzerentscheidung: NICHT kälter.
 * LIEST:    state.tick, state.wetter, state.rng, data/wetter.js
 * SCHREIBT: state.wetter.sturm, sturmAb, sturmBis, sturmSpitze
 * REGEL:    docs/specs/M5a-stuerme.md, CLAUDE.md Regel 2 (Zufall nur über rng)
 * DEBUG:    `ek.wetter()` sagt, wann der nächste Sturm kommt; F3-Zeile „Sturm“. Tests: tests/sturm.test.js.
 *           Probehalber den Schleier ansehen: `ek.sturm(0.8)` (nur Darstellung).
 */

import { rngBereich } from '../lib/rng.js';
import { teile } from '../lib/winkel.js';
import {
  STURM_ERSTER_MIN, STURM_ERSTER_MAX, STURM_ABSTAND_MIN, STURM_ABSTAND_MAX, STURM_DAUER_MIN, STURM_DAUER_MAX,
  STURM_RAMPE, STURM_SPITZE_MIN, STURM_SPITZE_MAX, STURM_VORWARNUNG, STURM_WIDERSTAND_PROZENT, STURM_VOLL,
  BAROMETER_SCHOEN,
} from '../../data/wetter.js';

/** @typedef {import('../types.js').Zustand} Zustand */
/** @typedef {import('../types.js').Wetter} Wetter */

/**
 * Plant den ersten Sturm (beim Anlegen der Welt, nach dem Wind gewürfelt).
 * @param {{rng: number[]}} traeger
 * @returns {{sturm: number, sturmAb: number, sturmBis: number, sturmSpitze: number}}
 */
export function ersterSturm(traeger) {
  return sturmPlanen(traeger, rngBereich(traeger, STURM_ERSTER_MIN, STURM_ERSTER_MAX));
}

/**
 * Würfelt Dauer und Stärke eines Sturms, der bei `ab` beginnt.
 * @param {{rng: number[]}} traeger @param {number} ab  Tick
 * @returns {{sturm: number, sturmAb: number, sturmBis: number, sturmSpitze: number}}
 */
function sturmPlanen(traeger, ab) {
  const dauer = rngBereich(traeger, STURM_DAUER_MIN, STURM_DAUER_MAX);
  return { sturm: 0, sturmAb: ab, sturmBis: ab + dauer, sturmSpitze: rngBereich(traeger, STURM_SPITZE_MIN, STURM_SPITZE_MAX) };
}

/**
 * Ein Tick Sturm: Stärke aus dem Plan; ist er vorbei, den nächsten planen.
 * @param {Zustand} state
 */
export function sturmSchritt(state) {
  const w = state.wetter;
  if (state.tick >= w.sturmBis) {
    Object.assign(w, sturmPlanen(state, w.sturmBis + rngBereich(state, STURM_ABSTAND_MIN, STURM_ABSTAND_MAX)));
  }
  w.sturm = sturmStaerke(w, state.tick);
}

/**
 * Stärke zu einem Zeitpunkt: anschwellen, halten, abflauen (je STURM_RAMPE lang).
 * @param {Wetter} w @param {number} tick
 * @returns {number}  0 … sturmSpitze
 */
function sturmStaerke(w, tick) {
  if (tick < w.sturmAb || tick >= w.sturmBis) return 0;
  const rein = tick - w.sturmAb, raus = w.sturmBis - tick;
  const anteil = Math.min(STURM_RAMPE, rein, raus); // 0 … STURM_RAMPE
  return teile(w.sturmSpitze * anteil, STURM_RAMPE);
}

/**
 * Barometer: 0 = Sturm … BAROMETER_SCHOEN = schön. Fällt in der Vorwarnzeit gleichmäßig, bleibt im
 * Sturm unten und steigt beim Abflauen mit der Stärke wieder.
 * @param {Wetter} w @param {number} tick
 * @returns {number}
 */
export function barometer(w, tick) {
  if (tick >= w.sturmAb) {
    if (tick >= w.sturmBis) return BAROMETER_SCHOEN;
    // Beim Abflauen steigt es mit der fallenden Stärke; vorher bleibt es unten.
    const abflauen = w.sturmBis - tick < STURM_RAMPE;
    return abflauen ? BAROMETER_SCHOEN - teile(BAROMETER_SCHOEN * w.sturm, Math.max(1, w.sturmSpitze)) : 0;
  }
  const bis = w.sturmAb - tick;
  if (bis >= STURM_VORWARNUNG) return BAROMETER_SCHOEN;
  return teile(BAROMETER_SCHOEN * bis, STURM_VORWARNUNG);
}

/**
 * Läuft gerade ein Sturm (auch beim An- oder Abschwellen)?
 * @param {Wetter} w @param {number} tick
 * @returns {boolean}
 */
export function sturmLaeuft(w, tick) {
  return tick >= w.sturmAb && tick < w.sturmBis;
}

/**
 * Test-Knopf (Spieltest M5a, Nutzerwunsch): Sturm sofort beginnen (volle Stärke, längste Dauer,
 * schwillt wie immer 40 s an) oder sofort beenden (danach wird der nächste normal geplant).
 * Nur über den Befehl STURM_TEST (sim/befehle.js).
 * @param {Zustand} state @param {boolean} an
 */
export function sturmTesten(state, an) {
  const w = state.wetter;
  if (an && !sturmLaeuft(w, state.tick)) Object.assign(w, { sturmAb: state.tick, sturmBis: state.tick + STURM_DAUER_MAX, sturmSpitze: STURM_VOLL });
  if (!an && sturmLaeuft(w, state.tick)) { w.sturmBis = state.tick; w.sturm = 0; }
}

/**
 * Widerstand beim Fahren mit Schneelast: bei voller Stärke um STURM_WIDERSTAND_PROZENT mehr.
 * @param {number} widerstand  des Untergrunds (/4096 je Tick)
 * @param {number} sturm  0 … STURM_VOLL
 * @returns {number}
 */
export function widerstandImSturm(widerstand, sturm) {
  return widerstand + teile(widerstand * STURM_WIDERSTAND_PROZENT * sturm, 100 * STURM_VOLL);
}
