// @ts-check
/**
 * bergen.test.js — Fundstellen aus dem Seed, Bergen, Laderaum und Gewicht (M3).
 * REGEL: docs/specs/M3-fundstellen.md
 * DEBUG: Schlägt die Verteilung fehl, Werte in data/fundstellen.js prüfen und mit `ek.funde()` im
 *        Spiel nachsehen.
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, fahre, setzeAn } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { fundstelleInZelle, fundstelleMitId, fundstellenImBereich, fundId } from '../sim/welt/fundstellen.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { fundRest, truppVon } from '../sim/abfragen.js';
import { PACKSCHNEE, PULVERSCHNEE } from '../data/untergrund.js';
import { FUNDARTEN, OELFAESSER, LAGER, START_ABSTAND_M, OEL_AB_M } from '../data/fundstellen.js';
import { UM_PRO_METER, TELEGRAF_STOPP } from '../data/koloss.js';

const M = UM_PRO_METER;
/** Kohlehalde des Testgeländes (data/testgelaende.js), vom Start aus in Reichweite. */
const KOHLE = fundId(0, -1);
/** Ruine des Testgeländes, vom Start aus knapp außer Reichweite. */
const RUINE = fundId(-1, 0);

/**
 * Fundstellen in einem Quadrat um den Start (Meter).
 * @param {number} seed @param {number} halbM
 */
function funde(seed, halbM) {
  return fundstellenImBereich(seed, -halbM * M, -halbM * M, halbM * M, halbM * M);
}

/**
 * Testwelt mit leeren Lagern bis auf 5 t Holz, und die Heizer verfeuern Holz — so zählt in
 * diesen Tests nur, was geborgen wird (seit M4a verbrennt der Kessel Kohle aus dem Brennstofflager).
 * NUR in Tests: setzt Zustand direkt.
 */
function bergewelt() {
  const w = testwelt();
  w.k.lager = { brennstoff: { kohle: 0, holz: 5000, oel: 0 }, waren: { holz: 0, nahrung: 0 } };
  w.k.brennstoff = 1;
  return w;
}

/**
 * @param {import('../sim/types.js').Zustand} state
 * @param {number} fund
 */
function bergen(state, fund) {
  return befehlAnwenden(state, { art: 'BERGEN_START', spieler: 0, fund });
}

test('Fundstellen: gleicher Seed ergibt dieselben Fundstellen, die ID führt zurück zur Fundstelle', () => {
  const a = funde(4711, 1500), b = funde(4711, 1500);
  gleich(JSON.stringify(a), JSON.stringify(b), 'zweimal berechnet');
  pruefe(a.length > 10, `nur ${a.length} Fundstellen in 3 × 3 km`);
  for (const f of a) gleich(JSON.stringify(fundstelleMitId(4711, f.id)), JSON.stringify(f), 'ID → Fundstelle');
  pruefe(JSON.stringify(funde(4712, 1500)) !== JSON.stringify(a), 'anderer Seed, gleiche Fundstellen');
  gleich(fundstelleMitId(4711, -1), null, 'ID −1');
});

test('Fundstellen: nur auf Schnee, nie am Startpunkt, in Startnähe meist welche — aber knapp (20 Seeds)', () => {
  // M5b (Nutzerwunsch „Rohstoffe viel weniger“): Nicht mehr in jeder Welt liegt etwas am Start.
  let mitFund = 0, gesamt = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const liste = funde(seed, 1000);
    for (const f of liste) {
      const boden = untergrundAn(seed, f.x, f.y);
      pruefe(boden === PACKSCHNEE || boden === PULVERSCHNEE, `Seed ${seed}: Fundstelle auf Untergrund ${boden}`);
      const xm = f.x / M, ym = f.y / M;
      pruefe(xm * xm + ym * ym >= START_ABSTAND_M * START_ABSTAND_M, `Seed ${seed}: Fundstelle am Startpunkt`);
      gleich(f.menge % FUNDARTEN[f.art].stueckKg, 0, 'Menge ist ganze Stücke');
    }
    const nah = liste.filter((f) => Math.hypot(f.x / M, f.y / M) < 450);
    if (nah.length > 0) mitFund += 1;
    gesamt += nah.length;
  }
  pruefe(mitFund >= 14, `nur ${mitFund} von 20 Welten haben eine Fundstelle in 450 m`);
  pruefe(gesamt <= 20 * 6, `zu viele Fundstellen am Start: ${gesamt} in 20 Welten`);
});

test('Fundstellen: Öl liegt nie näher als 1,5 km, weiter draußen gibt es welches', () => {
  let draussen = 0;
  for (let seed = 1; seed <= 5; seed++) {
    for (const f of funde(seed, 5000)) {
      if (f.art !== OELFAESSER) continue;
      pruefe(Math.max(Math.abs(f.x), Math.abs(f.y)) >= OEL_AB_M * M, `Seed ${seed}: Öl bei ${f.x / M}/${f.y / M}`);
      draussen += 1;
    }
  }
  pruefe(draussen >= 10, `nur ${draussen} Ölfässer in 5 Welten`);
});

