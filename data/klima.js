// @ts-check
/**
 * klima.js — Werte für Tageszeit, Kälte und Wärme an Bord (M4a).
 *
 * ZWECK:    Wie lang ein Tag ist, wann es dunkel wird, wie kalt es wo ist und wie stark der Kessel
 *           heizt. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M4a-kessel-kaelte.md, KONZEPT.md §2 („je weiter weg, desto kälter“)
 * DEBUG:    F3 zeigt Uhrzeit, Außentemperatur und Wärme an Bord.
 *
 * EINHEITEN: Uhrzeit in Minuten des Tages (0 … 1439), Temperaturen in Zehntel °C (−200 = −20 °C),
 *            Dunkelheit 0 (hell) … 1000 (tiefe Nacht).
 */

/** Ticks je Spieltag: 20 min echte Zeit × 60 s × 20 Ticks (Nutzerentscheidung M4a). */
export const TAG_TICKS = 24000;
/** Minuten eines Tages. */
export const TAG_MINUTEN = 1440;
/** Uhrzeit beim Weltbeginn (Minuten): 08:00. */
export const START_UHR = 8 * 60;

/** Ab hier ist es ganz hell … (06:00) */
export const HELL_AB = 6 * 60;
/** … ab hier wird es dämmrig (19:12) … */
export const DAEMMERUNG_AB = 19 * 60 + 12;
/** … und so lange dauert jede Dämmerung (2 h 24 min ≈ 2 min echte Zeit). Nacht = Rest (~5 min). */
export const DAEMMERUNG_MIN = 144;

/** Außentemperatur am Start (Zehntel °C). */
export const TEMP_START = -200;
/** So viel kälter wird es bis RING_KALT_M vom Start (größeres der beiden Maße wie beim Gelände). */
export const TEMP_RING = -250;
export const RING_KALT_M = 5000;
/** So viel kälter ist es in tiefer Nacht (Zehntel °C). */
export const TEMP_NACHT = -100;
/** Windkälte: Zehntel °C je dm/s Wind, geteilt durch 10 → −0,5 °C je m/s. */
export const WINDKAELTE_PROMILLE = 500;

/**
 * Kesselwärme an Bord je Feuerstufe (Zehntel °C über der Außentemperatur), gleitend dazwischen.
 * WARUM so viel: Bei −20 °C draußen und „Mittel“ sind es an Bord gut +12 °C — erträglich.
 * Bei −45 °C nachts reicht nur noch Volldampf.
 */
export const KESSEL_WAERME = [50, 200, 320, 420, 520];

/** Zeitkonstante, mit der sich die Wärme an Bord dem Ziel nähert (Ticks; 600 = 30 s). */
export const WAERME_TRAEGHEIT = 600;
/** Wärme an Bord beim Start (Zehntel °C). */
export const START_WAERME = 120;

/** Heizung an Bord (Schalter wie die Lampe, kostet HEIZUNG_G_TICK Brennstoff): so viel wärmer
 * (Zehntel °C) — nur solange das Feuer brennt. */
export const HEIZUNG_WAERME = 150;
