// @ts-check
/**
 * takt.js — Zeit- und Versionswerte der Simulation.
 *
 * ZWECK:    Feste Taktung (Ticks pro Sekunde), Tempostufen im Einzelspiel und die
 *           Versionsnummer des Spielzustands.
 * REGEL:    KONZEPT.md §8 Regel 2 (fester Takt), §7 „Pause & Tempo“
 */

/** Simulationsschritte pro echter Sekunde (bei Tempo 1×). */
export const TICKS_PRO_SEKUNDE = 20;

/** Dauer eines Ticks in Millisekunden. */
export const TICK_MS = 1000 / TICKS_PRO_SEKUNDE;

/**
 * Höchstens so viele Ticks pro Bild nachholen.
 * WARUM: Hängt der Browser kurz (Tab im Hintergrund), sollen danach nicht hunderte Ticks auf
 * einmal laufen und das Spiel einfrieren. Die verlorene Zeit wird einfach verworfen.
 */
export const MAX_TICKS_PRO_BILD = 16;

/** Wählbare Spieltempi im Einzelspiel (Taste T schaltet weiter). */
export const TEMPI = [1, 2, 4];

/**
 * Version des Zustands-Schemas. Erhöhen, sobald sich Felder im Zustand ändern
 * (alte Spielstände werden dann nicht mehr geladen, Replays neu aufnehmen).
 */
export const ZUSTAND_VERSION = 14; // v2: Wetter (Wind); v3: Tempo halten; v4: Maschinentelegraf; v5: Scheinwerfer (licht), Drehpunkt; v6: Ladung, Trupps, geborgen (M3); v7: Dampf, Brennstoff, Wärme (M4a); v8: Dampfvorrat, Heizung, zwei Lager, Abwürfe; v9: Crew (M4b); v10: Wracks, Liegenbleiben (M4c); v11: Heimat, Depots (M4d); v12: Stürme (M5a); v13: Rettungsauftrag, Passagiere (M5b); v14: Suchscheinwerfer, Laternen (Spieltest M5b)