test('Bergen: abgelehnt bei Fahrt, Telegraf nicht auf Stopp, außer Reichweite oder unbekannter Fundstelle', () => {
  const { state, k } = testwelt();
  gleich(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }), null, 'im Stand neben der Kohlehalde');
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: RUINE }) !== null, 'Ruine ist zu weit weg');
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: fundId(5, 5) }) !== null, 'Zelle ohne Fundstelle');
  pruefe(befehlPruefen(state, /** @type {any} */ ({ art: 'BERGEN_START', spieler: 0, fund: 'x' })) !== null, 'Unsinn als ID');
  fahre(state, { telegraf: TELEGRAF_STOPP + 1 }, 100);
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }) !== null, 'Telegraf voraus erlaubt');
  fahre(state, { telegraf: TELEGRAF_STOPP }, 1);
  pruefe(k.vx !== 0 || k.vy !== 0, 'rollt noch');
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }) !== null, 'beim Ausrollen erlaubt');
});

test('Bergen: Stück für Stück in den Laderaum, bis die Fundstelle leer ist; dann wartet der Trupp', () => {
  const { state, k } = bergewelt();
  const f = /** @type {import('../sim/welt/fundstellen.js').Fundstelle} */ (fundstelleMitId(0, KOHLE));
  const art = FUNDARTEN[f.art];
  pruefe(bergen(state, KOHLE).ok, 'Start');
  const tickJeStueck = Math.ceil(art.arbeit / truppVon(state, k).leute);
  for (let i = 0; i < tickJeStueck - 1; i++) tickAusfuehren(state);
  gleich(k.lager.brennstoff.kohle, 0, 'vor dem ersten Stück');
  tickAusfuehren(state);
  gleich(k.lager.brennstoff.kohle, art.stueckKg, 'erstes Stück');
  gleich(fundRest(state, f), f.menge - art.stueckKg, 'Rest der Fundstelle');
  for (let i = 0; i < tickJeStueck * 40; i++) tickAusfuehren(state);
  gleich(k.lager.brennstoff.kohle, f.menge, 'alles geborgen');
  gleich(fundRest(state, f), 0, 'Fundstelle leer');
  gleich(truppVon(state, k).fund, -1, 'Trupp wartet');
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }) !== null, 'leere Fundstelle erlaubt');
});

test('Bergen: Losfahren bricht ab, BERGEN_ABBRECHEN auch', () => {
  const { state, k } = bergewelt();
  pruefe(bergen(state, KOHLE).ok, 'Start');
  fahre(state, {}, 10);
  gleich(truppVon(state, k).fund, KOHLE, 'arbeitet');
  fahre(state, { telegraf: TELEGRAF_STOPP + 1 }, 1);
  gleich(truppVon(state, k).fund, -1, 'nach dem Losfahren');
  const { state: s2, k: k2 } = bergewelt();
  pruefe(bergen(s2, KOHLE).ok, 'Start 2');
  pruefe(befehlAnwenden(s2, { art: 'BERGEN_ABBRECHEN', spieler: 0 }).ok, 'Abbrechen');
  fahre(s2, {}, 100);
  gleich(k2.lager.brennstoff.kohle, 0, 'nach Abbruch nichts geborgen');
});

test('Bergen: volles Lager beendet das Bergen und lässt keinen neuen Auftrag zu', () => {
  const { state, k } = bergewelt();
  k.lager.brennstoff.holz = LAGER[0].kg - 600; // nur in Tests: Brennstofflager fast voll (Holz wird verheizt, aber kaum)
  pruefe(bergen(state, KOHLE).ok, 'Start mit 600 kg frei');
  for (let i = 0; i < 400; i++) tickAusfuehren(state);
  gleich(k.lager.brennstoff.kohle, 500, 'nur ein Stück passte');
  gleich(truppVon(state, k).fund, -1, 'Trupp wartet');
  pruefe(befehlPruefen(state, { art: 'BERGEN_START', spieler: 0, fund: KOHLE }) !== null, 'voller Laderaum erlaubt');
});

test('Gewicht: volle Lager machen den Koloss langsamer, fast leer kaum', () => {
  const leer = testwelt(), voll = testwelt();
  leer.k.lager = { brennstoff: { kohle: 1000, holz: 0, oel: 0 }, waren: { holz: 0, nahrung: 0 } };
  voll.k.lager = { brennstoff: { kohle: LAGER[0].kg, holz: 0, oel: 0 }, waren: { holz: 0, nahrung: LAGER[1].kg } };
  for (const w of [leer, voll]) { setzeAn(w.k, 0, 2000, 0); fahre(w.state, { druck: 4, gas: 100 }, 400); }
  const v = (/** @type {import('../sim/types.js').Koloss} */ k) => Math.hypot(k.vx, k.vy);
  pruefe(v(voll.k) < v(leer.k) * 0.85, `beladen ${v(voll.k)} vs. leer ${v(leer.k)}`);
  pruefe(v(voll.k) > v(leer.k) * 0.5, 'beladen viel zu langsam');
});
