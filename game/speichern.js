// @ts-check
/**
 * speichern.js — Spielstand im Browser: automatisch beim Halt in der Siedlung, beim Neuladen weiter (M4d).
 *
 * ZWECK:    Nutzerentscheidung: gespeichert wird nur in der Siedlung (Spielstand-Punkt) — beim Eintreffen
 *           sofort, nach jedem Befehl dort und sonst alle AUTO_TICKS. Beim Start der Seite lädt main.js den
 *           Spielstand, wenn seine Zustandsversion passt; sonst beginnt eine neue Welt.
 * LIEST:    Zustand über die Verbindung, data/takt.js ZUSTAND_VERSION
 * SCHREIBT: localStorage „eiskoloss.spielstand“ — NIE den Zustand (CLAUDE.md Regel 1)
 * REGEL:    docs/specs/M4d-siedlung.md „Speichern“, KONZEPT.md §8 Regel 10 (Zustand mit Versionsnummer)
 * DEBUG:    ek.spielstand() zeigt den letzten Spielstand, ek.spielstandLoeschen() löscht ihn.
 *           Tests: tests/siedlung.test.js (hin und zurück, ohne Browser).
 */

import { ZUSTAND_VERSION } from '../data/takt.js';
import { kolossVon } from '../sim/abfragen.js';
import { siedlungImStand } from '../sim/siedlung.js';
import { SIEDLUNGEN } from '../data/siedlungen.js';

/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {import('./spiel.js').Spiel} Spiel */
/** @typedef {{version: number, zeit: string, spieler: number, zustand: Zustand}} Spielstand */

/** Schlüssel im localStorage. */
export const SCHLUESSEL = 'eiskoloss.spielstand';
/** Solange man in der Siedlung steht, so oft neu speichern (Ticks, 20 s Spielzeit). */
const AUTO_TICKS = 400;
/** So lange steht die Meldung „… Spielstand gespeichert“ oben (ms). */
const MELDUNG_MS = 3500;

// ── Rein (auch in Node testbar) ──

/**
 * Spielstand als Text.
 * @param {Zustand} zustand @param {number} spieler  eigene Spielernummer @param {string} zeit  ISO-Zeit
 * @returns {string}
 */
export function spielstandText(zustand, spieler, zeit) {
  return JSON.stringify({ version: zustand.version, zeit, spieler, zustand });
}

/**
 * Liest einen Spielstand. WARUM so streng: Ein Stand aus einer älteren Version hat andere Felder —
 * damit weiterzuspielen gäbe schwer zu findende Fehler. Dann lieber neu anfangen.
 * @param {string | null} text
 * @returns {Spielstand | null}
 */
export function spielstandLesen(text) {
  if (!text) return null;
  try {
    const s = JSON.parse(text);
    if (s?.version !== ZUSTAND_VERSION || s.zustand?.version !== ZUSTAND_VERSION || !Number.isInteger(s.spieler)) return null;
    return s;
  } catch {
    return null;
  }
}

// ── Browser ──

/** @returns {Storage | null}  null, wenn es keinen Speicher gibt (Node, gesperrter Speicher) */
function speicher() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * Den gespeicherten Spielstand holen (oder null). Eine alte Version meldet sich in der Konsole.
 * @returns {Spielstand | null}
 */
export function spielstandLaden() {
  const text = speicher()?.getItem(SCHLUESSEL) ?? null;
  const s = spielstandLesen(text);
  if (text && !s) console.info('[Spielstand] passt nicht zu dieser Version — neue Welt. Löschen: ek.spielstandLoeschen()');
  return s;
}

/** Spielstand löschen. */
export function spielstandLoeschen() {
  speicher()?.removeItem(SCHLUESSEL);
}

/** Merker fürs automatische Speichern. befehle = Länge des Protokolls beim letzten Speichern. */
const auto = { da: false, letzterTick: -1, befehle: 0, meldungMs: 0, ort: '' };

/**
 * Jedes Bild aufrufen: Steht der eigene Koloss in einer Siedlung, speichern — beim Eintreffen sofort,
 * nach jedem Befehl dort (Depot, Crew: sonst wären die beim Neuladen weg), sonst alle AUTO_TICKS.
 * @param {Spiel} spiel @param {number} dtMs
 */
export function autoSpeichern(spiel, dtMs) {
  auto.meldungMs = Math.max(0, auto.meldungMs - dtMs);
  const v = spiel.verbindung, s = v.zustand();
  const k = kolossVon(s, v.spieler);
  const siedlung = k ? siedlungImStand(k) : -1;
  const da = siedlung >= 0;
  const eingetroffen = da && !auto.da;
  const neueBefehle = v.protokoll().length !== auto.befehle;
  auto.da = da;
  if (!da || (!eingetroffen && !neueBefehle && s.tick - auto.letzterTick < AUTO_TICKS)) return;
  auto.befehle = v.protokoll().length;
  try {
    speicher()?.setItem(SCHLUESSEL, spielstandText(s, v.spieler, new Date().toISOString()));
  } catch (e) {
    console.warn('[Spielstand] konnte nicht speichern', e);
    return;
  }
  auto.letzterTick = s.tick;
  if (eingetroffen) { auto.meldungMs = MELDUNG_MS; auto.ort = SIEDLUNGEN[siedlung].name; }
}

/**
 * Meldung oben nach dem Eintreffen (leer, wenn keine).
 * @returns {string}
 */
export function speicherMeldung() {
  return auto.meldungMs > 0 ? `${auto.ort.toUpperCase()} — Spielstand gespeichert` : '';
}

/** Nach einer neuen Welt: wie frisch eingetroffen behandeln. */
export function autoZuruecksetzen() {
  auto.da = false; auto.letzterTick = -1; auto.befehle = 0; auto.meldungMs = 0;
}

/**
 * Für die Konsole: was ist gespeichert?
 * @returns {{zeit: string, tick: number, seed: number, kb: number} | null}
 */
export function spielstandInfo() {
  const text = speicher()?.getItem(SCHLUESSEL) ?? null;
  const s = spielstandLesen(text);
  return s && text ? { zeit: s.zeit, tick: s.zustand.tick, seed: s.zustand.seed, kb: Math.round(text.length / 1024) } : null;
}
