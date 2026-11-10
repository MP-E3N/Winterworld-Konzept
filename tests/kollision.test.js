// @ts-check
/**
 * kollision.test.js — Tests für sim/koloss/kollision.js im Testgelände (Felsblock bei 0/420 m, r 60 m).
 * REGEL: docs/specs/M2-welt.md „Kollision“
 */

import { test, pruefe } from './harness.js';
import { testwelt, fahre, setzeAn } from './helfer.js';
import { lageFrei } from '../sim/koloss/kollision.js';
import { tickAusfuehren } from '../sim/tick.js';
import { befehlAnwenden } from '../sim/befehle.js';

const SUEDEN = 16384, NORDEN = 49152, SEK = 20;

test('Kollision: frontal gegen den Fels — hält an, dringt nie ein', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 250, SUEDEN); // 110 m vor dem Felsrand
  fahre(state, { gas: 100, druck: 4 }, 0);
  for (let i = 0; i < 60 * SEK; i++) {
    tickAusfuehren(state);
    pruefe(lageFrei(state.seed, k.x, k.y, k.h), `Tick ${state.tick}: Koloss steckt im Fels`);
  }
  pruefe(k.vx === 0 && k.vy === 0, `prallt nicht ab: ${k.vx}/${k.vy}`);
  pruefe(k.y / 1e6 > 330 && k.y / 1e6 < 360, `hält bei y=${(k.y / 1e6).toFixed(1)} m (Fels ab 360 m)`);
});

test('Kollision: rückwärts kommt man wieder frei', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 300, SUEDEN);
  fahre(state, { gas: 100, druck: 3 }, 30 * SEK);
  const yWand = k.y;
  fahre(state, { gas: -100 }, 10 * SEK);
  pruefe(k.y < yWand - 5e6, `nicht freigekommen: ${(yWand / 1e6).toFixed(1)} → ${(k.y / 1e6).toFixed(1)} m`);
});

test('Kollision: schräg gegen den Fels rutscht er an der Wand entlang statt stecken zu bleiben', () => {
  const { state, k } = testwelt();
  setzeAn(k, -40, 250, SUEDEN + 3000); // leicht nach Südwesten, trifft den Block seitlich
  fahre(state, { gas: 100, druck: 3 }, 40 * SEK);
  for (let i = 0; i < 20 * SEK; i++) {
    tickAusfuehren(state);
    pruefe(lageFrei(state.seed, k.x, k.y, k.h), `Tick ${state.tick}: steckt im Fels`);
  }
  // Am Ende ist er am Block vorbei (westlich) oder gleitet noch — Hauptsache, er bewegt sich.
  pruefe(Math.abs(k.vx) + Math.abs(k.vy) > 0 || k.x / 1e6 < -60, 'festgefahren statt entlangzurutschen');
});

test('Kollision: Lenken in die Wand hinein dreht ihn nicht hinein', () => {
  const { state, k } = testwelt();
  setzeAn(k, 0, 300, SUEDEN);
  fahre(state, { gas: 100, druck: 3 }, 30 * SEK);
  befehlAnwenden(state, { art: 'STEUERN', spieler: 0, gas: 100, lenkung: 100 });
  for (let i = 0; i < 20 * SEK; i++) {
    tickAusfuehren(state);
    pruefe(lageFrei(state.seed, k.x, k.y, k.h), `Tick ${state.tick}: steckt im Fels`);
  }
  pruefe(NORDEN !== k.h, 'Selbsttest');
});
