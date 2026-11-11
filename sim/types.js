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
 * @property {number} druck     eingestellte Feuerstufe (Index in DRUCKSTUFEN; Befehl DRUCK)
 * @property {number} dampf     Dampfvorrat im Kessel (0 … DAMPF_MAX, eine Manometer-Stufe = DAMPF_JE_STUFE);
 *                              das Feuer füllt ihn, die Maschine leert ihn (Spieltest M4a)
 * @property {number} brennstoff gewählter Brennstoff (Index in data/koloss.js BRENNSTOFFE)
 * @property {number} feuerMg    angefangenes kg Brennstoff (Milligramm, 0 … 999 999)
 * @property {number} heizung   Heizung an Bord: 1 = an (kostet Brennstoff), 0 = aus
 * @property {number} waerme     Wärme an Bord (Zehntel °C)
 * @property {number} gas       −100 … 100 Handgas (letzter STEUERN-Befehl; ≠ 0 übersteuert den Telegrafen)
 * @property {number} lenkung   −100 … 100 (+ = rechts)
 * @property {number} telegraf  Stellung des Maschinentelegrafen (Index in TELEGRAF, data/koloss.js)
 * @property {number} antrieb   tatsächlich wirkendes Gas im letzten Tick (−100 … 100; vom Telegrafen geregelt)
 * @property {number} licht     Scheinwerfer: 1 = an, 0 = aus (Spielzustand, weil später Sicht und
 *                              Mitspieler davon abhängen)
 * @property {Lager} lager     zwei Lager (kg je Ware), siehe data/fundstellen.js LAGER
 * @property {number} holzZiel  wohin neu geborgenes Holz kommt (0 = Brennstofflager, 1 = Warenlager)
 * @property {number} trupp     ID seines Bergungstrupps (Index in state.trupps)
 * @property {Crew} crew        Mannschaft an Bord (M4b)
 * @property {number} kalt      Ticks ohne Brennstoff an Bord und ohne Druck (Gnadenfrist bis zum Liegenbleiben, M4c)
 * @property {number} heimat    zuletzt besuchte Siedlung (Index in data/siedlungen.js SIEDLUNGEN, M4d) — Neustart dort
 */

/**
 * Depot eines Spielers in einer Siedlung (M4d, Nutzerentscheidung: nur einlagern und abholen).
 * Angelegt beim ersten Einlagern; Index = ID. Waren in kg (Holz aus beiden Lagern zusammen).
 * @typedef {{id: number, siedlung: number, spieler: number, kohle: number, holz: number, oel: number, nahrung: number}} Depot
 */

/**
 * Mannschaft (M4b, Nutzerentscheidung: Gruppen mit gemeinsamen Werten). Werte in Millionsteln
 * (1 000 000 = 100 %), siehe data/crew.js.
 * @typedef {Object} Crew
 * @property {number} heizer      Anzahl Heizer (essen nur mit)
 * @property {number} arbeiter    Anzahl Arbeiter (die gesunden bilden den Bergungstrupp)
 * @property {number} satt        0 … 1 000 000
 * @property {number} gesundheit  0 … 1 000 000 (darunter: anteilig krank, unter 25 % Todesfälle)
 * @property {number} moral       0 … 1 000 000 (nur Anzeige in M4b)
 * @property {number} essenMg     angefangenes kg Vorräte (Milligramm)
 * @property {number} sterben     Sammler bis zum nächsten Todesfall
 * @property {number} tote        Zahl der Toten bisher
 */

/**
 * Die zwei Lager (Spieltest M4a): Brennstoff (daraus heizt der Kessel) und Waren.
 * @typedef {{brennstoff: {kohle: number, holz: number, oel: number}, waren: {holz: number, nahrung: number}}} Lager
 */

