// @ts-check
/**
 * laternen.test.js — Laternen als temporäre Wegpunkte, Suchscheinwerfer an/aus (Spieltest M5b).
 * REGEL: data/laternen.js
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { brennendeLaternen, laterneBrennt } from '../sim/laternen.js';
import { rumpfMitte } from '../sim/abfragen.js';
import { LATERNEN_MAX, LATERNE_DAUER_TICKS, LATERNE_HINTER_M } from '../data/laternen.js';
import { UM_PRO_METER } from '../data/koloss.js';

test('Laterne: wird hinter dem Heck gesetzt und brennt LATERNE_DAUER_TICKS lang', () => {
  const w = testwelt();
  pruefe(befehlAnwenden(w.state, { art: 'LATERNE', spieler: 0 }).ok, 'LATERNE');
  const l = w.state.laternen[0], m = rumpfMitte(w.k);
  const abstand = Math.hypot(l.x - m.x, l.y - m.y) / UM_PRO_METER;
  pruefe(Math.abs(abstand - LATERNE_HINTER_M) < 1, `Abstand ${abstand} m`);
  // Bug nach Norden (−y) → hinter dem Heck = südlich (größeres y).
  pruefe(l.y > m.y, 'hinten, nicht vorn');
  pruefe(laterneBrennt(l, LATERNE_DAUER_TICKS - 1), 'brennt noch');
  pruefe(!laterneBrennt(l, LATERNE_DAUER_TICKS), 'erloschen');
});

test('Laterne: höchstens fünf brennen; die sechste löscht die älteste', () => {
  const w = testwelt();
  for (let i = 0; i < LATERNEN_MAX + 1; i++) { befehlAnwenden(w.state, { art: 'LATERNE', spieler: 0 }); w.state.tick += 10; }
  const brennend = brennendeLaternen(w.state, 0);
  gleich(brennend.length, LATERNEN_MAX, 'fünf brennen');
  pruefe(!brennend.some((l) => l.id === 0), 'die erste ist erloschen');
  gleich(w.state.laternen.length, LATERNEN_MAX + 1, 'Liste ohne Löcher');
});

test('Suchscheinwerfer: an/aus über den Befehl, Unsinn abgelehnt', () => {
  const w = testwelt();
  gleich(w.k.sucher, 0, 'aus beim Start');
  befehlAnwenden(w.state, { art: 'SUCHER', spieler: 0, an: true });
  gleich(w.k.sucher, 1, 'an');
  pruefe(befehlPruefen(w.state, /** @type {any} */ ({ art: 'SUCHER', spieler: 0, an: 'ja' })) !== null, 'kein Wahrheitswert');
});
