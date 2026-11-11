// @ts-check
/**
 * wrack.test.js — Liegenbleiben: Crew tot oder kein Brennstoff → Wrack, Ladung als Haufen, Neustart (M4c).
 * REGEL: docs/specs/M4c-liegenbleiben.md
 * DEBUG: Werte in data/wrack.js; im Spiel F3 („Wrack …“).
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, setzeAn } from './helfer.js';
import { tickAusfuehren } from '../sim/tick.js';
import { GNADENFRIST_TICKS } from '../data/wrack.js';
import { START_X, START_Y } from '../data/koloss.js';

/** @param {import('../sim/types.js').Zustand} state @param {number} n */
function ticks(state, n) {
  for (let i = 0; i < n; i++) tickAusfuehren(state);
}

test('Liegenbleiben: Crew tot → Wrack mit Ladung als Haufen, Neustart am Startpunkt', () => {
  const w = testwelt();
  setzeAn(w.k, 300, -100, 0);
  w.k.crew.heizer = 0; w.k.crew.arbeiter = 0; // nur in Tests
  ticks(w.state, 1);
  gleich(w.state.wracks.length, 1, 'ein Wrack');
  pruefe(w.state.abwuerfe.some((a) => a.ware === 'kohle' && a.kg > 3000), 'Kohle liegt beim Wrack');
  gleich(w.k.x, START_X, 'Neustart x'); gleich(w.k.y, START_Y, 'Neustart y');
  gleich(w.k.crew.arbeiter, 6, 'neue Crew');
  gleich(w.state.trupps[w.k.trupp].leute, 6, 'Trupp wieder voll');
});

test('Liegenbleiben: ohne Brennstoff und Druck erst nach der Gnadenfrist', () => {
  const w = testwelt();
  w.k.lager.brennstoff = { kohle: 0, holz: 0, oel: 0 }; // nur in Tests
  w.k.dampf = 0;
  ticks(w.state, GNADENFRIST_TICKS - 2);
  gleich(w.state.wracks.length, 0, 'noch in der Frist');
  ticks(w.state, 3);
  gleich(w.state.wracks.length, 1, 'nach der Frist liegen geblieben');
});

test('Liegenbleiben: Holz im Warenlager zählt als Brennstoff (umlagern geht noch)', () => {
  const w = testwelt();
  w.k.lager.brennstoff = { kohle: 0, holz: 0, oel: 0 }; // nur in Tests
  w.k.lager.waren.holz = 500;
  w.k.dampf = 0;
  ticks(w.state, GNADENFRIST_TICKS + 10);
  gleich(w.state.wracks.length, 0, 'kein Wrack, solange Holz an Bord ist');
});
