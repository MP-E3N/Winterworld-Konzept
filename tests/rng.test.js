// @ts-check
/**
 * rng.test.js — Tests für den Zufallsgenerator (sim/lib/rng.js).
 * REGEL: CLAUDE.md Regel 2
 */

import { test, pruefe, gleich } from './harness.js';
import { rngAusSeed, rngZahl, rngBereich, rngGewichtet } from '../sim/lib/rng.js';
import { neuerZustand } from '../sim/zustand.js';

test('Zufall: gleicher Seed ergibt die gleiche Folge', () => {
  const a = neuerZustand(123), b = neuerZustand(123);
  for (let i = 0; i < 1000; i++) gleich(rngZahl(a), rngZahl(b), `Wurf ${i}`);
});

test('Zufall: verschiedene Seeds ergeben verschiedene Folgen', () => {
  const a = neuerZustand(1), b = neuerZustand(2);
  let gleiche = 0;
  for (let i = 0; i < 100; i++) if (rngZahl(a) === rngZahl(b)) gleiche += 1;
  pruefe(gleiche < 3, `zu viele gleiche Würfe: ${gleiche}`);
});

test('Zufall: Startzustand besteht aus vier positiven 32-Bit-Ganzzahlen', () => {
  const r = rngAusSeed(99);
  gleich(r.length, 4, 'Länge');
  for (const x of r) pruefe(Number.isInteger(x) && x >= 0 && x <= 0xffffffff, `ungültig: ${x}`);
});

test('Zufall: rngBereich bleibt in den Grenzen und trifft beide Enden', () => {
  const s = neuerZustand(7);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < 5000; i++) {
    const x = rngBereich(s, 3, 9);
    min = Math.min(min, x); max = Math.max(max, x);
  }
  gleich(min, 3, 'kleinster Wert');
  gleich(max, 9, 'größter Wert');
});

test('Zufall: rngGewichtet wählt nie ein Gewicht 0 und ungefähr nach Verhältnis', () => {
  const s = neuerZustand(5);
  const zaehler = [0, 0, 0];
  for (let i = 0; i < 6000; i++) zaehler[rngGewichtet(s, [2, 0, 1])] += 1;
  gleich(zaehler[1], 0, 'Index mit Gewicht 0');
  // Erwartet 4000 : 2000. Großzügige Grenze, damit der Test nicht zufällig scheitert.
  pruefe(zaehler[0] > 3700 && zaehler[0] < 4300, `Verhältnis falsch: ${zaehler}`);
});