/**
 * Abgeworfene Ware auf der Karte (Spieltest M4a). Kann wieder geborgen werden — auch von anderen.
 * Index = ID; leere Haufen bleiben mit kg 0 stehen (Liste ohne Löcher, CLAUDE.md Regel 4).
 * @typedef {{id: number, ware: 'kohle' | 'holz' | 'oel' | 'nahrung', x: number, y: number, kg: number, menge: number}} Abwurf
 *          x, y in µm; kg = was noch daliegt; menge = größte Menge (für die Größe des Haufens)
 */

/**
 * Ein Bergungstrupp (Entscheidung F4): in M3 unsichtbar, nur Ladebalken. Ab M7 bekommt er eine
 * Position und läuft sichtbar zur Fundstelle — deshalb schon jetzt ein eigenes Objekt.
 * @typedef {Object} Trupp
 * @property {number} id          Index in state.trupps
 * @property {number} koloss      ID des Kolosses, zu dem er gehört
 * @property {number} fund        ID der Fundstelle, an der er arbeitet; −1 = keine
 * @property {number} abwurf      ID des Abwurfs, den er aufnimmt; −1 = keiner (beide −1 = an Bord)
 * @property {number} leute       Anzahl Leute (ab M4b jeden Tick = gesunde Arbeiter der Crew)
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
 * @property {Abwurf[]} abwuerfe
 * @property {Wrack[]} wracks        liegengebliebene Kolosse (M4c, F6), Index = ID
 * @property {Depot[]} depots        Depots in Siedlungen je Spieler (M4d), Index = ID
 */

/**
 * Wrack eines liegengebliebenen Kolosses (F6). Die Ladung liegt als Abwürfe drumherum.
 * @typedef {{id: number, koloss: number, name: string, x: number, y: number, h: number, tick: number}} Wrack
 *          x, y = Rumpfmitte (µm), h = Richtung, tick = wann er liegen blieb
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
 * @typedef {{art: 'BRENNSTOFF', spieler: number, wahl: number}} BefehlBrennstoff  wahl = Index in BRENNSTOFFE
 * @typedef {{art: 'HEIZUNG', spieler: number, an: boolean}} BefehlHeizung
 * @typedef {{art: 'ABWERFEN', spieler: number, lager: number, ware: string, kg: number}} BefehlAbwerfen  lager = Index in LAGER
 * @typedef {{art: 'UMLAGERN', spieler: number, nach: number, kg: number}} BefehlUmlagern  Holz ins Lager „nach“
 * @typedef {{art: 'HOLZZIEL', spieler: number, lager: number}} BefehlHolzziel
 * @typedef {{art: 'AUFNEHMEN', spieler: number, abwurf: number}} BefehlAufnehmen  Abwurf wieder bergen
 * @typedef {{art: 'EINLAGERN', spieler: number, lager: number, ware: string, kg: number}} BefehlEinlagern  Koloss-Lager → Depot (M4d)
 * @typedef {{art: 'AUSLAGERN', spieler: number, lager: number, ware: string, kg: number}} BefehlAuslagern  Depot → Koloss-Lager
 * @typedef {{art: 'CREW', spieler: number, gruppe: 'heizer' | 'arbeiter', anzahl: number}} BefehlCrew  +1 anheuern, −1 absetzen
 * @typedef {BefehlBeitreten | BefehlSteuern | BefehlDruck | BefehlTelegraf | BefehlLicht | BefehlBergenStart
 *   | BefehlBergenAbbrechen | BefehlBrennstoff | BefehlHeizung | BefehlAbwerfen | BefehlUmlagern | BefehlHolzziel
 *   | BefehlAufnehmen | BefehlEinlagern | BefehlAuslagern | BefehlCrew} Befehl
 */

/**
 * Ein ausgeführter Befehl im Protokoll (für Replays): wirkt VOR dem Tick mit dieser Nummer.
 * @typedef {{tick: number, befehl: Befehl}} ProtokollEintrag
 */

/** @typedef {{ok: true} | {ok: false, grund: string}} BefehlsErgebnis */

export {};
