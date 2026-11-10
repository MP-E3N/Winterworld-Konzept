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
import { laengsTempo, querTempo, alsKmh, hoechstTempo } from '../sim/abfragen.js';
import { DRUCKSTUFEN, RUECKWAERTS_KMH } from '../data/koloss.js';
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
  const vorher = JSON.stringify(k);
  fahre(state, { lenkung: 100 }, 200);
  pruefe(JSON.stringify(k) === vorher.replace('"lenkung":0', '"lenkung":100'), `bewegt: ${JSON.stringify(k)}`);
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

test('Fahren: jede höhere Druckstufe ist schneller, „Kessel ruht“ fährt nicht', () => {
  let vorher = -1;
  for (let stufe = 0; stufe < DRUCKSTUFEN.length; stufe++) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { gas: 100, druck: stufe }, 40 * SEK);
    const kmh = alsKmh(laengsTempo(k));
    if (stufe === 0) pruefe(kmh === 0, `Stufe 0 fährt: ${kmh}`);
    else pruefe(kmh > vorher + 3, `Stufe ${stufe}: ${kmh.toFixed(1)} nicht schneller als ${vorher.toFixed(1)}`);
    vorher = kmh;
  }
});

test('Fahren: Pulverschnee halbiert ungefähr das Höchsttempo', () => {
  const kmh = laufband(-380, -60, 4, 80 * SEK);
  pruefe(Math.abs(kmh - 17) <= 2, `${kmh.toFixed(2)} km/h (soll ≈ 17)`);
});

test('Fahren: dickes Eis ist am Ende schneller (≈ 120 %), aber zäher beim Anfahren', () => {
  const ende = laufband(0, -450, 4, 120 * SEK);
  pruefe(Math.abs(ende - 34 * 1.2) <= 2.5, `Eis Höchsttempo ${ende.toFixed(2)} km/h (soll ≈ 40,8)`);
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

test('Tempo halten: hält das Tempo ohne Gastaste, S schaltet aus, W + loslassen setzt neues Ziel', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  pruefe(befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true }).ok === false, 'im Stand einschaltbar');
  fahre(state, { gas: 100, druck: 4 }, 4 * SEK);
  const ziel = alsKmh(laengsTempo(k));
  pruefe(befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true }).ok, 'einschalten');
  fahre(state, { gas: 0 }, 40 * SEK);
  const gehalten = alsKmh(laengsTempo(k));
  pruefe(Math.abs(gehalten - ziel) < 0.7, `Ziel ${ziel.toFixed(2)}, nach 40 s ${gehalten.toFixed(2)} km/h`);
  // W drücken → schneller; loslassen → neues, höheres Ziel wird gehalten.
  fahre(state, { gas: 100 }, 5 * SEK);
  fahre(state, { gas: 0 }, 30 * SEK);
  const neu = alsKmh(laengsTempo(k));
  pruefe(neu > gehalten + 3 && k.tempomat > 0, `nach W+loslassen ${neu.toFixed(2)} km/h, Tempo halten ${k.tempomat}`);
  // S schaltet aus.
  fahre(state, { gas: -100 }, 1);
  pruefe(k.tempomat === 0, 'S hat Tempo halten nicht ausgeschaltet');
});

test('Tempo halten: Schieberegler setzt ein festes Zieltempo, auch aus dem Stand', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 2000, OSTEN);
  fahre(state, { druck: 3 }, 1);
  pruefe(befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true, kmh: 12 }).ok, 'aus dem Stand mit 12 km/h');
  fahre(state, { gas: 0 }, 40 * SEK);
  const kmh = alsKmh(laengsTempo(k));
  pruefe(Math.abs(kmh - 12) < 0.7, `hält ${kmh.toFixed(2)} statt 12 km/h`);
  befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true, kmh: 20 });
  fahre(state, { gas: 0 }, 40 * SEK);
  pruefe(Math.abs(alsKmh(laengsTempo(k)) - 20) < 0.7, `hält ${alsKmh(laengsTempo(k)).toFixed(2)} statt 20 km/h`);
  pruefe(!befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true, kmh: 99 }).ok, '99 km/h erlaubt');
  pruefe(!befehlAnwenden(state, { art: 'TEMPOMAT', spieler: 0, an: true, kmh: 7.5 }).ok, 'Kommazahl erlaubt');
});

test('Abfrage hoechstTempo stimmt mit dem gemessenen Höchsttempo überein (Überlast-Anzeige)', () => {
  for (const stufe of [1, 2, 4]) {
    const { state, k } = testwelt();
    setzeAn(k, 0, 2000, OSTEN);
    fahre(state, { gas: 100, druck: stufe }, 80 * SEK);
    const gemessen = alsKmh(laengsTempo(k)), berechnet = alsKmh(hoechstTempo(state.seed, k));
    pruefe(Math.abs(gemessen - berechnet) < 0.5, `Stufe ${stufe}: gemessen ${gemessen.toFixed(2)}, berechnet ${berechnet.toFixed(2)}`);
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
