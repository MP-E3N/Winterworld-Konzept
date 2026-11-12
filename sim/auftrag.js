// @ts-check
/**
 * auftrag.js — Rettungsauftrag: Überlebende rund 5 km entfernt finden und heimbringen (M5b).
 *
 * ZWECK:    Szenario (Nutzerwunsch): Man startet in der Stadt mit Generator. Irgendwo in einer grob
 *           bekannten Region (Kreis auf der Karte) warten Überlebende. Kommt ein Koloss auf ~1 km heran,
 *           steigt ihr Signalballon auf (gesichtet). Im Stand neben dem Lager steigen sie ein (Befehl
 *           RETTEN), in einer Siedlung wieder aus (gerettet). Bleibt der Koloss mit ihnen liegen, sind sie
 *           verloren. Kein Zeitlimit (Nutzerentscheidung).
 *           Wo Region und Lager liegen, folgt aus dem Seed (wie das Gelände) — im Zustand steht nur der
 *           Fortschritt (state.auftrag).
 * LIEST:    Seed, Gelände (befahrbar), Kolosse (Lage, Stand, Crew), data/auftrag.js
 * SCHREIBT: state.auftrag, k.crew (Passagiere) — nur über auftragSchritt (Tick), RETTEN (Befehl),
 *           ankunft() (aus sim/siedlung.js) und verlorenBeimWrack() (aus sim/koloss/wrack.js)
 * REGEL:    docs/specs/M5b-rettung.md, CLAUDE.md Regeln 1–3
 * DEBUG:    ek.auftrag(); F3-Zeile „Auftrag“. Tests: tests/auftrag.test.js.
 */

import { hash2 } from './welt/rauschen.js';
import { befahrbarAn } from './welt/untergrund.js';
import { cosW, sinW, teile, TRIG_EINS } from './lib/winkel.js';
import { rumpfMitte, kolossSteht } from './abfragen.js';
import { UM_PRO_METER } from '../data/koloss.js';
import { TESTGELAENDE_SEED } from '../data/welt.js';
import { KOJEN } from '../data/siedlungen.js';
import {
  UEBERLEBENDE, REGION_ABSTAND_MIN_M, REGION_ABSTAND_MAX_M, LAGER_STREUUNG_M, LAGER_FREI_M, SIGNAL_SICHT_M,
  RETTEN_REICHWEITE_M, GERETTET_GESUNDHEIT, GERETTET_SATT, TEST_REGION, TEST_LAGER,
} from '../data/auftrag.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Koloss} Koloss */
/** @typedef {{region: {x: number, y: number}, lager: {x: number, y: number}}} Rettungsort  Meter */

/** Zwischenspeicher je Seed (die Suche nach freiem Boden fragt das Gelände einige hundert Mal ab). */
const ortSpeicher = { seed: NaN, ort: /** @type {Rettungsort | null} */ (null) };

// ── Ort aus dem Seed ──

/**
 * Wo liegen Region (Mitte) und Lager? Gleicher Seed = gleicher Ort.
 * @param {number} seed
 * @returns {Rettungsort}  in Metern
 */
export function rettungsOrt(seed) {
  if (ortSpeicher.seed === seed && ortSpeicher.ort) return ortSpeicher.ort;
  const ort = seed === TESTGELAENDE_SEED ? { region: TEST_REGION, lager: TEST_LAGER } : ortBerechnen(seed);
  ortSpeicher.seed = seed; ortSpeicher.ort = ort;
  return ort;
}

/**
 * Region in zufälliger Richtung ~5 km vom Start, Lager darin auf freiem Boden.
 * @param {number} seed
 * @returns {Rettungsort}
 */
function ortBerechnen(seed) {
  const h1 = hash2(seed + 911, 1, 0), h2 = hash2(seed + 911, 2, 0), h3 = hash2(seed + 911, 3, 0), h4 = hash2(seed + 911, 4, 0);
  const richtung = h1 & 65535;
  const abstand = REGION_ABSTAND_MIN_M + (h2 % (REGION_ABSTAND_MAX_M - REGION_ABSTAND_MIN_M + 1));
  const region = { x: teile(abstand * cosW(richtung), TRIG_EINS), y: teile(abstand * sinW(richtung), TRIG_EINS) };
  const versatz = h4 % (LAGER_STREUUNG_M + 1);
  const wunsch = { x: region.x + teile(versatz * cosW(h3 & 65535), TRIG_EINS), y: region.y + teile(versatz * sinW(h3 & 65535), TRIG_EINS) };
  return { region, lager: freienBodenSuchen(seed, wunsch, region) };
}

/**
 * Sucht in Ringen um den Wunschort einen Platz, an dem rundherum befahrbarer Boden ist.
 * WARUM: Das Lager darf nicht in einem Felsen oder einer Schlucht liegen — man muss heranfahren können.
 * @param {number} seed @param {{x: number, y: number}} wunsch @param {{x: number, y: number}} region  Meter
 * @returns {{x: number, y: number}}
 */
