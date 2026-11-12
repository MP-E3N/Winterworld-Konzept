// @ts-check
/**
 * auftrag.js — Werte des Rettungsauftrags (M5b): Wo die Überlebenden ungefähr sind, wie viele, wann man
 *              ihren Signalballon sieht.
 *
 * ZWECK:    Szenario (Nutzerwunsch): Start in der Stadt mit Generator, Überlebende rund 5 km entfernt; man
 *           kennt nur die grobe Region. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M5b-rettung.md
 * DEBUG:    ek.auftrag(); F3-Zeile „Auftrag“. Tests: tests/auftrag.test.js.
 *
 * EINHEITEN: Meter (Lage), Personen.
 */

import { VOLL } from './crew.js';

/** So viele Überlebende warten im Lager. */
export const UEBERLEBENDE = 8;
/** Mitte der Suchregion: so weit vom Start (m), Richtung aus dem Seed. */
export const REGION_ABSTAND_MIN_M = 4800;
export const REGION_ABSTAND_MAX_M = 5200;
/** Radius der Suchregion, die man auf der Karte sieht (m). */
export const REGION_RADIUS_M = 800;
/** Das Lager liegt höchstens so weit von der Mitte der Region (m). */
export const LAGER_STREUUNG_M = 550;
/** Das Lager braucht so viel befahrbaren Boden rundherum (m) — der Koloss muss heranfahren können. */
export const LAGER_FREI_M = 30;
/** Ab dieser Entfernung (m) sieht man den Signalballon aufsteigen. */
export const SIGNAL_SICHT_M = 1000;
/** So nah (m, ab Rumpfmitte) muss man heran, damit sie einsteigen können. */
export const RETTEN_REICHWEITE_M = 60;
/** Gerettete kommen geschwächt an Bord: Gesundheit und Sattheit (Millionstel). */
export const GERETTET_GESUNDHEIT = VOLL / 2;
export const GERETTET_SATT = VOLL / 5;

/** Seed 0 (Testgelände): feste Region und festes Lager nördlich hinter dem See (m), für Tests. */
export const TEST_REGION = { x: 300, y: -1300 };
export const TEST_LAGER = { x: 450, y: -1100 };
