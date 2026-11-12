// @ts-check
/**
 * auftrag.test.js — Rettungsauftrag: Ort aus dem Seed, Signal, Einsteigen, Ankunft, Verlust (M5b).
 * REGEL: docs/specs/M5b-rettung.md
 * DEBUG: Werte in data/auftrag.js; im Spiel ek.auftrag() und F3 („Auftrag …“).
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, setzeAn } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { rettungsOrt, auftragErfuellt } from '../sim/auftrag.js';
import { befahrbarAn } from '../sim/welt/untergrund.js';
import { wrackMachen } from '../sim/koloss/wrack.js';
import { RUMPF_VOR_DREHPUNKT_M, UM_PRO_METER } from '../data/koloss.js';
import {
  UEBERLEBENDE, REGION_ABSTAND_MIN_M, REGION_ABSTAND_MAX_M, REGION_RADIUS_M, SIGNAL_SICHT_M, TEST_LAGER,
} from '../data/auftrag.js';
import { KOJEN } from '../data/siedlungen.js';

const NORDEN = 49152;

/**
 * Stellt den Koloss so, dass seine Rumpfmitte bei (xM, yM) liegt (Bug nach Norden). NUR in Tests.
 * @param {import('../sim/types.js').Koloss} k @param {number} xM @param {number} yM
 */
function rumpfAn(k, xM, yM) {
  setzeAn(k, xM, yM + RUMPF_VOR_DREHPUNKT_M, NORDEN);
}

test('Auftrag: Region ~5 km vom Start, Lager in der Region auf befahrbarem Boden, je Seed gleich', () => {
  for (const seed of [1, 2, 3, 4711, 99]) {
    const o = rettungsOrt(seed);
    const weit = Math.hypot(o.region.x, o.region.y);
    pruefe(weit >= REGION_ABSTAND_MIN_M - 2 && weit <= REGION_ABSTAND_MAX_M + 2, `Seed ${seed}: Region ${Math.round(weit)} m`);
    pruefe(Math.hypot(o.lager.x - o.region.x, o.lager.y - o.region.y) <= REGION_RADIUS_M, `Seed ${seed}: Lager außerhalb der Region`);
    pruefe(befahrbarAn(seed, o.lager.x * UM_PRO_METER, o.lager.y * UM_PRO_METER), `Seed ${seed}: Lager nicht befahrbar`);
    gleich(JSON.stringify(rettungsOrt(seed)), JSON.stringify(o), 'deterministisch');
  }
});

test('Auftrag: Signalballon erst ab ~1 km, dann bleibt er', () => {
  const w = testwelt();
  gleich(w.state.auftrag.gesichtet, 0, 'am Start nicht');
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + SIGNAL_SICHT_M + 50);
  tickAusfuehren(w.state);
  gleich(w.state.auftrag.gesichtet, 0, 'knapp zu weit');
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + SIGNAL_SICHT_M - 50);
  tickAusfuehren(w.state);
  gleich(w.state.auftrag.gesichtet, 1, 'gesichtet');
  setzeAn(w.k, 0, 0, NORDEN);
  tickAusfuehren(w.state);
  gleich(w.state.auftrag.gesichtet, 1, 'bleibt oben');
});

test('Retten: nur nah am Lager und im Stand; so viele, wie Kojen frei sind', () => {
  const w = testwelt();
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + 200);
  pruefe(befehlPruefen(w.state, { art: 'RETTEN', spieler: 0 }) !== null, 'zu weit');
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + 30);
  w.k.crew.arbeiter = KOJEN - w.k.crew.heizer - 3; // nur in Tests: nur 3 Kojen frei
  pruefe(befehlAnwenden(w.state, { art: 'RETTEN', spieler: 0 }).ok, 'RETTEN');
  gleich(w.k.crew.passagiere, 3, 'drei an Bord');
  gleich(w.state.auftrag.leute, UEBERLEBENDE - 3, 'Rest wartet');
  pruefe(befehlPruefen(w.state, { art: 'RETTEN', spieler: 0 }) !== null, 'Kojen voll');
  pruefe(w.k.crew.gesundheit < 1000000, 'Gerettete sind geschwächt (Werte gemischt)');
});

test('Retten: Ankunft in der Heimstatt zählt als gerettet, dann ist der Auftrag erfüllt', () => {
  const w = testwelt();
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + 30);
  befehlAnwenden(w.state, { art: 'RETTEN', spieler: 0 });
  gleich(w.k.crew.passagiere, UEBERLEBENDE, 'alle an Bord');
  pruefe(!auftragErfuellt(w.state), 'unterwegs noch nicht erfüllt');
  setzeAn(w.k, 0, 0, NORDEN); // nur in Tests: zurück am Parkplatz der Heimstatt
  tickAusfuehren(w.state);
  gleich(w.state.auftrag.gerettet, UEBERLEBENDE, 'gerettet');
  gleich(w.k.crew.passagiere, 0, 'ausgestiegen');
  pruefe(auftragErfuellt(w.state), 'erfüllt');
});

test('Retten: bleibt der Koloss mit Geretteten liegen, sind sie verloren', () => {
  const w = testwelt();
  rumpfAn(w.k, TEST_LAGER.x, TEST_LAGER.y + 30);
  befehlAnwenden(w.state, { art: 'RETTEN', spieler: 0 });
  wrackMachen(w.state, w.k);
  gleich(w.state.auftrag.verloren, UEBERLEBENDE, 'verloren');
  gleich(w.k.crew.passagiere, 0, 'neuer Koloss ohne Passagiere');
});
