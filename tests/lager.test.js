// @ts-check
/**
 * lager.test.js — Zwei Lager, Abwerfen, Umlagern, Holz-Ziel, Abwürfe wieder aufnehmen (Spieltest M4a).
 * REGEL: docs/specs/M4a-kessel-kaelte.md „Lager“
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, fahre } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { truppVon, inReichweite } from '../sim/abfragen.js';
import { lagerKg, lagerFrei, zielLager } from '../sim/koloss/lager.js';
import { fundId } from '../sim/welt/fundstellen.js';
import { LAGER, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { TELEGRAF_STOPP } from '../data/koloss.js';

/** Ruine des Testgeländes (Holz). */
const RUINE = fundId(-1, 0);

test('Lager: Brennstofflager 100 t, Warenlager 60 t; Start mit 4 t Kohle und 1 t Holz', () => {
  const { k } = testwelt();
  gleich(LAGER[BRENNSTOFFLAGER].kg, 100000, 'Brennstofflager');
  gleich(LAGER[WARENLAGER].kg, 60000, 'Warenlager');
  gleich(lagerKg(k, BRENNSTOFFLAGER), 5000, 'Start');
  gleich(lagerFrei(k, WARENLAGER), 60000, 'Warenlager leer');
  gleich(zielLager(k, 'kohle'), BRENNSTOFFLAGER, 'Kohle');
  gleich(zielLager(k, 'nahrung'), WARENLAGER, 'Vorräte');
  gleich(zielLager(k, 'holz'), BRENNSTOFFLAGER, 'Holz am Anfang');
});

test('Abwerfen: Ware verlässt das Lager und liegt als Haufen hinter dem Koloss, in Reichweite', () => {
  const { state, k } = testwelt();
  pruefe(befehlAnwenden(state, { art: 'ABWERFEN', spieler: 0, lager: 0, ware: 'kohle', kg: 1000 }).ok, 'abwerfen');
  pruefe(befehlAnwenden(state, { art: 'ABWERFEN', spieler: 0, lager: 0, ware: 'kohle', kg: 1000 }).ok, 'noch mal');
  gleich(k.lager.brennstoff.kohle, 2000, 'Lager');
  gleich(state.abwuerfe.length, 1, 'derselbe Haufen wächst');
  gleich(state.abwuerfe[0].kg, 2000, 'Haufen');
  pruefe(inReichweite(k, state.abwuerfe[0].x, state.abwuerfe[0].y), 'Haufen außer Reichweite');
  pruefe(befehlPruefen(state, { art: 'ABWERFEN', spieler: 0, lager: 0, ware: 'kohle', kg: 9999 }) !== null, 'mehr als da');
  pruefe(befehlPruefen(state, { art: 'ABWERFEN', spieler: 0, lager: 1, ware: 'kohle', kg: 1 }) !== null, 'Kohle aus dem Warenlager');
  pruefe(befehlPruefen(state, { art: 'ABWERFEN', spieler: 0, lager: 0, ware: 'gold', kg: 1 }) !== null, 'unbekannte Ware');
});

test('Abwurf wieder aufnehmen: Stück für Stück zurück ins Lager, dann wartet der Trupp', () => {
  const { state, k } = testwelt();
  befehlAnwenden(state, { art: 'BRENNSTOFF', spieler: 0, wahl: 1 }); // Holz verheizen, Kohle zählen
  befehlAnwenden(state, { art: 'ABWERFEN', spieler: 0, lager: 0, ware: 'kohle', kg: 1500 });
  pruefe(befehlAnwenden(state, { art: 'AUFNEHMEN', spieler: 0, abwurf: 0 }).ok, 'aufnehmen');
  for (let i = 0; i < 2000; i++) tickAusfuehren(state);
  gleich(k.lager.brennstoff.kohle, 4000, 'alles zurück');
  gleich(state.abwuerfe[0].kg, 0, 'Haufen leer');
  gleich(truppVon(state, k).abwurf, -1, 'Trupp wartet');
  pruefe(befehlPruefen(state, { art: 'AUFNEHMEN', spieler: 0, abwurf: 0 }) !== null, 'leeren Haufen aufnehmen erlaubt');
  pruefe(befehlPruefen(state, { art: 'AUFNEHMEN', spieler: 0, abwurf: 5 }) !== null, 'unbekannten Haufen erlaubt');
});

test('Holz: Ziel-Lager wählbar, Umlagern prüft Menge und Platz, Bergen legt Holz ins gewählte Lager', () => {
  const { state, k } = testwelt();
  pruefe(befehlAnwenden(state, { art: 'UMLAGERN', spieler: 0, nach: 1, kg: 600 }).ok, 'umlagern');
  gleich(k.lager.brennstoff.holz, 400, 'Brennstofflager');
  gleich(k.lager.waren.holz, 600, 'Warenlager');
  pruefe(befehlPruefen(state, { art: 'UMLAGERN', spieler: 0, nach: 1, kg: 401 }) !== null, 'mehr als da');
  pruefe(befehlAnwenden(state, { art: 'HOLZZIEL', spieler: 0, lager: 1 }).ok, 'Holz-Ziel');
  gleich(zielLager(k, 'holz'), WARENLAGER, 'Holz ins Warenlager');
  // Zur Ruine fahren (sie liegt knapp außer Reichweite) — hier einfach hinsetzen.
  k.x = -50000000; k.y = 20000000; // nur in Tests
  fahre(state, { telegraf: TELEGRAF_STOPP }, 1);
  pruefe(befehlAnwenden(state, { art: 'BERGEN_START', spieler: 0, fund: RUINE }).ok, 'Ruine bergen');
  for (let i = 0; i < 200; i++) tickAusfuehren(state);
  pruefe(k.lager.waren.holz > 600, `Holz kam nicht ins Warenlager: ${k.lager.waren.holz}`);
  gleich(k.lager.brennstoff.holz < 400 + 1, true, 'Holz landete im Brennstofflager');
});
