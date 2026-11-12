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

// ── Schneestürme (M5a, docs/specs/M5a-stuerme.md) ─────────
// Zeiten in Ticks (20 = 1 s, 1200 = 1 min). Stärke 0 … STURM_VOLL.

/** Volle Sturmstärke. */
export const STURM_VOLL = 1000;
/** Der erste Sturm beginnt nach 8–14 min Spielzeit. */
export const STURM_ERSTER_MIN = 9600;
export const STURM_ERSTER_MAX = 16800;
/** Zwischen dem Ende eines Sturms und dem Beginn des nächsten: 15–30 min. */
export const STURM_ABSTAND_MIN = 18000;
export const STURM_ABSTAND_MAX = 36000;
/** Dauer eines Sturms: 3–6 min … */
export const STURM_DAUER_MIN = 3600;
export const STURM_DAUER_MAX = 7200;
/** … davon so lange Anschwellen und Abflauen (40 s). */
export const STURM_RAMPE = 800;
/** Höchste Stärke eines Sturms: 600–1000. */
export const STURM_SPITZE_MIN = 600;
export const STURM_SPITZE_MAX = 1000;
/** So lange vor dem Beginn fällt das Barometer (4 min). */
export const STURM_VORWARNUNG = 4800;
/** Schneelast: Widerstand beim Fahren steigt bei voller Stärke um so viele Prozent (100 = doppelt → etwa halbes Tempo). */
export const STURM_WIDERSTAND_PROZENT = 100;
/** Barometer: 0 = Sturm … BAROMETER_SCHOEN = schön. */
export const BAROMETER_SCHOEN = 1000;
