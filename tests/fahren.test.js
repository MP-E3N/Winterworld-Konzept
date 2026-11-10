// @ts-check
/**
 * fahren.test.js — Tests für die Fahrphysik (sim/koloss/fahren.js).
 * REGEL: KONZEPT.md §3 „Fahrgefühl“, data/koloss.js, data/untergrund.js
 *
 * Testorte: (0, 2000) liegt weit weg von allen Testflächen (reiner Packschnee).
 * Für Eis/Pulverschnee läuft der Koloss auf einem „Laufband“: Nach jedem Tick wird er an die
 * Ausgangsstelle zurückgesetzt, das Tempo bleibt. So misst man Höchsttempi ohne Platzproblem.
 */

import { test, pruefe } from './harness.js';
import { testwelt, fahre, setzeAn } from './helfer.js';
import { tickAusfuehren } from '../sim/tick.js';
import { befehlAnwenden } from '../sim/befehle.js';
import { laengsTempo, querTempo, alsKmh } from '../sim/abfragen.js';
import { DRUCKSTUFEN, RUECKWAERTS_KMH, TELEGRAF, TELEGRAF_STOPP, WENDE_RADIUS } from '../data/koloss.js';
import { TICKS_PRO_SEKUNDE } from '../data/takt.js';

const SEK = TICKS_PRO_SEKUNDE;
const OSTEN = 0;

/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {import('../sim/types.js').Koloss} Koloss */

/**
 * Fährt auf der Stelle (Laufband) und gibt das Längstempo in km/h zurück.
 * @param {number} xM @param {number} yM @param {number} druck @param {number} ticks
 * @returns {number}
 */
function laufband(xM, yM, druck, ticks) {
  const { state, k } = testwelt();
  setzeAn(k, xM, yM, OSTEN);
  fahre(state, { gas: 100, druck }, 0);
  for (let i = 0; i < ticks; i++) {
    tickAusfuehren(state);
    k.x = xM * 1000000; k.y = yM * 1000000;
  }
  return alsKmh(laengsTempo(k));
}

test('Fahren: ohne Gas bleibt der Koloss exakt stehen', () => {
  const { state, k } = testwelt();
  // Nur die Lage zählt — Brennstoff und Wärme an Bord ändern sich auch im Stand (M4a).
  const lage = () => JSON.stringify([k.x, k.y, k.vx, k.vy, k.h, k.dreh]);
  const vorher = lage();
  fahre(state, { lenkung: 100 }, 200);
  pruefe(lage() === vorher, `bewegt: ${lage()}`);
});

test('Fahren: Volldampf auf Packschnee erreicht das Höchsttempo (34 km/h ± 1)', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: 100, druck: 4 }, 60 * SEK);
  const kmh = alsKmh(laengsTempo(k));
  pruefe(Math.abs(kmh - DRUCKSTUFEN[4].kmh) <= 1, `${kmh.toFixed(2)} km/h`);
});

test('Fahren: schwer — nach 3 s noch nicht einmal halbes Höchsttempo', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: 100, druck: 4 }, 3 * SEK);
  const kmh = alsKmh(laengsTempo(k));
  pruefe(kmh > 3 && kmh < DRUCKSTUFEN[4].kmh / 2, `${kmh.toFixed(2)} km/h nach 3 s`);
});

test('Fahren: jede Feuerstufe hält auf Dauer ihr Tempo (Dampfvorrat), „Kessel ruht“ ohne Dampf fährt nicht', () => {
  for (let stufe = 0; stufe < DRUCKSTUFEN.length; stufe++) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { druck: stufe }, 0);
    if (stufe === 0) k.dampf = 0; // nur in Tests: kalter Kessel
    // Vollgas, bis der Vorrat aufgebraucht ist und Feuer und Tempo im Gleichgewicht sind.
    fahre(state, { gas: 100 }, 150 * SEK);
    const kmh = alsKmh(laengsTempo(k));
    if (stufe === 0) pruefe(kmh === 0, `Stufe 0 fährt: ${kmh}`);
    else pruefe(Math.abs(kmh - DRUCKSTUFEN[stufe].kmh) <= 1.5, `Stufe ${stufe}: ${kmh.toFixed(1)} statt ≈ ${DRUCKSTUFEN[stufe].kmh} km/h`);
  }
});

test('Fahren: Pulverschnee halbiert ungefähr das Höchsttempo', () => {
  const kmh = laufband(-380, -60, 4, 80 * SEK);
  pruefe(Math.abs(kmh - 17) <= 2, `${kmh.toFixed(2)} km/h (soll ≈ 17)`);
});

