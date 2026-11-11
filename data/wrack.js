// @ts-check
/**
 * wrack.js — Werte fürs Liegenbleiben (M4c, F6).
 *
 * ZWECK:    Wie lange ein Koloss ohne Brennstoff und mit kaltem Kessel noch durchhält und wo die
 *           Ladung eines Wracks liegt. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M4c-liegenbleiben.md, KONZEPT.md F6
 * DEBUG:    F3 zeigt „kalt“ und die Zahl der Wracks. Tests: tests/wrack.test.js.
 */

/** Kein Brennstoff mehr an Bord und der Kessel ohne Druck: nach dieser Frist (Ticks, 2 min)
 * bleibt der Koloss liegen — Zeit genug, um noch Holz zu bergen. */
export const GNADENFRIST_TICKS = 2400;

/** Die Ladung eines Wracks liegt in Haufen so weit um das Wrack (m). */
export const WRACK_HAUFEN_ABSTAND_M = 14;
