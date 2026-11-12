// @ts-check
/**
 * sturm.test.js — Schneestürme: Plan, Stärke, Barometer, Schneelast (M5a).
 * REGEL: docs/specs/M5a-stuerme.md
 * DEBUG: Werte in data/wetter.js; im Spiel F3 („Sturm …“) und ek.wetter().
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, fahre, setzeAn } from './helfer.js';
import { neuerZustand } from '../sim/zustand.js';
import { tickAusfuehren } from '../sim/tick.js';
import { barometer } from '../sim/wetter/sturm.js';
import { laengsTempo, alsKmh } from '../sim/abfragen.js';
import {
  STURM_ERSTER_MIN, STURM_ERSTER_MAX, STURM_RAMPE, STURM_VORWARNUNG, BAROMETER_SCHOEN, STURM_ABSTAND_MIN,
} from '../data/wetter.js';

/** @param {import('../sim/types.js').Zustand} state @param {number} n */
function ticks(state, n) {
  for (let i = 0; i < n; i++) tickAusfuehren(state);
}

test('Sturm: der erste kommt im geplanten Fenster, gleicher Seed = gleicher Plan', () => {
  for (const seed of [0, 1, 4711, 99]) {
    const w = neuerZustand(seed).wetter;
    pruefe(w.sturmAb >= STURM_ERSTER_MIN && w.sturmAb <= STURM_ERSTER_MAX, `Seed ${seed}: erster Sturm bei ${w.sturmAb}`);
    pruefe(w.sturmBis > w.sturmAb, 'endet nach dem Beginn');
    gleich(neuerZustand(seed).wetter.sturmAb, w.sturmAb, 'deterministisch');
  }
});

test('Sturm: schwillt an, hält, flaut ab; danach ist der nächste geplant', () => {
  const { state } = testwelt();
  const w = state.wetter;
  const ab = w.sturmAb, bis = w.sturmBis, spitze = w.sturmSpitze;
  ticks(state, ab);
  gleich(w.sturm, 0, 'noch kein Sturm');
  ticks(state, STURM_RAMPE / 2);
  pruefe(w.sturm > 0 && w.sturm < spitze, `schwillt an: ${w.sturm}`);
  ticks(state, STURM_RAMPE);
  gleich(w.sturm, spitze, 'volle Stärke');
  ticks(state, bis - state.tick + 1);
  gleich(w.sturm, 0, 'vorbei');
  pruefe(w.sturmAb >= bis + STURM_ABSTAND_MIN, `nächster geplant bei ${w.sturmAb}`);
});

test('Barometer: schön, fällt in der Vorwarnzeit, unten im Sturm, steigt danach', () => {
  const { state } = testwelt();
  const w = state.wetter;
  gleich(barometer(w, 0), BAROMETER_SCHOEN, 'am Anfang schön');
  gleich(barometer(w, w.sturmAb - STURM_VORWARNUNG), BAROMETER_SCHOEN, 'Beginn der Vorwarnung');
  const halb = barometer(w, w.sturmAb - STURM_VORWARNUNG / 2);
  pruefe(halb > 400 && halb < 600, `halbe Vorwarnzeit: ${halb}`);
  ticks(state, w.sturmAb + STURM_RAMPE * 2);
  gleich(barometer(w, state.tick), 0, 'im Sturm unten');
  gleich(barometer(w, w.sturmBis), BAROMETER_SCHOEN, 'danach schön');
});

test('Sturm: Schneelast bremst — bei voller Stärke etwa halbes Höchsttempo', () => {
  /** @param {boolean} sturm @returns {number} km/h nach 60 s Volldampf (Laufband) */
  function hoechst(sturm) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, 0);
    if (sturm) { // nur in Tests: Sturm sofort, volle Stärke, lange
      Object.assign(state.wetter, { sturmAb: 0, sturmBis: 1000000, sturmSpitze: 1000 });
      ticks(state, STURM_RAMPE);
      setzeAn(k, 0, 2000, 0);
    }
    fahre(state, { gas: 100, druck: 4 }, 0);
    for (let i = 0; i < 60 * 20; i++) { tickAusfuehren(state); k.x = 0; k.y = 2000 * 1000000; }
    return alsKmh(laengsTempo(k));
  }
  const ohne = hoechst(false), mit = hoechst(true);
  pruefe(mit < ohne * 0.6 && mit > ohne * 0.4, `ohne ${ohne.toFixed(1)} km/h, im Sturm ${mit.toFixed(1)} km/h`);
});
