// @ts-check
/**
 * befehle.test.js — Tests für sim/befehle.js (Prüfen und Anwenden).
 * REGEL: KONZEPT.md §8 Regel 4 (alles über Befehle, misstrauisch prüfen)
 */

import { test, pruefe, gleich } from './harness.js';
import { testwelt } from './helfer.js';
import { neuerZustand } from '../sim/zustand.js';
import { befehlAnwenden, befehlPruefen } from '../sim/befehle.js';
import { kolossVon } from '../sim/abfragen.js';

test('Befehle: BEITRETEN legt Spieler und Koloss an, zweiter Spieler steht daneben', () => {
  const state = neuerZustand(5);
  pruefe(befehlAnwenden(state, { art: 'BEITRETEN', spieler: 0, name: 'Anna' }).ok, 'Spieler 0');
  pruefe(befehlAnwenden(state, { art: 'BEITRETEN', spieler: 1, name: 'Ben' }).ok, 'Spieler 1');
  const a = kolossVon(state, 0), b = kolossVon(state, 1);
  pruefe(a !== null && b !== null && a.besitzer === 0 && b.besitzer === 1, 'Besitzer falsch');
  pruefe(a !== null && b !== null && a.x !== b.x, 'Kolosse stehen aufeinander');
});

test('Befehle: doppelter oder lückenhafter Beitritt wird abgelehnt', () => {
  const state = neuerZustand(5);
  befehlAnwenden(state, { art: 'BEITRETEN', spieler: 0, name: 'Anna' });
  pruefe(befehlPruefen(state, { art: 'BEITRETEN', spieler: 0, name: 'X' }) !== null, 'doppelt erlaubt');
  pruefe(befehlPruefen(state, { art: 'BEITRETEN', spieler: 3, name: 'X' }) !== null, 'Lücke erlaubt');
  pruefe(befehlPruefen(state, { art: 'BEITRETEN', spieler: 1, name: '' }) !== null, 'leerer Name erlaubt');
});

test('Befehle: STEUERN und DRUCK prüfen Wertebereiche', () => {
  const { state } = testwelt();
  pruefe(befehlPruefen(state, { art: 'STEUERN', spieler: 0, gas: 101, lenkung: 0 }) !== null, 'Gas 101');
  pruefe(befehlPruefen(state, { art: 'STEUERN', spieler: 0, gas: 50.5, lenkung: 0 }) !== null, 'Kommazahl');
  pruefe(befehlPruefen(state, { art: 'DRUCK', spieler: 0, stufe: 5 }) !== null, 'Stufe 5');
  pruefe(befehlPruefen(state, { art: 'DRUCK', spieler: 0, stufe: -1 }) !== null, 'Stufe -1');
  gleich(befehlPruefen(state, { art: 'STEUERN', spieler: 0, gas: -100, lenkung: 100 }), null, 'gültige Steuerung');
});

test('Befehle: Spieler ohne Koloss kann nicht steuern', () => {
  const state = neuerZustand(5);
  pruefe(befehlPruefen(state, { art: 'STEUERN', spieler: 0, gas: 100, lenkung: 0 }) !== null, 'ohne Beitritt erlaubt');
  pruefe(befehlPruefen(state, { art: 'DRUCK', spieler: -1, stufe: 1 }) !== null, 'negative Nummer erlaubt');
});

test('Befehle: abgelehnter Befehl ändert nichts', () => {
  const { state } = testwelt();
  const vorher = JSON.stringify(state);
  const erg = befehlAnwenden(state, { art: 'DRUCK', spieler: 0, stufe: 99 });
  pruefe(!erg.ok, 'hätte abgelehnt werden müssen');
  gleich(JSON.stringify(state), vorher, 'Zustand verändert');
});
