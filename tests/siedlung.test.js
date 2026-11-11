// @ts-check
/**
 * siedlung.test.js — Heimstatt: Depot, Crew, Heimat und Neustart, Gebäude, Spielstand (M4d).
 * REGEL: docs/specs/M4d-siedlung.md
 * DEBUG: Werte in data/siedlungen.js; im Spiel F3 („Siedlung …“) und ek.spielstand().
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, setzeAn } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { siedlungVon, siedlungImStand, depotMenge, gebaeudeAn } from '../sim/siedlung.js';
import { wrackMachen } from '../sim/koloss/wrack.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { spielstandText, spielstandLesen } from '../game/speichern.js';
import { BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { KOJEN, SIEDLUNGEN } from '../data/siedlungen.js';
import { VOLL, START_NAHRUNG_KG } from '../data/crew.js';
import { START_X, START_Y, UM_PRO_METER, DAMPF_MAX, TELEGRAF_STOPP } from '../data/koloss.js';

/** @param {import('../sim/types.js').Zustand} state @param {number} n */
function ticks(state, n) {
  for (let i = 0; i < n; i++) tickAusfuehren(state);
}

test('Siedlung: der Start liegt im Stand in der Heimstatt, 300 m weiter nicht mehr', () => {
  const w = testwelt();
  gleich(siedlungVon(w.k), 0, 'Start in der Siedlung');
  gleich(siedlungImStand(w.k), 0, 'im Stand');
  gleich(w.k.heimat, 0, 'Heimat');
  setzeAn(w.k, 300, -100);
  gleich(siedlungVon(w.k), -1, 'draußen');
});

test('Depot: einlagern und wieder holen nur im Stand in der Siedlung', () => {
  const w = testwelt();
  const ein = { art: /** @type {'EINLAGERN'} */ ('EINLAGERN'), spieler: 0, lager: BRENNSTOFFLAGER, ware: 'kohle', kg: 3000 };
  pruefe(befehlAnwenden(w.state, ein).ok, 'EINLAGERN');
  gleich(depotMenge(w.state, 0, 0, 'kohle'), 3000, 'Kohle im Depot');
  gleich(w.k.lager.brennstoff.kohle, 1000, 'Rest an Bord');
  pruefe(befehlPruefen(w.state, { ...ein, kg: 5000 }) !== null, 'mehr als an Bord abgelehnt');
  // Holz aus dem Warenlager kommt ins selbe Depotfach wie Holz aus dem Brennstofflager.
  w.k.lager.waren.holz = 500; // nur in Tests
  pruefe(befehlAnwenden(w.state, { art: 'EINLAGERN', spieler: 0, lager: WARENLAGER, ware: 'holz', kg: 500 }).ok, 'Holz einlagern');
  pruefe(befehlAnwenden(w.state, { art: 'AUSLAGERN', spieler: 0, lager: BRENNSTOFFLAGER, ware: 'holz', kg: 500 }).ok, 'Holz ins Brennstofflager holen');
  pruefe(befehlPruefen(w.state, { art: 'AUSLAGERN', spieler: 0, lager: WARENLAGER, ware: 'kohle', kg: 100 }) !== null, 'Kohle passt nicht ins Warenlager');
  pruefe(befehlPruefen(w.state, { art: 'AUSLAGERN', spieler: 0, lager: BRENNSTOFFLAGER, ware: 'oel', kg: 1 }) !== null, 'leeres Fach abgelehnt');
  // Fährt er (Telegraf nicht auf Stopp), geht nichts.
  befehlAnwenden(w.state, { art: 'TELEGRAF', spieler: 0, stufe: TELEGRAF_STOPP + 2 });
  pruefe(befehlPruefen(w.state, { ...ein, kg: 100 }) !== null, 'nicht im Stand abgelehnt');
  befehlAnwenden(w.state, { art: 'TELEGRAF', spieler: 0, stufe: TELEGRAF_STOPP });
  setzeAn(w.k, 300, -100);
  pruefe(befehlPruefen(w.state, { ...ein, kg: 100 }) !== null, 'außerhalb abgelehnt');
});

test('Wrack: Neustart in der Heimat, das Depot bleibt erhalten', () => {
  const w = testwelt();
  befehlAnwenden(w.state, { art: 'EINLAGERN', spieler: 0, lager: BRENNSTOFFLAGER, ware: 'kohle', kg: 2000 });
  setzeAn(w.k, 300, -100);
  wrackMachen(w.state, w.k);
  gleich(w.k.x, START_X, 'Neustart x'); gleich(w.k.y, START_Y, 'Neustart y');
  gleich(w.k.heimat, 0, 'Heimat bleibt');
  gleich(depotMenge(w.state, 0, 0, 'kohle'), 2000, 'Depot unverändert');
  pruefe(befehlAnwenden(w.state, { art: 'AUSLAGERN', spieler: 0, lager: BRENNSTOFFLAGER, ware: 'kohle', kg: 2000 }).ok, 'Kohle wieder holen');
});