test('Fahren: dickes Eis ist am Ende schneller als Schnee, aber zäher beim Anfahren', () => {
  // WARUM nicht mehr 120 %: Seit dem Dampfvorrat (M4a) kosten durchdrehende Räder Dampf — auf Eis
  // reicht Volldampf auf Dauer für gut 38 km/h statt der 41, die der Schub allein hergäbe.
  const ende = laufband(0, -450, 4, 120 * SEK);
  pruefe(ende > 36 && ende < 43, `Eis Höchsttempo ${ende.toFixed(2)} km/h (soll ≈ 38–41)`);
  const eisFrueh = laufband(0, -450, 4, 3 * SEK);
  const schneeFrueh = laufband(0, 2000, 4, 3 * SEK);
  pruefe(eisFrueh < schneeFrueh, `Eis nach 3 s ${eisFrueh.toFixed(2)} ≥ Schnee ${schneeFrueh.toFixed(2)}`);
});

test('Fahren: Bremsen aus voller Fahrt hält in unter 10 s, ohne rückwärts zu schießen', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: 100, druck: 4 }, 60 * SEK);
  let ticks = 0;
  befehlAnwenden(state, { art: 'STEUERN', spieler: 0, gas: -100, lenkung: 0 });
  while (laengsTempo(k) > 0 && ticks < 30 * SEK) { tickAusfuehren(state); ticks += 1; }
  pruefe(ticks < 10 * SEK, `Bremsweg dauerte ${(ticks / SEK).toFixed(1)} s`);
  pruefe(laengsTempo(k) === 0, `nach dem Halt ${laengsTempo(k)} µm/Tick statt 0`);
});

test('Fahren: rückwärts höchstens 6 km/h', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: -100, druck: 4 }, 40 * SEK);
  const kmh = alsKmh(laengsTempo(k));
  pruefe(kmh < 0 && Math.abs(-kmh - RUECKWAERTS_KMH) <= 0.5, `${kmh.toFixed(2)} km/h`);
});

test('Fahren: ohne Gas rollt der Koloss aus und bleibt dann exakt stehen', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: 100, druck: 3 }, 30 * SEK);
  fahre(state, { gas: 0 }, 60 * SEK);
  pruefe(k.vx === 0 && k.vy === 0, `rollt noch: ${k.vx}, ${k.vy}`);
});

test('Fahren: im Stand dreht die Lenkung nichts', () => {
  const { state, k } = testwelt();
  const h = k.h;
  fahre(state, { lenkung: -100 }, 100);
  pruefe(k.h === h && k.dreh === 0, `Richtung ${k.h}, Drehung ${k.dreh}`);
});

test('Fahren: nach dem Loslassen der Lenkung hört die Drehung ganz auf (auch im Stand)', () => {
  // Fehler aus dem ersten Spieltest: Drehung blieb bei −4 hängen → Koloss drehte sich ewig langsam.
  for (const lenkung of [-100, 100]) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { gas: 100, druck: 2 }, 15 * SEK);
    fahre(state, { gas: 100, lenkung }, 3 * SEK);
    fahre(state, { gas: 100, lenkung: 0 }, 2 * SEK);
    pruefe(k.dreh === 0, `Lenkung ${lenkung}: Drehung ${k.dreh} statt 0`);
    fahre(state, { gas: -100 }, 15 * SEK); // anhalten (und etwas rückwärts)
    fahre(state, { gas: 0 }, 20 * SEK);
    const h = k.h;
    fahre(state, { gas: 0 }, 60 * SEK);
    pruefe(k.h === h, `Lenkung ${lenkung}: dreht sich im Stand (${h} → ${k.h})`);
  }
});

test('Telegraf: jede Stellung voraus wird gehalten, auch aus dem Stand', () => {
  for (const stufe of [4, 5, 6, 7]) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { druck: 4, telegraf: stufe }, 60 * SEK);
    const kmh = alsKmh(laengsTempo(k)), ziel = TELEGRAF[stufe].kmh;
    pruefe(Math.abs(kmh - ziel) < 0.7, `${TELEGRAF[stufe].name}: ${kmh.toFixed(2)} statt ${ziel} km/h`);
  }
});

test('Telegraf: Herunterschalten bremst sanft, Stopp hält an, zurück fährt rückwärts', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { druck: 3, telegraf: 7 }, 60 * SEK); // Voll voraus, 26 km/h
  fahre(state, { telegraf: 5 }, 3 * SEK);             // Langsam voraus
  const nach3s = alsKmh(laengsTempo(k));
  pruefe(nach3s > 12 && nach3s < 20, `nach 3 s ${nach3s.toFixed(2)} km/h — bremst zu hart oder gar nicht`);
  fahre(state, { telegraf: 5 }, 30 * SEK);
  pruefe(Math.abs(alsKmh(laengsTempo(k)) - 10) < 0.7, `Langsam: ${alsKmh(laengsTempo(k)).toFixed(2)} km/h`);
  fahre(state, { telegraf: TELEGRAF_STOPP }, 30 * SEK);
  pruefe(laengsTempo(k) === 0, `Stopp: steht nicht, ${alsKmh(laengsTempo(k)).toFixed(3)} km/h`);
  fahre(state, { telegraf: 1 }, 40 * SEK);            // Halb zurück
  pruefe(Math.abs(alsKmh(laengsTempo(k)) + 4) < 0.5, `Halb zurück: ${alsKmh(laengsTempo(k)).toFixed(2)} km/h`);
});

