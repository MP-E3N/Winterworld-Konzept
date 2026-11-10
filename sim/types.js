// @ts-check
/**
 * types.js — Typdefinitionen des Spielzustands und der Befehle (nur JSDoc, kein Code).
 *
 * ZWECK:    Eine Stelle, an der man nachschlagen kann, was im Zustand steht. tsc prüft damit
 *           alle Dateien.
 * REGEL:    CLAUDE.md Regel 4 (Zustand = reines JSON, Verweise nur über IDs)
 */

/**
 * Ein Dampfkoloss. Einheiten siehe data/koloss.js.
 * @typedef {Object} Koloss
 * @property {number} id        Index in state.kolosse
 * @property {number} besitzer  Spielernummer
 * @property {string} name
 * @property {number} x         Position Ost-West (µm) — des Drehpunkts, nicht der Rumpfmitte
 * @property {number} y         Position Nord-Süd (µm, +y = Süden)
 * @property {number} vx        Tempo in x (µm/Tick) — Weltrichtung, nicht Fahrzeugrichtung
 * @property {number} vy        Tempo in y (µm/Tick)
 * @property {number} h         Fahrtrichtung (0 … 65535, 0 = Osten, im Uhrzeigersinn)
 * @property {number} dreh      aktuelle Drehgeschwindigkeit (Winkel pro Tick)
 * @property {number} druck     Kesseldruck-Stufe (Index in DRUCKSTUFEN)
 * @property {number} gas       −100 … 100 Handgas (letzter STEUERN-Befehl; ≠ 0 übersteuert den Telegrafen)
 * @property {number} lenkung   −100 … 100 (+ = rechts)
 * @property {number} telegraf  Stellung des Maschinentelegrafen (Index in TELEGRAF, data/koloss.js)
 * @property {number} antrieb   tatsächlich wirkendes Gas im letzten Tick (−100 … 100; vom Telegrafen geregelt)
 * @property {number} licht     Scheinwerfer: 1 = an, 0 = aus (Spielzustand, weil später Sicht und
 *                              Mitspieler davon abhängen)
 * @property {Ladung} ladung    Laderaum (kg je Ware, M3)
 * @property {number} trupp     ID seines Bergungstrupps (Index in state.trupps)
 */

/**
 * Laderaum: kg je Ware (Reihenfolge und Namen in data/fundstellen.js WAREN).
 * @typedef {{kohle: number, holz: number, oel: number, nahrung: number}} Ladung
 */

/**
 * Ein Bergungstrupp (Entscheidung F4): in M3 unsichtbar, nur Ladebalken. Ab M7 bekommt er eine
 * Position und läuft sichtbar zur Fundstelle — deshalb schon jetzt ein eigenes Objekt.
 * @typedef {Object} Trupp
 * @property {number} id          Index in state.trupps
 * @property {number} koloss      ID des Kolosses, zu dem er gehört
 * @property {number} fund        ID der Fundstelle, an der er arbeitet; −1 = wartet an Bord
 * @property {number} leute       Anzahl Leute
 * @property {number} fortschritt Mann-Ticks am aktuellen Stück (data/fundstellen.js FUNDARTEN.arbeit)
 */

/**
 * Änderungsliste der Fundstellen: was von einer angebrochenen Fundstelle noch übrig ist.
 * Fundstellen ohne Eintrag sind unberührt (KONZEPT §8 R7: Welt = Seed + Änderungen).
 * @typedef {{fund: number, rest: number}} Geborgen  fund = ID, rest in kg (0 = leer)
 */

/**
 * Ein Spieler in der Welt.
 * @typedef {Object} Spieler
 * @property {number} id
 * @property {string} name
 * @property {number} koloss    ID seines Kolosses
 */

/**
 * Wetter der ganzen Welt (Einheiten siehe data/wetter.js).
 * @typedef {Object} Wetter
 * @property {number} windRichtung   wohin der Wind weht (65536 = Vollkreis, 0 = nach Osten)
 * @property {number} windStaerke    dm/s (10 = 1 m/s)
 * @property {number} zielRichtung   dahin dreht er gerade
 * @property {number} zielStaerke
 * @property {number} naechsterWechsel  Tick, an dem ein neues Ziel gewürfelt wird
 */

/**
 * Der komplette Spielzustand. Alles hier ist reines JSON und geht in den Hash.
 * @typedef {Object} Zustand
 * @property {number} version   Schema-Version (data/takt.js ZUSTAND_VERSION)
 * @property {number} seed      Welt-Seed
 * @property {number} tick      vergangene Ticks seit Weltbeginn
 * @property {number[]} rng     Zufallszustand (sim/lib/rng.js)
 * @property {Wetter} wetter
 * @property {Spieler[]} spieler
 * @property {Koloss[]} kolosse
 * @property {Trupp[]} trupps
 * @property {Geborgen[]} geborgen
 */

/**
 * Befehle — der EINZIGE Weg, den Zustand von außen zu ändern. Jeder trägt die Spielernummer,
 * damit der spätere Server weiß, von wem er kommt (und fremde Befehle ablehnen kann).
 * @typedef {{art: 'BEITRETEN', spieler: number, name: string}} BefehlBeitreten
 * @typedef {{art: 'STEUERN', spieler: number, gas: number, lenkung: number}} BefehlSteuern
 * @typedef {{art: 'DRUCK', spieler: number, stufe: number}} BefehlDruck
 * @typedef {{art: 'TELEGRAF', spieler: number, stufe: number}} BefehlTelegraf  stufe = Index in TELEGRAF
 * @typedef {{art: 'LICHT', spieler: number, an: boolean}} BefehlLicht  Scheinwerfer an/aus
 * @typedef {{art: 'BERGEN_START', spieler: number, fund: number}} BefehlBergenStart  fund = ID der Fundstelle
 * @typedef {{art: 'BERGEN_ABBRECHEN', spieler: number}} BefehlBergenAbbrechen
 * @typedef {BefehlBeitreten | BefehlSteuern | BefehlDruck | BefehlTelegraf | BefehlLicht | BefehlBergenStart | BefehlBergenAbbrechen} Befehl
 */

/**
 * Ein ausgeführter Befehl im Protokoll (für Replays): wirkt VOR dem Tick mit dieser Nummer.
 * @typedef {{tick: number, befehl: Befehl}} ProtokollEintrag
 */

/** @typedef {{ok: true} | {ok: false, grund: string}} BefehlsErgebnis */

export {};