test('Crew: in der Siedlung heilen, satt werden, keine Vorräte von Bord essen', () => {
  const w = testwelt();
  w.k.crew.gesundheit = VOLL / 10; w.k.crew.satt = 0; // nur in Tests
  ticks(w.state, 4 * 1200 + 100);
  gleich(w.k.crew.gesundheit, VOLL, 'gesund nach gut 4 min');
  gleich(w.k.crew.satt, VOLL, 'satt');
  gleich(w.k.lager.waren.nahrung, START_NAHRUNG_KG, 'Bordvorräte unberührt');
  gleich(w.k.crew.tote, 0, 'niemand gestorben');
});

test('Crew: anheuern bis zu den Kojen (gemischte Werte), absetzen nicht unter einen Mann', () => {
  const w = testwelt();
  w.k.crew.gesundheit = 0; // nur in Tests
  pruefe(befehlAnwenden(w.state, { art: 'CREW', spieler: 0, gruppe: 'arbeiter', anzahl: 1 }).ok, 'anheuern');
  gleich(w.k.crew.arbeiter, 7, 'ein Arbeiter mehr');
  gleich(w.k.crew.gesundheit, Math.floor(VOLL / 11), 'Neuer zieht die Gesundheit anteilig hoch');
  while (w.k.crew.heizer + w.k.crew.arbeiter < KOJEN) befehlAnwenden(w.state, { art: 'CREW', spieler: 0, gruppe: 'heizer', anzahl: 1 });
  pruefe(befehlPruefen(w.state, { art: 'CREW', spieler: 0, gruppe: 'heizer', anzahl: 1 }) !== null, 'Kojen voll');
  w.k.crew.heizer = 0; w.k.crew.arbeiter = 1; // nur in Tests
  pruefe(befehlPruefen(w.state, { art: 'CREW', spieler: 0, gruppe: 'arbeiter', anzahl: -1 }) !== null, 'letzter Mann bleibt');
  pruefe(befehlPruefen(w.state, { art: 'CREW', spieler: 0, gruppe: 'heizer', anzahl: -1 }) !== null, 'leere Gruppe');
  pruefe(befehlPruefen(w.state, { art: 'CREW', spieler: 0, gruppe: 'arbeiter', anzahl: 2 }) !== null, 'nur ±1');
});

test('Siedlung: Gebäude sind Hindernisse, der Platz davor ist frei', () => {
  const s = SIEDLUNGEN[0], h = s.gebaeude.find((g) => g.art === 'huette');
  if (!h) throw new Error('keine Hütte');
  pruefe(gebaeudeAn((s.x + h.dx) * UM_PRO_METER, (s.y + h.dy) * UM_PRO_METER), 'Hütte blockiert');
  pruefe(!gebaeudeAn(0, 0), 'Parkplatz frei');
  // Rückwärts in die Siedlung: Der Koloss bleibt vor den Hütten stehen statt hineinzufahren.
  const w = testwelt();
  befehlAnwenden(w.state, { art: 'DRUCK', spieler: 0, stufe: 4 });
  w.k.dampf = DAMPF_MAX; // nur in Tests: voller Kessel
  befehlAnwenden(w.state, { art: 'TELEGRAF', spieler: 0, stufe: 0 });
  ticks(w.state, 60 * 20);
  pruefe(w.k.y < (s.y + 20) * UM_PRO_METER, `fährt durch die Hütten: y ${w.k.y / UM_PRO_METER} m`);
});

test('Spielstand: hin und zurück gleich, falsche Version wird nicht geladen', () => {
  const w = testwelt();
  ticks(w.state, 50);
  const text = spielstandText(w.state, 0, '2026-11-11T12:00:00Z');
  const zurueck = spielstandLesen(text);
  pruefe(zurueck !== null, 'gelesen');
  gleich(zustandsHash(/** @type {any} */ (zurueck).zustand), zustandsHash(w.state), 'gleicher Hash');
  gleich(/** @type {any} */ (zurueck).spieler, 0, 'Spielernummer');
  const alt = JSON.parse(text); alt.version = 1;
  gleich(spielstandLesen(JSON.stringify(alt)), null, 'alte Version');
  gleich(spielstandLesen('kaputt{'), null, 'kaputter Text');
});