test('Telegraf: Handgas geht vor, ungültige Stellungen werden abgelehnt', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  pruefe(k.telegraf === TELEGRAF_STOPP, 'Start nicht auf Stopp');
  fahre(state, { druck: 2, telegraf: 8, gas: -100 }, 10 * SEK);
  pruefe(laengsTempo(k) < 0, 'Handgas rückwärts hat den Telegrafen nicht übersteuert');
  for (const stufe of [-1, TELEGRAF.length, 1.5]) {
    pruefe(!befehlAnwenden(state, { art: 'TELEGRAF', spieler: 0, stufe }).ok, `Stellung ${stufe} erlaubt`);
  }
});

test('Fahren: D lenkt nach rechts (im Uhrzeigersinn), Kurvenradius 15–80 m', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { gas: 100, druck: 2 }, 20 * SEK);
  const h0 = k.h;
  fahre(state, { gas: 100, lenkung: 100 }, 2 * SEK);
  const gedreht = (k.h - h0 + 65536) % 65536;
  pruefe(gedreht > 0 && gedreht < 32768, `nach rechts erwartet, gedreht ${gedreht}`);
  // Radius = Tempo / Winkelgeschwindigkeit (beides pro Tick).
  const bogen = (k.dreh / 65536) * 2 * Math.PI;
  const radius = laengsTempo(k) / 1000000 / bogen;
  pruefe(radius > 15 && radius < 80, `Radius ${radius.toFixed(1)} m`);
});

test('Fahren: langsam fahren = langsam drehen; der Kurvenradius bleibt bei kleinem Tempo gleich', () => {
  /** @param {number} stufe Telegraf @returns {{dreh: number, radius: number}} */
  function kurve(stufe) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { druck: 4, telegraf: stufe }, 40 * SEK);
    fahre(state, { telegraf: stufe, lenkung: 100 }, 2 * SEK);
    const bogen = (k.dreh / 65536) * 2 * Math.PI;
    return { dreh: k.dreh, radius: laengsTempo(k) / 1000000 / bogen };
  }
  const ganzLangsam = kurve(4), langsam = kurve(5), voll = kurve(7);
  pruefe(ganzLangsam.dreh * 2 < langsam.dreh, `4 km/h dreht ${ganzLangsam.dreh}, 10 km/h ${langsam.dreh} — nicht langsamer`);
  const soll = WENDE_RADIUS / 1e6;
  pruefe(Math.abs(ganzLangsam.radius - soll) < 2 && Math.abs(langsam.radius - soll) < 2,
    `Radius bei 4 km/h ${ganzLangsam.radius.toFixed(1)} m, bei 10 km/h ${langsam.radius.toFixed(1)} m (soll ≈ ${soll})`);
  pruefe(voll.radius > soll * 1.3, `bei 26 km/h zu enger Bogen: ${voll.radius.toFixed(1)} m`);
});

test('Fahren: auf Eis folgt die Bewegung der Lenkung kaum, auf Schnee fast ganz', () => {
  // Gemessen wird: Um wie viel hat sich die BEWEGUNGSrichtung gedreht, verglichen mit der
  // Drehung des Bugs? Auf Schnee ~gleich viel, auf Eis rutscht der Koloss weiter geradeaus.
  /** @param {number} xM @param {number} yM @returns {number} Anteil 0 … 1 */
  function folgt(xM, yM) {
    const { state, k } = testwelt();
    setzeAn(k, xM, yM, OSTEN);
    k.vx = 300000; // ≈ 21,6 km/h geradeaus nach Osten
    fahre(state, { gas: 100, druck: 3, lenkung: 100 }, 2 * SEK);
    const bug = (k.h / 65536) * 2 * Math.PI;
    const bewegung = Math.atan2(k.vy, k.vx);
    return bewegung / bug;
  }
  const schnee = folgt(0, 2000);
  const eis = folgt(-80, -450);
  pruefe(schnee > 0.8, `Schnee folgt nur zu ${(schnee * 100).toFixed(0)} %`);
  pruefe(eis < 0.5, `Eis folgt zu ${(eis * 100).toFixed(0)} % — rutscht zu wenig`);
  pruefe(Math.abs(querTempo(testwelt().k)) === 0, 'Selbsttest querTempo');
});
