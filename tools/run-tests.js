// @ts-check
/**
 * run-tests.js — Führt alle Tests unter Node aus. Aufruf: `node tools/run-tests.js`
 * (oder bequemer: `tools/run-tests.ps1`, das zusätzlich die Typen prüft).
 *
 * ZWECK:    Stellt den Tests Dateizugriff bereit (für den Regel-Prüfer und Replays) und
 *           gibt das Ergebnis aus. Exit-Code 0 = alles grün, 1 = mindestens ein Fehler.
 * LIEST:    tests/alle.js und alle .js-Dateien des Projekts (für den Regel-Prüfer)
 * SCHREIBT: — (nur Konsolenausgabe)
 * REGEL:    CLAUDE.md „Tests“
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Projektordner (eine Ebene über tools/). */
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Ordner, die nie durchsucht werden. */
const AUSLASSEN = new Set(['node_modules', '.git', '.claude']);

/**
 * Sammelt rekursiv alle .js-Dateien unter einem Ordner.
 * @param {string} ordner  relativ zum Projekt, z. B. "sim" oder "."
 * @returns {Promise<{pfad: string, text: string}[]>}  pfad mit / als Trenner
 */
async function dateienLesen(ordner) {
  /** @type {{pfad: string, text: string}[]} */
  const ergebnis = [];
  /** @param {string} abs */
  async function lauf(abs) {
    for (const eintrag of await readdir(abs, { withFileTypes: true })) {
      if (AUSLASSEN.has(eintrag.name)) continue;
      const voll = path.join(abs, eintrag.name);
      if (eintrag.isDirectory()) await lauf(voll);
      else if (eintrag.name.endsWith('.js')) {
        ergebnis.push({ pfad: path.relative(WURZEL, voll).split(path.sep).join('/'), text: await readFile(voll, 'utf8') });
      }
    }
  }
  // Ordner, die es (noch) nicht gibt (z. B. server/ vor M6), gelten als leer.
  const start = path.join(WURZEL, ordner);
  if (!existsSync(start)) return ergebnis;
  await lauf(start);
  // Sortiert, damit die Ausgabe bei jedem Lauf gleich aussieht.
  return ergebnis.sort((a, b) => (a.pfad < b.pfad ? -1 : 1));
}

const { alleAusfuehren } = await import(pathToFileURL(path.join(WURZEL, 'tests', 'alle.js')).href);
const erg = await alleAusfuehren({
  dateienLesen,
  jsonLaden: async (/** @type {string} */ pfad) => JSON.parse(await readFile(path.join(WURZEL, pfad), 'utf8')),
});

console.log(erg.zeilen.join('\n'));
console.log(`\n${erg.fehler === 0 ? 'GRUEN' : 'ROT'}: ${erg.ok} ok, ${erg.fehler} Fehler, ${erg.uebersprungen} uebersprungen`);
process.exitCode = erg.fehler === 0 ? 0 : 1;
