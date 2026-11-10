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

/** Größe für Darstellung und (ab M2) Kollision, in Metern.
 * Spieltest M2b: 32 → 40 m (vorn Laderaum, neun statt sieben Radpaare). */
export const KOLOSS_LAENGE_M = 40;
export const KOLOSS_BREITE_M = 9;

/**
 * Drehpunkt (Spieltest M2b): Die Position (x, y) im Zustand ist NICHT die Rumpfmitte, sondern die
 * Mitte zwischen den zwei ungelenkten Traktionsrädern — so wie bei einem Fahrzeug mit Allradlenkung, das
 * sich um seine starre Achse dreht. Die Rumpfmitte liegt so viele Meter weiter vorn.
 * WARUM: Seit der Verlängerung nach vorn sitzen die Traktionsräder hinter der Mitte. Drehte sich
 * der Koloss um die Rumpfmitte, rutschten sie in jeder Kurve seitlich weg — das sah falsch aus.
 * Darstellung (render/koloss-mass.js) und Kollision (sim/koloss/kollision.js) rechnen damit.
 */
export const RUMPF_VOR_DREHPUNKT_M = 4.8;

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

/** Höchste Drehgeschwindigkeit (Winkel pro Tick; 64 ≈ 7°/s) — greift erst bei schneller Fahrt
 * (ab ≈ 14 km/h bei vollem Einschlag). Spieltest 4: 137 → 91 (10°/s); Spieltest M2b: 91 → 64. */
export const DREH_MAX = 64;

/**
 * Kleinster Kurvenradius bei vollem Einschlag (µm), gemessen am Drehpunkt (Spieltest M2b).
 * WARUM ein Radius statt einer festen Drehrate: Ein Radfahrzeug dreht sich nur, während es rollt —
 * je Meter Fahrt um denselben Winkel. Langsam fahren = langsam drehen, im Stand gar nicht.
 * Erst bei schneller Fahrt begrenzt DREH_MAX die Drehung (dann wird der Bogen weiter).
 */
export const WENDE_RADIUS = 32 * UM_PRO_METER; // Spieltest M2b: 20 → 32 m (generell träger)

/** Winkel-Einheiten je Bogenmaß (65536 / 2π ≈ 10430,4), für Bogen = Weg / Radius. */
export const WINKEL_JE_RAD = 10430;

/**
 * Wie schnell sich die Drehung dem Lenkwunsch nähert (Prozent pro Tick).
 * WARUM: Ohne diese Trägheit dreht der Koloss ruckartig wie ein Spielzeugauto.
 */
export const DREH_ANPASSUNG = 20;

/** Ein km/h in µm pro Tick (für Regler und Anzeigen). */
export const TEMPO_EIN_KMH = kmhZuTempo(1);

/**
 * Maschinentelegraf wie auf alten Dampfschiffen (Spieltest M2b, ersetzt „Tempo halten“).
 * W/S schalten eine Stufe weiter, die Maschine hält das Tempo der Stufe selbst.
 * Index = Stellung im Zustand (k.telegraf). kmh < 0 = rückwärts.
 * WARUM diese Tempi: Langsam/Halb/Voll/Äußerste = Höchsttempo der Kesselstufen 1–4 auf
 * Packschnee — wer „Voll voraus“ will, braucht also mindestens „Stark“ im Kessel.
 */
export const TELEGRAF = [
  { name: 'Voll zurück', kmh: -6 },
  { name: 'Halb zurück', kmh: -4 },
  { name: 'Langsam zurück', kmh: -2 },
  { name: 'Stopp', kmh: 0 },
  { name: 'Ganz langsam voraus', kmh: 4 },
  { name: 'Langsam voraus', kmh: 10 },
  { name: 'Halb voraus', kmh: 18 },
  { name: 'Voll voraus', kmh: 26 },
  { name: 'Äußerste Kraft voraus', kmh: 34 },
];

/** Index von „Stopp“ in TELEGRAF (Startstellung). */
export const TELEGRAF_STOPP = 3;

/**
 * Telegraf-Regelung: so viel Prozent Gas zusätzlich je km/h Abweichung vom Ziel.
 * WARUM 50: Kräftig genug, dass das Tempo nach Untergrundwechsel schnell wieder stimmt,
 * aber ohne Pendeln.
 */
export const TELEGRAF_KORREKTUR = 50;

