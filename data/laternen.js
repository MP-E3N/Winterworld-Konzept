// @ts-check
/**
 * laternen.js — Werte für gesetzte Laternen (Spieltest M5b): temporäre Wegpunkte im Schnee.
 *
 * ZWECK:    Nutzerwunsch: Spuren verschwinden wie alles andere mit der Zeit — dafür kann man Laternen
 *           setzen, die ein paar Stunden leuchten, höchstens 5 gleichzeitig. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M5b-rettung.md „Nachtrag Spieltest“
 * DEBUG:    F3-Zeile „Laternen“; Tests: tests/laternen.test.js.
 */

/** Höchstens so viele Laternen brennen je Spieler; die sechste löscht die älteste. */
export const LATERNEN_MAX = 5;
/** So lange brennt eine Laterne (Ticks): 2 Stunden echte Spielzeit = 6 Spieltage. */
export const LATERNE_DAUER_TICKS = 144000;
/** Gesetzt wird sie so weit hinter der Rumpfmitte (m) — direkt hinter dem Heck. */
export const LATERNE_HINTER_M = 24;
/** So weit (m) hält eine Laterne die Schneewehen-Decke frei und erhellt die Nacht. */
export const LATERNE_SICHT_M = 70;
