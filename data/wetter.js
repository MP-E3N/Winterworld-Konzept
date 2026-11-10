// @ts-check
/**
 * wetter.js — Werte für Wind (und später Kälte, Stürme).
 *
 * ZWECK:    Wie oft und wie stark der Wind wechselt.
 * REGEL:    KONZEPT.md §5 „Wetter“
 *
 * EINHEITEN: Windstärke in dm/s (10 = 1 m/s), Richtung als Winkel (65536 = Vollkreis) — gemeint
 *            ist die Richtung, IN DIE der Wind weht (wie ein Pfeil).
 */

/** Schwächster und stärkster Wind (dm/s). 20 m/s = Sturm; Stürme kommen erst in M5. */
export const WIND_MIN = 10;
export const WIND_MAX = 160;

/** Nach so vielen Ticks sucht sich der Wind ein neues Ziel (20 Ticks = 1 s; 30–120 s). */
export const WIND_WECHSEL_MIN = 600;
export const WIND_WECHSEL_MAX = 2400;

/** Normale Drehung beim Wechsel: bis ±60°. */
export const WIND_DREHUNG_NORMAL = 10923;

/** Prozent-Chance auf einen großen Umschwung (bis ±180°) statt einer normalen Drehung. */
export const WIND_UMSCHWUNG_PROZENT = 15;

/** So schnell dreht der Wind höchstens (Winkel pro Tick; 6 ≈ 0,66°/s). */
export const WIND_DREH_PRO_TICK = 6;

/** So schnell ändert sich die Stärke höchstens (dm/s pro Tick; 1 = 2 m/s pro Sekunde). */
export const WIND_STAERKE_PRO_TICK = 1;