/**
 * Höchstens so stark bremst die Maschine beim Herunterschalten (Prozent der vollen Bremse,
 * 20 = 0,3 m/s²; dazu kommt der Fahrwiderstand). WARUM nicht voll: Von „Voll“ auf „Langsam“
 * soll der Koloss sichtbar auslaufen, nicht stempeln. Beim Richtungswechsel bremst er voll.
 */
export const TELEGRAF_BREMSE = 20;

/** Wertebereich von Gas und Lenkung in STEUERN-Befehlen (Tastatur = ±100, Gamepad später feiner). */
export const EINGABE_MAX = 100;

/** Startpunkt (µm) und Startrichtung (Norden = nach oben). */
export const START_X = 0;
export const START_Y = 0;
export const START_RICHTUNG = 49152;

// ── Kessel und Brennstoff (M4a, Spieltest M4a: Dampfvorrat) ──

/**
 * Brennstoffe, Index = k.brennstoff. `ware` = Feld im Brennstofflager (k.lager.brennstoff).
 *   verbrauch  Prozent der Kohle-Menge für dieselbe Hitze (Holz brennt schnell, Öl lange)
 * @type {readonly {name: string, ware: 'kohle' | 'holz' | 'oel', verbrauch: number}[]}
 */
export const BRENNSTOFFE = [
  { name: 'Kohle', ware: 'kohle', verbrauch: 100 },
  { name: 'Holz', ware: 'holz', verbrauch: 200 },
  { name: 'Öl', ware: 'oel', verbrauch: 50 },
];

/**
 * DAMPFVORRAT (Spieltest M4a, Nutzerwunsch): Der Kessel ist ein Vorrat (k.dampf, 0 … DAMPF_MAX).
 * Das Feuer füllt ihn (höchstens ERZEUGUNG je Feuerstufe), die Maschine leert ihn (Schub × Tempo).
 * Verlangt der Telegraf mehr, als das Feuer liefert, sinkt der Druck — und mit ihm der mögliche
 * Schub —, bis man langsamer fährt oder stärker heizt. Statt einer zitternden Nadel.
 * Eine Manometer-Stufe = DAMPF_JE_STUFE.
 */
export const DAMPF_JE_STUFE = 100000;
export const DAMPF_MAX = 4 * DAMPF_JE_STUFE;

/** Tempo jeder Feuerstufe (µm/Tick), das sie auf Packschnee auf Dauer halten kann. */
const DAUERTEMPO = DRUCKSTUFEN.map((d) => kmhZuTempo(d.kmh));

/**
 * Dampfverbrauch je Tick = Maschinenschub × Tempo / DAMPF_TEILER.
 * WARUM so gewählt: Bei Volldampf und 34 km/h verbraucht die Maschine 1600 Einheiten je Tick — ein
 * voller Kessel reicht dann ohne Feuer etwa 12 s. So spürt man den Vorrat, ohne dass er ewig hält.
 */
export const DAMPF_TEILER = Math.floor((SCHUB[4] * DAUERTEMPO[4]) / 1600);

/**
 * Höchste Dampferzeugung je Feuerstufe (Einheiten je Tick): so viel, dass die Stufe ihr Tempo aus
 * DRUCKSTUFEN auf Packschnee auf Dauer hält (+5 % Reserve). Widerstand ∝ Tempo → Leistung ∝ Tempo²:
 * schnell fahren kostet je km deutlich mehr („schnell und verschwenderisch“).
 */
export const ERZEUGUNG = DRUCKSTUFEN.map((_, s) => Math.ceil((SCHUB[s] * DAUERTEMPO[s] * 105) / (DAMPF_TEILER * 100)));

/**
 * Brennstoff je Dampf-Einheit (mg Kohle). Die Heizer legen nur nach, was gebraucht wird (Nutzer-
 * entscheidung): Steht der Kessel voll, brennt nur die Glut. Bei „Mittel“ unter Volllast ≈ 360 kg/min.
 */
export const MG_JE_DAMPF = 640;
/** Glut halten (g Kohle je Tick, ≈ 20 kg/min), solange Brennstoff da ist. */
export const GLUT_G_TICK = 17;
/** Ohne Feuer (oder „Kessel ruht“) kühlt der Kessel ab: so viel Dampf geht je Tick verloren (~3 min). */
export const DAMPF_VERLUST = 100;

/** Heizung an Bord (wie die Lampe ein Schalter): so viel Brennstoff zusätzlich (g Kohle je Tick,
 * ≈ 60 kg/min) … */
export const HEIZUNG_G_TICK = 50;

/** Brennstoff an Bord beim Start (kg). */
export const START_KOHLE_KG = 4000;
export const START_HOLZ_KG = 1000;
