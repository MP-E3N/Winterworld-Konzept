// @ts-check
/**
 * trig.test.js — Tests für sim/lib/winkel.js (Sinus-Tabelle, Winkel, Rechenhelfer).
 * REGEL: CLAUDE.md Regel 2
 */

import { test, pruefe, gleich } from './harness.js';
import { sinW, cosW, winkelNorm, teile, VOLLKREIS, TRIG_EINS } from '../sim/lib/winkel.js';

test('Winkel: Tabellen-Sinus weicht höchstens 1 von Math.sin ab (ganzer Kreis)', () => {
  for (let w = 0; w < VOLLKREIS; w += 16) {
    const soll = Math.round(Math.sin((w / VOLLKREIS) * 2 * Math.PI) * TRIG_EINS);
    pruefe(Math.abs(sinW(w) - soll) <= 1, `sin(${w}) = ${sinW(w)}, soll ${soll}`);
  }
});

test('Winkel: Eckwerte stimmen genau', () => {
  gleich(sinW(0), 0, 'sin 0°');
  gleich(sinW(16384), TRIG_EINS, 'sin 90°');
  gleich(cosW(0), TRIG_EINS, 'cos 0°');
  gleich(cosW(32768), -TRIG_EINS, 'cos 180°');
  gleich(sinW(49152), -TRIG_EINS, 'sin 270°');
});

test('Winkel: sin² + cos² bleibt nahe 1', () => {
  for (let w = 0; w < VOLLKREIS; w += 97) {
    const summe = sinW(w) * sinW(w) + cosW(w) * cosW(w);
    pruefe(Math.abs(summe - TRIG_EINS * TRIG_EINS) < TRIG_EINS * 8, `bei ${w}: ${summe}`);
  }
});

test('Winkel: winkelNorm bringt negative und große Winkel in 0 … 65535', () => {
  gleich(winkelNorm(-1), 65535, '-1');
  gleich(winkelNorm(65536 + 5), 5, 'Überlauf');
  gleich(winkelNorm(-65536 * 3 - 2), 65534, 'stark negativ');
});

test('Winkel: teile() schneidet Richtung 0 ab (kein Kriechen bei negativen Werten)', () => {
  gleich(teile(7, 2), 3, 'positiv');
  gleich(teile(-7, 2), -3, 'negativ');
  gleich(teile(-1, 4096), 0, 'kleiner negativer Rest wird 0');
});
