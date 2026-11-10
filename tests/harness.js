// @ts-check
/**
 * harness.js — Winziger eigener Test-Rahmen (ohne Fremdbibliothek).
 *
 * ZWECK:    Tests anmelden (`test(name, fn)`), Prüfhelfer bereitstellen und alle Tests
 *           ausführen. Läuft unter Node (tools/run-tests.js) UND im Browser (tests/test.html).
 * LIEST:    die angemeldeten Tests
 * SCHREIBT: —
 * REGEL:    CLAUDE.md „Tests“
 * DEBUG:    Einen einzelnen Test isolieren: im Test-Aufruf `test.nur(...)` statt `test(...)`.
 */

/**
 * Was ein Test von seiner Umgebung bekommt. Node und Browser füllen das unterschiedlich.
 * @typedef {Object} Umgebung
 * @property {null | ((ordner: string) => Promise<{pfad: string, text: string}[]>)} dateienLesen
 *           alle .js-Dateien unter einem Ordner (relativ zum Projekt); null = nicht verfügbar (Browser)
 * @property {(pfad: string) => Promise<any>} jsonLaden  JSON-Datei relativ zum Projekt laden
 */

/** @typedef {{name: string, fn: (u: Umgebung) => (void | Promise<void>), nur: boolean}} Test */

/** @type {Test[]} */
const TESTS = [];

/**
 * Meldet einen Test an.
 * @param {string} name  Was geprüft wird, als Satz („gleicher Seed ergibt gleiche Folge“)
 * @param {(u: Umgebung) => (void | Promise<void>)} fn  wirft bei Fehler
 */
export function test(name, fn) { TESTS.push({ name, fn, nur: false }); }

/**
 * Wie test(), aber beim Ausführen laufen dann NUR so markierte Tests (zum Eingrenzen).
 * Vor dem Commit wieder entfernen!
 * @param {string} name
 * @param {(u: Umgebung) => (void | Promise<void>)} fn
 */
test.nur = (name, fn) => { TESTS.push({ name, fn, nur: true }); };

/** Fehlerart „übersprungen“. Wird geworfen, wenn ein Test in dieser Umgebung nicht laufen kann. */
const UEBERSPRUNGEN = Symbol('uebersprungen');

/**
 * Überspringt den laufenden Test (z. B. Dateizugriff im Browser).
 * @param {string} grund
 * @returns {never}
 */
export function ueberspringen(grund) { throw { [UEBERSPRUNGEN]: grund }; }

/**
 * Prüft eine Bedingung.
 * @param {boolean} bedingung
 * @param {string} meldung  was erwartet war
 */
export function pruefe(bedingung, meldung) {
  if (!bedingung) throw new Error(meldung);
}

/**
 * Prüft Gleichheit (===) und zeigt bei Fehler beide Werte.
 * @param {unknown} ist
 * @param {unknown} soll
 * @param {string} meldung
 */
export function gleich(ist, soll, meldung) {
  if (ist !== soll) throw new Error(`${meldung}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
}

/**
 * Führt alle angemeldeten Tests aus.
 * @param {Umgebung} umgebung
 * @returns {Promise<{ok: number, fehler: number, uebersprungen: number, zeilen: string[]}>}
 */
export async function alleAusfuehren(umgebung) {
  const auswahl = TESTS.some((t) => t.nur) ? TESTS.filter((t) => t.nur) : TESTS;
  const erg = { ok: 0, fehler: 0, uebersprungen: 0, zeilen: /** @type {string[]} */ ([]) };
  for (const t of auswahl) {
    const t0 = Date.now(); // Date ist in Tests erlaubt (nur sim/ ist tabu)
    try {
      await t.fn(umgebung);
      erg.ok += 1;
      erg.zeilen.push(`  OK    ${t.name} (${Date.now() - t0} ms)`);
    } catch (e) {
      if (e && typeof e === 'object' && UEBERSPRUNGEN in e) {
        erg.uebersprungen += 1;
        erg.zeilen.push(`  SKIP  ${t.name}: ${String(/** @type {any} */ (e)[UEBERSPRUNGEN])}`);
      } else {
        erg.fehler += 1;
        erg.zeilen.push(`  FAIL  ${t.name}\n        ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if (auswahl !== TESTS) erg.zeilen.push('  HINWEIS: test.nur aktiv, nicht alle Tests gelaufen!');
  return erg;
}
