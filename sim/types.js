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
 * @property {number} x         Position Ost-West (µm)
 * @property {number} y         Position Nord-Süd (µm, +y = Süden)
 * @property {number} vx        Tempo in x (µm/Tick) — Weltrichtung, nicht Fahrzeugrichtung
 * @property {number} vy        Tempo in y (µm/Tick)
 * @property {number} h         Fahrtrichtung (0 … 65535, 0 = Osten, im Uhrzeigersinn)
 * @property {number} dreh      aktuelle Drehgeschwindigkeit (Winkel pro Tick)
 * @property {number} druck     Kesseldruck-Stufe (Index in DRUCKSTUFEN)
 * @property {number} gas       −100 … 100 (letzter STEUERN-Befehl)
 * @property {number} lenkung   −100 … 100 (+ = rechts)
 * @property {number} tempomat  „Tempo halten“: Zieltempo in µm/Tick, 0 = aus
 * @property {number} antrieb   tatsächlich wirkendes Gas im letzten Tick (−100 … 100; mit Tempo halten ≠ gas)
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
 */

/**
 * Befehle — der EINZIGE Weg, den Zustand von außen zu ändern. Jeder trägt die Spielernummer,
 * damit der spätere Server weiß, von wem er kommt (und fremde Befehle ablehnen kann).
 * @typedef {{art: 'BEITRETEN', spieler: number, name: string}} BefehlBeitreten
 * @typedef {{art: 'STEUERN', spieler: number, gas: number, lenkung: number}} BefehlSteuern
 * @typedef {{art: 'DRUCK', spieler: number, stufe: number}} BefehlDruck
 * @typedef {{art: 'TEMPOMAT', spieler: number, an: boolean, kmh?: number}} BefehlTempomat
 *           kmh fehlt = aktuelles Tempo halten; kmh gesetzt (Schieberegler) = dieses Tempo halten
 * @typedef {BefehlBeitreten | BefehlSteuern | BefehlDruck | BefehlTempomat} Befehl
 */

/**
 * Ein ausgeführter Befehl im Protokoll (für Replays): wirkt VOR dem Tick mit dieser Nummer.
 * @typedef {{tick: number, befehl: Befehl}} ProtokollEintrag
 */

/** @typedef {{ok: true} | {ok: false, grund: string}} BefehlsErgebnis */

export {};
