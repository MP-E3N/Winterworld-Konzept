// @ts-check
/**
 * kessel.test.js — Dampfvorrat, Brennstoff, Heizung, Tag/Nacht und Kälte (M4a, Spieltest M4a).
 * REGEL: docs/specs/M4a-kessel-kaelte.md
 * DEBUG: Verbrauch stimmt nicht? ERZEUGUNG/MG_JE_DAMPF/GLUT_G_TICK in data/koloss.js und F3
 *        („Kessel …“) im Spiel.
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt, fahre, setzeAn } from './helfer.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { aussenTemperatur, nachStufe, laengsTempo, alsKmh } from '../sim/abfragen.js';
import { uhrzeit, tagNummer, dunkelheit } from '../sim/wetter/tag.js';
import { KESSEL_WAERME, HEIZUNG_ZIEL, TEMP_START, TEMP_RING, TEMP_NACHT, TAG_TICKS } from '../data/klima.js';
import { DAMPF_MAX, DAMPF_JE_STUFE, GLUT_G_TICK, HEIZUNG_MG_JE_ZEHNTEL } from '../data/koloss.js';

const MIN = 1200; // Ticks je Minute
const SEK = 20;
const OSTEN = 0;

/** @param {import('../sim/types.js').Zustand} state @param {number} n */
function ticks(state, n) {
  for (let i = 0; i < n; i++) tickAusfuehren(state);
}

/** @param {import('../sim/types.js').Koloss} k */
const kohle = (k) => k.lager.brennstoff.kohle;

test('Dampfvorrat: zu viel verlangt → der Druck fällt und das Tempo mit; langsamer → er erholt sich', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  gleich(k.dampf, DAMPF_MAX, 'voller Kessel beim Start');
  fahre(state, { telegraf: 8 }, 60 * SEK); // Äußerste Kraft bei Feuer „Mittel“
  const druckLeer = k.dampf, tempo = alsKmh(laengsTempo(k));
  pruefe(druckLeer < DAMPF_MAX * 0.7, `Druck nach 60 s ${druckLeer}`);
  pruefe(tempo < 25, `Tempo trotzdem ${tempo.toFixed(1)} km/h`);
  fahre(state, { telegraf: 5 }, 60 * SEK); // Langsam voraus
  pruefe(k.dampf > druckLeer + DAMPF_JE_STUFE, `Druck erholt sich nicht: ${k.dampf}`);
});

test('Dampfvorrat: stärkeres Feuer füllt schneller nach', () => {
  /** @param {number} feuer */
  function nachfuellen(feuer) {
    const { state, k } = testwelt();
    befehlAnwenden(state, { art: 'DRUCK', spieler: 0, stufe: feuer });
    k.dampf = 0; // nur in Tests: leerer Kessel
    ticks(state, 10 * SEK);
    return k.dampf;
  }
  pruefe(nachfuellen(4) > 2 * nachfuellen(2), 'Volldampf füllt nicht deutlich schneller');
  gleich(nachfuellen(0), 0, '„Kessel ruht“ füllt nichts');
});

test('Brennstoff: voller Kessel im Stand → nur Glut; langsam ist je km sparsamer als schnell', () => {
  const stand = testwelt();
  ticks(stand.state, MIN);
  const glut = 4000 - kohle(stand.k);
  pruefe(Math.abs(glut - (GLUT_G_TICK * MIN) / 1000) <= 1, `im Stand ${glut} kg/min`);
  /** @param {number} feuer @param {number} telegraf @returns {number} kg je km */
  function jeKm(feuer, telegraf) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { druck: feuer, telegraf }, 60 * SEK); // einschwingen
    const kg0 = kohle(k), x0 = k.x;
    fahre(state, {}, 60 * SEK);
    return (kg0 - kohle(k)) / ((k.x - x0) / 1e9);
  }
  const langsam = jeKm(1, 5), schnell = jeKm(4, 8);
  pruefe(schnell > 1.5 * langsam, `schnell ${schnell.toFixed(1)} kg/km, langsam ${langsam.toFixed(1)} kg/km`);
});

test('Brennstoff: Holz brennt doppelt so schnell, Öl halb so schnell; leer = Feuer aus, kein Wechsel', () => {
  /** @param {number} wahl @param {'kohle' | 'holz' | 'oel'} ware */
  function glut(wahl, ware) {
    const { state, k } = testwelt();
    k.lager.brennstoff.oel = 1000; // nur in Tests
    befehlAnwenden(state, { art: 'BRENNSTOFF', spieler: 0, wahl });
    const vorher = k.lager.brennstoff[ware];
    ticks(state, MIN);
    return vorher - k.lager.brennstoff[ware];
  }
  const g = (GLUT_G_TICK * MIN) / 1000;
  pruefe(Math.abs(glut(1, 'holz') - 2 * g) <= 1, `Holz ${glut(1, 'holz')} kg/min`);
  pruefe(Math.abs(glut(2, 'oel') - g / 2) <= 1, `Öl ${glut(2, 'oel')} kg/min`);
  const { state, k } = testwelt();
  k.lager.brennstoff.kohle = 0; // nur in Tests
  ticks(state, 5000);
  gleich(k.dampf, 0, 'Dampf ohne Feuer');
  gleich(k.lager.brennstoff.holz, 1000, 'Holz wird nicht von selbst verheizt (Nutzerentscheidung)');
  pruefe(befehlPruefen(state, { art: 'BRENNSTOFF', spieler: 0, wahl: 3 }) !== null, 'Brennstoff 3 erlaubt');
  pruefe(befehlPruefen(state, /** @type {any} */ ({ art: 'HEIZUNG', spieler: 0, an: 1 })) !== null, 'Heizung = 1 erlaubt');
});

