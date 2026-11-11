// @ts-check
/**
 * crew.test.js — Crew: Essen, Kälte, Hunger, Krankheit, Sterben, Moral (M4b).
 * REGEL: docs/specs/M4b-crew.md
 * DEBUG: Werte stimmen nicht? data/crew.js und F3 („Crew …“) im Spiel.
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, setzeAn } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { truppVon } from '../sim/abfragen.js';
import { fundId } from '../sim/welt/fundstellen.js';
import { kranke, gesundeArbeiter } from '../sim/koloss/crew.js';
import { VOLL, START_HEIZER, START_ARBEITER, START_NAHRUNG_KG, ESSEN_KG_TAG, STERBEN_UNTER, TOD_MORAL } from '../data/crew.js';
import { TAG_TICKS } from '../data/klima.js';

const MIN = 1200; // Ticks je Minute
/** Kohlehalde des Testgeländes, vom Start aus in Reichweite (wie in bergen.test.js). */
const KOHLE = fundId(0, -1);

/**
 * Testwelt mit dem Koloss draußen vor der Siedlung (M4d): In der Siedlung heilt und isst die Crew dort.
 * @returns {ReturnType<typeof testwelt>}
 */
function draussen() {
  const w = testwelt();
  setzeAn(w.k, 0, -150); // nur in Tests
  return w;
}

/** @param {import('../sim/types.js').Zustand} state @param {number} n */
function ticks(state, n) {
  for (let i = 0; i < n; i++) tickAusfuehren(state);
}

/**
 * Wärme an Bord festhalten (NUR in Tests): Der Kessel würde sie jeden Tick neu setzen, darum
 * vor jedem Tick überschreiben.
 * @param {ReturnType<typeof testwelt>} w @param {number} n @param {number} waerme  Zehntel °C
 */
function ticksBei(w, n, waerme) {
  for (let i = 0; i < n; i++) { w.k.waerme = waerme; tickAusfuehren(w.state); }
}

test('Crew: Start mit 4 Heizern, 6 Arbeitern, satt und gesund; Trupp = 6 gesunde Arbeiter', () => {
  const { k, state } = testwelt();
  gleich(k.crew.heizer, START_HEIZER, 'Heizer');
  gleich(k.crew.arbeiter, START_ARBEITER, 'Arbeiter');
  gleich(k.crew.gesundheit, VOLL, 'gesund');
  gleich(k.lager.waren.nahrung, START_NAHRUNG_KG, 'Vorräte');
  gleich(truppVon(state, k).leute, START_ARBEITER, 'Trupp');
});

test('Essen: 10 Leute essen 10 kg je Kopf und Spieltag; ohne Vorräte sinkt die Sattheit', () => {
  const w = draussen();
  ticksBei(w, TAG_TICKS, 150);
  const gegessen = START_NAHRUNG_KG - w.k.lager.waren.nahrung;
  pruefe(Math.abs(gegessen - 10 * ESSEN_KG_TAG) <= 1, `gegessen ${gegessen} kg`);
  gleich(w.k.crew.satt, VOLL, 'satt mit Vorräten');
  w.k.lager.waren.nahrung = 0; // nur in Tests
  ticksBei(w, TAG_TICKS / 2, 150);
  pruefe(w.k.crew.satt < VOLL * 0.55 && w.k.crew.satt > VOLL * 0.45, `nach halbem Tag ${w.k.crew.satt}`);
});

test('Kälte: unter 0 °C an Bord sinkt die Gesundheit, Kranke entstehen; warm + satt erholt sich', () => {
  const w = draussen();
  ticksBei(w, 4 * MIN, -100); // −10 °C
  const g = w.k.crew.gesundheit;
  pruefe(g < VOLL * 0.6 && g > VOLL * 0.4, `nach 4 min bei −10 °C ${g}`);
  pruefe(kranke(w.k.crew.arbeiter, w.k.crew) >= 2, 'Kranke unter den Arbeitern');
  gleich(truppVon(w.state, w.k).leute, gesundeArbeiter(w.k.crew), 'Trupp = gesunde Arbeiter');
  ticksBei(w, 4 * MIN, 150); // +15 °C, satt
  pruefe(w.k.crew.gesundheit > g + VOLL * 0.15, `erholt sich nicht: ${w.k.crew.gesundheit}`);
});

test('Hunger: lange ohne Vorräte macht krank', () => {
  const w = draussen();
  w.k.lager.waren.nahrung = 0; // nur in Tests
  ticksBei(w, TAG_TICKS + 5 * MIN, 150);
  pruefe(w.k.crew.gesundheit < VOLL * 0.8, `nach einem Hungertag ${w.k.crew.gesundheit}`);
});

test('Bergen: kranke Arbeiter bergen langsamer, ohne Gesunde gar nicht', () => {
  /** @param {number} gesundheit @returns {number} kg Kohle nach 30 s */
  function geborgen(gesundheit) {
    const w = testwelt();
    w.k.crew.gesundheit = gesundheit; // nur in Tests
    const vorher = w.k.lager.brennstoff.kohle;
    pruefe(befehlAnwenden(w.state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }).ok, 'BERGEN_START');
    ticksBei(w, 30 * 20, 150);
    return w.k.lager.brennstoff.kohle - vorher;
  }
  pruefe(geborgen(VOLL) > geborgen(VOLL / 2) + 1000, 'halb krank birgt nicht langsamer');
  const w = testwelt();
  w.k.crew.gesundheit = 0; // nur in Tests
  ticksBei(w, 1, 150);
  pruefe(befehlPruefen(w.state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }) !== null, 'ohne Gesunde abgelehnt');
});

test('Sterben: unter 25 % Gesundheit stirbt nach und nach jemand, die Moral sinkt', () => {
  const w = draussen();
  w.k.crew.gesundheit = 0; // nur in Tests
  const moral = w.k.crew.moral;
  ticksBei(w, MIN + 1, -100);
  gleich(w.k.crew.tote, 1, 'ein Toter nach einer Minute bei 0 %');
  gleich(w.k.crew.arbeiter, START_ARBEITER - 1, 'zuerst ein Arbeiter (größere Gruppe)');
  pruefe(w.k.crew.moral <= moral - TOD_MORAL, `Moral ${w.k.crew.moral}`);
  const gesund = draussen();
  gesund.k.crew.gesundheit = STERBEN_UNTER; // nur in Tests: genau an der Grenze
  ticksBei(gesund, 5 * MIN, 150);
  gleich(gesund.k.crew.tote, 0, 'an der Grenze stirbt niemand');
});
