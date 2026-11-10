// @ts-check
/**
 * generator.js — Berechnet das Gelände an einem Punkt aus dem Seed.
 *
 * ZWECK:    Die Welt ist unbegrenzt und wird nie gespeichert: Jeder Punkt lässt sich jederzeit aus
 *           Seed und Koordinaten neu berechnen. Die Schichten (in dieser Reihenfolge):
 *             Ebene/Bergland → Höhe → Fels · Schluchtband (mit Furten) → Schlucht
 *             · Seen (Rand dünn, Mitte dick) · Wehen und Bergfuß → Pulverschnee · sonst Packschnee.
 *           Startbereich wird freigehalten, nach außen (Ringe) gibt es mehr Fels und Eis.
 * LIEST:    data/welt.js, data/testgelaende.js (Seed 0)
 * SCHREIBT: —
 * REGEL:    docs/specs/M2-welt.md, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    `node tools/welt-ansehen.js <seed>` zeichnet die Umgebung des Starts als Text.
 *           tests/welt.test.js prüft Anteile und Erreichbarkeit über 20 Seeds.
 *
 * KOORDINATEN: Feinpunkte zu 25 cm (data/welt.js FEIN_UM). Physik und Darstellung fragen beide
 * hier — deshalb passen Ufer im Bild und Kollision auf 25 cm genau zusammen.
 * RÜCKGABE: gepackte Zahl  typ * 65536 + hoehe  (typ = Untergrund-ID, hoehe 0 … 65535).
 */

import { schichtRauschen, wertRauschen } from './rauschen.js';
import { PACKSCHNEE, PULVERSCHNEE, EIS_DICK, EIS_DUENN, FELS, SCHLUCHT } from '../../data/untergrund.js';
import { TESTFLAECHEN } from '../../data/testgelaende.js';
import {
  FEIN_PRO_M, TESTGELAENDE_SEED, START_FREI_M, START_SICHER_M, RING_M, EBENE_GROESSE_M, EBENE_AB, EBENE_FELS_BONUS,
  HOEHE_GROESSE_M, FELS_AB, RING_FELS, BERGFUSS, SCHLUCHT_GROESSE_M, SCHLUCHT_BREITE, FURT_GROESSE_M, FURT_AB,
  SEE_GROESSE_M, SEE_BIS, RING_SEE, SEE_RAND, SEE_MAX_HOEHE, WEHE_GROESSE_M, WEHE_AB,
} from '../../data/welt.js';

/** Meter → Feinpunkte (für Größen und Radien). */
const F = FEIN_PRO_M;
const START_FREI2 = (START_FREI_M * F) * (START_FREI_M * F);
const START_SICHER2 = (START_SICHER_M * F) * (START_SICHER_M * F);
/** Felsschwelle am Rand des Sicherheitskreises so viel höher, dass dort praktisch kein Fels steht. */
const START_BONUS = 24000;

/**
 * @param {number} seed
 * @param {number} fx @param {number} fy  Feinpunkte (25 cm), 0/0 = Startpunkt
 * @returns {number} typ * 65536 + hoehe
 */
export function gelaendeAn(seed, fx, fy) {
  if (seed === TESTGELAENDE_SEED) return testgelaende(fx, fy);

  const abstand2 = fx * fx + fy * fy;
  const hoehe = schichtRauschen(seed + 11, fx, fy, HOEHE_GROESSE_M * F);
  if (abstand2 < START_FREI2) return PACKSCHNEE * 65536 + hoehe;
  const sicher = abstand2 < START_SICHER2;
  // Weicher Übergang: Bis zum doppelten Sicherheitsradius liegt die Felsschwelle höher und sinkt
  // nach außen auf normal. Sonst schnitte der Sicherheitskreis Gebirge kreisrund aus (Spieltest M2).
  const startBonus = abstand2 < 4 * START_SICHER2 ? Math.floor((START_BONUS * (4 * START_SICHER2 - abstand2)) / (3 * START_SICHER2)) : 0;
  // Ring: 0 am Start … 1024 ab RING_M (größeres der beiden Maße statt Wurzel — reicht hier).
  const weite = Math.max(Math.abs(fx), Math.abs(fy));
  const ring = Math.min(1024, Math.floor((weite * 1024) / (RING_M * F)));
  // Ebene oder Bergland? In der Ebene kaum Fels und keine Schluchten.
  const ebene = wertRauschen(seed + 53, fx, fy, EBENE_GROESSE_M * F) > EBENE_AB;

  // ── Fels (Berge) ──
  const felsAb = FELS_AB - Math.floor((RING_FELS * ring) / 1024) + (ebene ? EBENE_FELS_BONUS : 0) + startBonus;
  if (!sicher && hoehe > felsAb) return FELS * 65536 + hoehe;

  // ── Schluchten: schmales Band, wo das Rauschen die Mitte kreuzt; Furten unterbrechen es ──
  if (!sicher && !ebene) {
    const s = wertRauschen(seed + 23, fx, fy, SCHLUCHT_GROESSE_M * F);
    if (Math.abs(s - 32768) < SCHLUCHT_BREITE && wertRauschen(seed + 29, fx, fy, FURT_GROESSE_M * F) < FURT_AB) {
      return SCHLUCHT * 65536 + hoehe;
    }
  }

  // ── Seen (nur unterhalb des Gebirges) ──
  const see = schichtRauschen(seed + 37, fx, fy, SEE_GROESSE_M * F);
  const seeBis = SEE_BIS + Math.floor((RING_SEE * ring) / 1024);
  if (see < seeBis && hoehe < SEE_MAX_HOEHE) {
    return (see > seeBis - SEE_RAND ? EIS_DUENN : EIS_DICK) * 65536 + hoehe;
  }

  // ── Pulverschnee: Wehen und Schnee am Bergfuß ──
  if (hoehe > felsAb - BERGFUSS) return PULVERSCHNEE * 65536 + hoehe;
  if (schichtRauschen(seed + 41, fx, fy, WEHE_GROESSE_M * F) > WEHE_AB) return PULVERSCHNEE * 65536 + hoehe;

  return PACKSCHNEE * 65536 + hoehe;
}

/**
 * Seed 0: feste Testflächen (Kreise in Metern) auf Packschnee, Höhe überall gleich.
 * @param {number} fx @param {number} fy  Feinpunkte
 * @returns {number}
 */
function testgelaende(fx, fy) {
  let typ = PACKSCHNEE;
  for (const t of TESTFLAECHEN) {
    const dx = fx - t.x * F, dy = fy - t.y * F, r = t.r * F;
    if (dx * dx + dy * dy <= r * r) typ = t.untergrund; // spätere Fläche gewinnt
  }
  return typ * 65536 + 32768;
}
