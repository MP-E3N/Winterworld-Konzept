// @ts-check
/**
 * crew.js — Werte für die Crew: Größe, Essen, Gesundheit, Sterben, Moral (M4b).
 *
 * ZWECK:    Wie viele Leute an Bord sind, wie viel sie essen und wie schnell Kälte und Hunger sie
 *           krank machen. Zum Abstimmen nur hier drehen.
 * REGEL:    docs/specs/M4b-crew.md, KONZEPT.md §3
 * DEBUG:    F3 zeigt die Crew-Werte. Tests: tests/crew.test.js.
 *
 * EINHEITEN: satt, gesundheit, moral in Millionsteln (VOLL = 1 000 000 = 100 %), Wärme in Zehntel °C,
 *            Raten je Tick (20 Ticks = 1 s, 1 Spieltag = 24 000 Ticks).
 */

/** Ganz satt / ganz gesund / beste Moral. */
export const VOLL = 1000000;

/** Crew beim Start: Heizer (essen nur mit) und Arbeiter (= Bergungstrupp). */
export const START_HEIZER = 4;
export const START_ARBEITER = 6;
/** Vorräte beim Start (kg, Warenlager): reichen für 10 Leute 3 Spieltage (≈ 1 h). */
export const START_NAHRUNG_KG = 300;

/** Essen je Kopf und Spieltag (kg). WARUM so viel: Ein Spieltag ist nur 20 min — sonst wären
 * Vorräte bedeutungslos. Ein mittleres Vorratslager (~1,6 t) ernährt 10 Leute etwa 3 h. */
export const ESSEN_KG_TAG = 10;
/** Daraus: Milligramm je Kopf und Tick (10 kg / 24 000 Ticks). */
export const ESSEN_MG_TICK = Math.round((ESSEN_KG_TAG * 1000000) / 24000);

/** Mit Vorräten wird man so schnell satt (je Tick; leer → voll in ~4 min). */
export const SATT_STEIGT = 200;
/** Ohne Vorräte sinkt die Sattheit so schnell (je Tick; voll → 0 in einem Spieltag). */
export const SATT_SINKT = Math.ceil(VOLL / 24000);

/** Unter dieser Wärme an Bord (Zehntel °C) macht die Kälte krank … */
export const KALT_AB = 0;
/** … um so viel Gesundheit je Tick und Zehntel °C darunter (−10 °C: voll → 0 in ~8 min). */
export const KAELTE_SCHADEN = 1;
/** Unter dieser Sattheit macht der Hunger krank … */
export const HUNGER_AB = 300000;
/** … um (HUNGER_AB − satt) / HUNGER_TEILER je Tick (bei 0 % satt: voll → 0 in ~14 min). */
export const HUNGER_TEILER = 5000;
/** Erholung je Tick, wenn es warm genug und man satt genug ist (0 → voll in ~20 min). */
export const ERHOLUNG = 40;
/** Erholung nur ab dieser Wärme an Bord (Zehntel °C, +10 °C) … */
export const ERHOLUNG_WARM_AB = 100;
/** … und ab dieser Sattheit (halb satt). */
export const ERHOLUNG_SATT_AB = 500000;

/** Unter dieser Gesundheit stirbt nach und nach jemand (25 %). */
export const STERBEN_UNTER = 250000;
/** Sammler-Schwelle für einen Todesfall: je Tick kommt (STERBEN_UNTER − gesundheit) dazu.
 * Bei 0 % Gesundheit ist das ein Toter je Minute (1200 Ticks). */
export const STERBEN_SCHWELLE = STERBEN_UNTER * 1200;
/** So viel Moral kostet jeder Todesfall (10 %). */
export const TOD_MORAL = 100000;

/** Moral strebt träge zu ihrem Ziel (Zeitkonstante in Ticks, 6000 = 5 min). */
export const MORAL_TRAEGHEIT = 6000;
/** Abzüge vom Moral-Ziel: je Zehntel °C unter +10 °C an Bord … */
export const MORAL_KAELTE = 2000;
/** … und Anteil (Prozent) an Hunger (VOLL − satt) und Krankheit (VOLL − gesundheit). */
export const MORAL_HUNGER_PROZENT = 50;
export const MORAL_KRANK_PROZENT = 30;