/**
 * Heizung an und aus nebeneinander 5 min laufen lassen (im Stand, Feuer „Mittel“).
 * @param {number} xM  so weit draußen (Meter, kälter je weiter)
 * @returns {{mehrKg: number, waerme: number, luecke: number}}
 */
function heizen(xM) {
  const ohne = testwelt(), mit = testwelt();
  setzeAn(ohne.k, xM, 0); setzeAn(mit.k, xM, 0);
  pruefe(befehlAnwenden(mit.state, { art: 'HEIZUNG', spieler: 0, an: true }).ok, 'HEIZUNG');
  ticks(ohne.state, 6000);
  ticks(mit.state, 6000);
  const ohneHeizung = aussenTemperatur(mit.state, mit.k) + nachStufe(KESSEL_WAERME, mit.k.druck * DAMPF_JE_STUFE);
  return { mehrKg: kohle(ohne.k) - kohle(mit.k), waerme: mit.k.waerme, luecke: HEIZUNG_ZIEL - ohneHeizung };
}

test('Heizung: heizt immer auf +23 °C; je kälter draußen, desto mehr Brennstoff', () => {
  const nah = heizen(0), weit = heizen(6000);
  pruefe(Math.abs(nah.waerme - HEIZUNG_ZIEL) <= 3, `am Start an Bord ${nah.waerme}`);
  pruefe(Math.abs(weit.waerme - HEIZUNG_ZIEL) <= 3, `6 km draußen an Bord ${weit.waerme}`);
  // ±15 %: Der Wind (Windkälte) schwankt in den 5 min, die Lücke ist hier nur der Endwert.
  const erwartet = (nah.luecke * HEIZUNG_MG_JE_ZEHNTEL * 6000) / 1e6;
  pruefe(Math.abs(nah.mehrKg - erwartet) <= erwartet * 0.15, `Heizung kostet ${nah.mehrKg} kg in 5 min (Lücke ${nah.luecke})`);
  pruefe(weit.mehrKg > nah.mehrKg + 50, `draußen nicht teurer: ${weit.mehrKg} / ${nah.mehrKg} kg`);
});

test('Heizung: ist es ohne sie schon warm genug, kostet sie nichts', () => {
  const ohne = testwelt(), mit = testwelt();
  for (const w of [ohne, mit]) {
    befehlAnwenden(w.state, { art: 'DRUCK', spieler: 0, stufe: 4 });
    w.state.wetter.windStaerke = 0; // nur in Tests: windstill
  }
  befehlAnwenden(mit.state, { art: 'HEIZUNG', spieler: 0, an: true });
  ticks(ohne.state, 6000); ticks(mit.state, 6000);
  pruefe(ohne.k.waerme >= HEIZUNG_ZIEL, `Volldampf allein ${ohne.k.waerme}`);
  gleich(kohle(mit.k), kohle(ohne.k), 'gleich viel Kohle');
  gleich(mit.k.waerme, ohne.k.waerme, 'Heizung kühlt nicht');
});

test('Tag: Start 08:00, Mitternacht nach 16 Spielstunden dunkel, Dämmerung dazwischen, alle 20 min gleich', () => {
  gleich(uhrzeit(0), 480, 'Start');
  gleich(tagNummer(0), 1, 'erster Tag');
  gleich(dunkelheit(0), 0, 'morgens hell');
  gleich(uhrzeit(16000), 0, 'Mitternacht');
  gleich(tagNummer(16000), 2, 'zweiter Tag');
  gleich(dunkelheit(16000), 1000, 'Mitternacht dunkel');
  gleich(dunkelheit(12400), 500, '20:24 halb dunkel');
  for (let t = 0; t < TAG_TICKS; t += 777) gleich(dunkelheit(t), dunkelheit(t + TAG_TICKS), `Tick ${t}`);
});

test('Kälte: weiter draußen, nachts und bei Wind kälter', () => {
  const { state, k } = testwelt();
  const wind = Math.floor(state.wetter.windStaerke / 2);
  gleich(aussenTemperatur(state, k), TEMP_START - wind, 'Start bei Tag');
  setzeAn(k, 0, -6000);
  gleich(aussenTemperatur(state, k), TEMP_START + TEMP_RING - wind, '6 km draußen');
  state.tick = 16000; // nur in Tests: Mitternacht
  gleich(aussenTemperatur(state, k), TEMP_START + TEMP_RING + TEMP_NACHT - wind, 'draußen bei Nacht');
});

test('Wärme an Bord: nähert sich außen + Kesselwärme und bleibt nicht kurz davor hängen', () => {
  const { state, k } = testwelt();
  ticks(state, 8000);
  const ziel = aussenTemperatur(state, k) + nachStufe(KESSEL_WAERME, k.druck * DAMPF_JE_STUFE);
  pruefe(Math.abs(k.waerme - ziel) <= 2, `an Bord ${k.waerme}, Ziel ${ziel}`);
});
