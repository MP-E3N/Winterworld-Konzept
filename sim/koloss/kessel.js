// @ts-check
/**
 * kessel.js — Feuer, Dampfvorrat, Heizung und Wärme an Bord (ein Tick, M4a).
 *
 * ZWECK:    Der Kessel ist ein Dampfvorrat (k.dampf). Die Maschine entnimmt so viel, wie sie für den
 *           Schub braucht (Schub × Tempo). Das Feuer füllt nach — höchstens so viel, wie die
 *           eingestellte Feuerstufe (k.druck) hergibt. Verlangt man mehr, sinkt der Druck und mit ihm
 *           der mögliche Schub (sim/abfragen.js kesselSchub), bis man langsamer fährt oder stärker
 *           heizt (Spieltest M4a, Nutzerwunsch — statt der zitternden Nadel).
 *           Die Heizer legen nur nach, was gebraucht wird: Steht der Kessel voll, brennt nur die Glut.
 *           Die Heizung an Bord ist ein Thermostat: Sie heizt immer auf +23 °C und verbrennt dafür so
 *           viel, wie der Kessel allein nicht schafft — je kälter draußen, desto mehr (Spieltest M4a-2).
 * LIEST:    k.druck, k.antrieb, Tempo, k.brennstoff, k.heizung, Brennstofflager, Außentemperatur,
 *           data/koloss.js (Dampf, Brennstoff), data/klima.js (Wärme)
 * SCHREIBT: k.dampf, k.feuerMg, k.waerme, Brennstofflager (über einlagern)
 * REGEL:    docs/specs/M4a-kessel-kaelte.md, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    F3 zeigt Feuer, Dampf, Glut und Wärme. Tests: tests/kessel.test.js.
 */

import {
  BRENNSTOFFE, ERZEUGUNG, DAMPF_MAX, DAMPF_JE_STUFE, DAMPF_TEILER, DAMPF_VERLUST, MG_JE_DAMPF, GLUT_G_TICK, HEIZUNG_MG_JE_ZEHNTEL, EINGABE_MAX,
} from '../../data/koloss.js';
import { KESSEL_WAERME, HEIZUNG_ZIEL, HEIZUNG_MAX, WAERME_TRAEGHEIT } from '../../data/klima.js';
import { BRENNSTOFFLAGER } from '../../data/fundstellen.js';
import { aussenTemperatur, nachStufe, kesselSchub, kesselSchubRueckwaerts, laengsTempo } from '../abfragen.js';
import { lagerMenge, einlagern } from './lager.js';
import { teile } from '../lib/winkel.js';

/** @typedef {import('../types.js').Koloss} Koloss */
/** @typedef {import('../types.js').Zustand} Zustand */

/**
 * Ein Tick Kessel für einen Koloss (vor dem Fahren, damit der Schub schon den neuen Druck sieht).
 * @param {Koloss} k
 * @param {Zustand} state
 */
export function kesselSchritt(k, state) {
  const ware = BRENNSTOFFE[k.brennstoff].ware;
  const brennt = lagerMenge(k, BRENNSTOFFLAGER, ware) > 0;
  const entnahme = dampfEntnahme(k);
  // Nachlegen: so viel, wie fehlt — aber nicht mehr, als die Feuerstufe schafft.
  const fehlt = DAMPF_MAX - k.dampf + entnahme;
  const erzeugt = brennt ? Math.max(0, Math.min(ERZEUGUNG[k.druck], fehlt)) : 0;
  // Ohne Feuer (oder bei „Kessel ruht“) kühlt er ab; brennt das Feuer, hält es den Druck.
  const verlust = !brennt || k.druck === 0 ? DAMPF_VERLUST : 0;
  k.dampf = Math.max(0, Math.min(DAMPF_MAX, k.dampf + erzeugt - entnahme - verlust));

  // Wärme ohne Heizung: außen + Kesselwärme (ohne Feuer wärmt der Kessel nicht).
  const ohneHeizung = aussenTemperatur(state, k) + (brennt ? nachStufe(KESSEL_WAERME, k.druck * DAMPF_JE_STUFE) : 0);
  const heizt = brennt && k.heizung ? heizungsLuecke(ohneHeizung) : 0;

  // Brennstoff: Glut halten + was für den Dampf nötig war + was die Heizung gerade braucht.
  if (brennt) {
    verbrennen(k, ware, GLUT_G_TICK * 1000 + erzeugt * MG_JE_DAMPF + heizt * HEIZUNG_MG_JE_ZEHNTEL);
  } else {
    k.feuerMg = 0;
  }

  // Wärme an Bord: träge zum Ziel, mindestens 1 Schritt (sonst bleibt sie kurz davor hängen,
  // siehe CLAUDE.md „Annähern um x %“).
  const rest = ohneHeizung + heizt - k.waerme;
  const schritt = teile(rest, WAERME_TRAEGHEIT);
  k.waerme += schritt !== 0 ? schritt : Math.sign(rest);
}

/**
 * Wie viel die Heizung zuheizen muss (Zehntel °C), damit es an Bord HEIZUNG_ZIEL warm wird.
 * WARUM nach dem Ziel und nicht nach der jetzigen Wärme: So bleibt der Verbrauch ruhig — er hängt
 * nur an Außentemperatur und Feuerstufe, nicht daran, ob die Kabine gerade noch aufwärmt.
 * Ist es ohne Heizung schon warm genug, heizt (und verbrennt) sie nichts.
 * @param {number} ohneHeizung  Wärme an Bord ohne Heizung (Zehntel °C)
 * @returns {number}
 */
export function heizungsLuecke(ohneHeizung) {
  return Math.max(0, Math.min(HEIZUNG_MAX, HEIZUNG_ZIEL - ohneHeizung));
}

/**
 * Wie viel Dampf die Maschine in diesem Tick braucht: Schub, den sie gibt, × Tempo.
 * Gerechnet mit dem Antrieb des letzten Ticks (k.antrieb) und dem Tempo davor. Bremsen und
 * Ausrollen kosten keinen Dampf.
 * WARUM Schub × Tempo: Das ist die Leistung. Weil der Fahrwiderstand mit dem Tempo wächst, kostet
 * jeder km bei schneller Fahrt mehr — langsam ist sparsam, schnell verschwenderisch.
 * @param {Koloss} k
 * @returns {number}
 */
function dampfEntnahme(k) {
  const laengs = laengsTempo(k);
  if (k.antrieb > 0 && laengs >= 0) return teile(teile(kesselSchub(k) * k.antrieb, EINGABE_MAX) * laengs, DAMPF_TEILER);
  if (k.antrieb < 0 && laengs <= 0) return teile(teile(kesselSchubRueckwaerts(k) * -k.antrieb, EINGABE_MAX) * -laengs, DAMPF_TEILER);
  return 0;
}

/**
 * Zieht Brennstoff ab (Milligramm Kohle-Gegenwert, umgerechnet für Holz/Öl).
 * WARUM Milligramm-Sammler: Pro Tick sind es oft nur ein paar Gramm, im Lager zählen ganze kg.
 * @param {Koloss} k @param {string} ware @param {number} mgKohle
 */
function verbrennen(k, ware, mgKohle) {
  k.feuerMg += teile(mgKohle * BRENNSTOFFE[k.brennstoff].verbrauch, 100);
  const kg = Math.floor(k.feuerMg / 1000000);
  if (kg > 0) {
    einlagern(k, BRENNSTOFFLAGER, ware, -kg);
    k.feuerMg -= kg * 1000000;
  }
}
