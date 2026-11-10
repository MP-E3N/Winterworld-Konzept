// @ts-check
/**
 * koloss.js — Fahrwerte des Dampfkolosses.
 *
 * ZWECK:    Alle Zahlen, die das Fahrgefühl bestimmen, an einer Stelle. Zum Feintunen nur hier
 *           drehen (dann Replay neu aufnehmen, siehe CLAUDE.md).
 * REGEL:    KONZEPT.md §3 „Der Koloss“ (schwer und träge)
 *
 * EINHEITEN (überall in der Simulation gleich):
 *   Strecke        µm (Mikrometer, 1 m = 1 000 000)
 *   Tempo          µm pro Tick
 *   Beschleunigung µm pro Tick pro Tick (1 m/s² = 2500)
 *   Winkel         65536 = volle Umdrehung (siehe sim/lib/winkel.js)
 *   Anteile        „/4096 pro Tick“ bei Widerstand und Haftung, sonst Prozent
 */

/** µm pro Meter. */
export const UM_PRO_METER = 1000000;

/**
 * Rechnet km/h in µm pro Tick um (1 km/h = 1 000 000 / 72 µm/Tick bei 20 Ticks/s).
 * @param {number} kmh
 * @returns {number}
 */
export function kmhZuTempo(kmh) {
  return Math.floor((kmh * 1000000) / 72);
}

/** Größe für Darstellung und (ab M2) Kollision, in Metern. */
export const KOLOSS_LAENGE_M = 32;
export const KOLOSS_BREITE_M = 9;

/**
 * Kesseldruck-Stufen. `kmh` = Höchsttempo auf Packschnee bei Vollgas.
 * WARUM Stufe 0 „ruht“: Später (M4) spart das Kohle, wenn man steht und birgt.
 */
export const DRUCKSTUFEN = [
  { name: 'Kessel ruht', kmh: 0 },
  { name: 'Schwach', kmh: 10 },
  { name: 'Mittel', kmh: 18 },
  { name: 'Stark', kmh: 26 },
  { name: 'Volldampf', kmh: 34 },
];

/** Druckstufe beim Start. */
export const START_DRUCK = 2;

/** Höchsttempo rückwärts auf Packschnee (braucht Druck > 0). */
export const RUECKWAERTS_KMH = 6;

/**
 * Widerstand von Packschnee, auf den sich die Höchsttempi oben beziehen (/4096 pro Tick).
 * WARUM so klein: 32/4096 heißt „pro Tick verliert der Koloss 0,8 % Tempo“. Daraus folgt eine
 * Anfahrzeit von rund 6 s bis knapp unter Höchsttempo — schwer, aber nicht zäh.
 */
export const WIDERSTAND_BEZUG = 32;

/**
 * Schub pro Druckstufe (µm/Tick²), so berechnet, dass auf Packschnee genau das Höchsttempo
 * erreicht wird: Gleichgewicht Schub = Tempo × Widerstand / 4096.
 */
export const SCHUB = DRUCKSTUFEN.map((d) => Math.floor((kmhZuTempo(d.kmh) * WIDERSTAND_BEZUG) / 4096));

/** Schub rückwärts (µm/Tick²). */
export const SCHUB_RUECKWAERTS = Math.floor((kmhZuTempo(RUECKWAERTS_KMH) * WIDERSTAND_BEZUG) / 4096);

/** Bremsverzögerung bei S während der Vorwärtsfahrt (µm/Tick², 3750 = 1,5 m/s²). */
export const BREMSE = 3750;

/** Zusätzliches Ausrollen ohne Gas (µm/Tick², 375 = 0,15 m/s²). */
export const ROLLEN = 375;

/** Höchste Drehgeschwindigkeit bei vollem Einschlag (Winkel pro Tick; 91 ≈ 10°/s).
 * Spieltest 4: vorher 137 (15°/s) war zu wendig für 400 Tonnen. */
export const DREH_MAX = 91;

/** Ab diesem Tempo lenkt der Koloss voll; darunter weniger, im Stand gar nicht. */
export const TEMPO_VOLLE_LENKUNG = kmhZuTempo(8);

/**
 * Wie schnell sich die Drehung dem Lenkwunsch nähert (Prozent pro Tick).
 * WARUM: Ohne diese Trägheit dreht der Koloss ruckartig wie ein Spielzeugauto.
 */
export const DREH_ANPASSUNG = 20;

/** Ein km/h in µm pro Tick (für Regler und Anzeigen). */
export const TEMPO_EIN_KMH = kmhZuTempo(1);

/** „Tempo halten“ lässt sich erst ab diesem Tempo einschalten (km/h). */
export const TEMPOMAT_MIN_KMH = 2;

/** Höchstes einstellbares Zieltempo am Schieberegler (km/h) = Volldampf auf Packschnee. */
export const TEMPOMAT_MAX_KMH = 34;

/**
 * „Tempo halten“: so viel Prozent Gas zusätzlich je km/h unter dem Ziel.
 * WARUM 50: Kräftig genug, dass das Tempo nach Untergrundwechsel schnell wieder stimmt,
 * aber ohne Pendeln (Gas wird ohnehin auf 0 … 100 begrenzt).
 */
export const TEMPOMAT_KORREKTUR = 50;

/** Wertebereich von Gas und Lenkung in STEUERN-Befehlen (Tastatur = ±100, Gamepad später feiner). */
export const EINGABE_MAX = 100;

/** Startpunkt (µm) und Startrichtung (Norden = nach oben). */
export const START_X = 0;
export const START_Y = 0;
export const START_RICHTUNG = 49152;
