// @ts-check
/**
 * wetter.test.js — Tests für den Wind (sim/wetter/wind.js).
 * REGEL: KONZEPT.md §5 „Wetter“, data/wetter.js
 */

import { test, pruefe, gleich } from './harness.js';
import { neuerZustand } from '../sim/zustand.js';
import { tickAusfuehren } from '../sim/tick.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { WIND_MIN, WIND_MAX, WIND_DREH_PRO_TICK, WIND_WECHSEL_MAX } from '../data/wetter.js';

/** Kürzester Winkelabstand (0 … 32768). @param {number} a @param {number} b */
function abstand(a, b) {
  const d = Math.abs(a - b) % 65536;
  return Math.min(d, 65536 - d);
}

test('Wind: gleicher Seed → gleicher Windverlauf, anderer Seed → anderer Wind', () => {
  const a = neuerZustand(9), b = neuerZustand(9), c = neuerZustand(10);
  for (let i = 0; i < 5000; i++) { tickAusfuehren(a); tickAusfuehren(b); }
  gleich(zustandsHash(a.wetter), zustandsHash(b.wetter), 'gleicher Seed');
  pruefe(zustandsHash(neuerZustand(9).wetter) !== zustandsHash(c.wetter), 'Seeds 9 und 10 starten gleich');
});

test('Wind: dreht weich, bleibt im Stärkebereich und wechselt wirklich (über 20 Seeds)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = neuerZustand(seed);
    let maxDreh = 0, gedreht = 0;
    const start = s.wetter.windRichtung;
    for (let i = 0; i < 20 * 60 * 10; i++) { // 10 Minuten
      const vorher = s.wetter.windRichtung;
      tickAusfuehren(s);
      const d = abstand(vorher, s.wetter.windRichtung);
      maxDreh = Math.max(maxDreh, d);
      gedreht = Math.max(gedreht, abstand(start, s.wetter.windRichtung));
      pruefe(s.wetter.windStaerke >= WIND_MIN && s.wetter.windStaerke <= WIND_MAX, `Seed ${seed}: Stärke ${s.wetter.windStaerke}`);
      pruefe(s.wetter.naechsterWechsel >= s.tick && s.wetter.naechsterWechsel <= s.tick + WIND_WECHSEL_MAX, `Seed ${seed}: Wechsel-Tick`);
    }
    pruefe(maxDreh <= WIND_DREH_PRO_TICK, `Seed ${seed}: springt um ${maxDreh} in einem Tick`);
    pruefe(gedreht > 2000, `Seed ${seed}: Wind hat sich in 10 min kaum gedreht (${gedreht})`);
  }
});