function freienBodenSuchen(seed, wunsch, region) {
  for (let r = 0; r <= LAGER_STREUUNG_M; r += 20) {
    const schritte = r === 0 ? 1 : 16;
    for (let i = 0; i < schritte; i++) {
      const w = (i * 65536) / schritte;
      const p = { x: wunsch.x + teile(r * cosW(w), TRIG_EINS), y: wunsch.y + teile(r * sinW(w), TRIG_EINS) };
      if (frei(seed, p)) return p;
    }
  }
  return region; // kaum möglich: dann eben die Mitte der Region
}

/** @param {number} seed @param {{x: number, y: number}} p  Meter @returns {boolean} */
function frei(seed, p) {
  for (let i = 0; i < 9; i++) {
    const r = i === 0 ? 0 : LAGER_FREI_M, w = (i * 65536) / 8;
    const x = (p.x + teile(r * cosW(w), TRIG_EINS)) * UM_PRO_METER, y = (p.y + teile(r * sinW(w), TRIG_EINS)) * UM_PRO_METER;
    if (!befahrbarAn(seed, x, y)) return false;
  }
  return true;
}

// ── Zustand und Tick ──

/** @returns {import('./types.js').Auftrag}  Fortschritt beim Anlegen der Welt */
export function auftragStart() {
  return { leute: UEBERLEBENDE, gesichtet: 0, gerettet: 0, verloren: 0 };
}

/**
 * Liegt die Rumpfmitte höchstens `maxM` vom Lager? (In mm gerechnet, erst die Kästchen-Probe — wie inReichweite.)
 * @param {Koloss} k @param {Rettungsort} ort @param {number} maxM
 * @returns {boolean}
 */
function naheLager(k, ort, maxM) {
  const m = rumpfMitte(k), r = maxM * 1000;
  const dx = teile(m.x, 1000) - ort.lager.x * 1000, dy = teile(m.y, 1000) - ort.lager.y * 1000;
  if (Math.abs(dx) > r || Math.abs(dy) > r) return false;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Ein Tick: Ist ein Koloss nah genug, steigt der Signalballon auf (bleibt oben).
 * @param {Zustand} state
 */
export function auftragSchritt(state) {
  if (state.auftrag.gesichtet) return;
  const ort = rettungsOrt(state.seed);
  for (const k of state.kolosse) if (naheLager(k, ort, SIGNAL_SICHT_M)) { state.auftrag.gesichtet = 1; return; }
}

// ── Befehl RETTEN ──

/**
 * @param {Zustand} state @param {Koloss} k
 * @returns {string | null}  null = erlaubt
 */
export function rettenPruefen(state, k) {
  if (state.auftrag.leute <= 0) return 'dort wartet niemand mehr';
  if (!kolossSteht(k)) return 'Koloss steht nicht (Telegraf auf Stopp)';
  if (!naheLager(k, rettungsOrt(state.seed), RETTEN_REICHWEITE_M)) return 'zu weit vom Lager';
  return freieKojen(k) > 0 ? null : 'alle Kojen belegt';
}

/**
 * So viele steigen ein, wie Kojen frei sind. Sie sind geschwächt — die gemeinsamen Werte werden anteilig
 * gemischt (wie beim Anheuern, E-018/E-020).
 * @param {Zustand} state @param {Koloss} k
 */
export function rettenAnwenden(state, k) {
  const c = k.crew;
  const neu = Math.min(freieKojen(k), state.auftrag.leute);
  const n = c.heizer + c.arbeiter + c.passagiere;
  c.gesundheit = teile(c.gesundheit * n + GERETTET_GESUNDHEIT * neu, n + neu);
  c.satt = teile(c.satt * n + GERETTET_SATT * neu, n + neu);
  c.passagiere += neu;
  state.auftrag.leute -= neu;
  state.auftrag.gesichtet = 1;
}

/** @param {Koloss} k @returns {number} */
export function freieKojen(k) {
  return KOJEN - k.crew.heizer - k.crew.arbeiter - k.crew.passagiere;
}

// ── Ankunft und Verlust ──

/**
 * Hält der Koloss in einer Siedlung, steigen die Geretteten aus (aufgerufen von siedlungSchritt).
 * @param {Zustand} state @param {Koloss} k
 */
export function ankunft(state, k) {
  if (k.crew.passagiere <= 0) return;
  state.auftrag.gerettet += k.crew.passagiere;
  k.crew.passagiere = 0;
}

/**
 * Bleibt ein Koloss mit Geretteten liegen, sind sie verloren (aufgerufen von wrackMachen).
 * @param {Zustand} state @param {Koloss} k
 */
export function verlorenBeimWrack(state, k) {
  state.auftrag.verloren += k.crew.passagiere;
}

/**
 * Ist der Auftrag erfüllt? Niemand wartet mehr, keiner ist mehr unterwegs, mindestens einer gerettet.
 * @param {Zustand} state
 * @returns {boolean}
 */
export function auftragErfuellt(state) {
  const a = state.auftrag;
  return a.leute === 0 && a.gerettet > 0 && state.kolosse.every((k) => k.crew.passagiere === 0);
}

/**
 * Steht der Koloss so, dass Leute einsteigen können? (Für die Anzeige.)
 * @param {Zustand} state @param {Koloss} k
 * @returns {boolean}
 */
export function amLager(state, k) {
  return naheLager(k, rettungsOrt(state.seed), RETTEN_REICHWEITE_M);
}
