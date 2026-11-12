// @ts-check
/**
 * crew.js — Die Mannschaft an Bord: essen, krank werden, sich erholen, sterben, Moral (ein Tick, M4b).
 *
 * ZWECK:    Die Crew besteht aus Gruppen (Heizer, Arbeiter) mit gemeinsamen Werten (Nutzerentscheidung).
 *           Sie isst Vorräte aus dem Warenlager. Kälte an Bord und Hunger kosten Gesundheit, Wärme und
 *           Essen bringen sie zurück. Je schlechter die Gesundheit, desto mehr Leute sind krank — kranke
 *           Arbeiter bergen nicht (der Trupp wird kleiner). Sehr schlechte Gesundheit kostet Leben.
 *           Die Moral wird nur berechnet und angezeigt (Wirkung später).
 * LIEST:    k.crew, k.waerme (vom Kessel in diesem Tick), Warenlager, data/crew.js
 * SCHREIBT: k.crew, Vorräte im Warenlager (über einlagern), trupp.leute
 * REGEL:    docs/specs/M4b-crew.md, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    F3 zeigt die Crew. Tests: tests/crew.test.js.
 */

import {
  VOLL, ESSEN_MG_TICK, SATT_STEIGT, SATT_SINKT, KALT_AB, KAELTE_SCHADEN, HUNGER_AB, HUNGER_TEILER,
  ERHOLUNG, ERHOLUNG_WARM_AB, ERHOLUNG_SATT_AB, STERBEN_UNTER, STERBEN_SCHWELLE, TOD_MORAL,
  MORAL_TRAEGHEIT, MORAL_KAELTE, MORAL_HUNGER_PROZENT, MORAL_KRANK_PROZENT,
} from '../../data/crew.js';
import { WARENLAGER } from '../../data/fundstellen.js';
import { lagerMenge, einlagern } from './lager.js';
import { siedlungImStand } from '../siedlung.js';
import { SIEDLUNG_SATT, SIEDLUNG_ERHOLUNG, SIEDLUNG_WAERME } from '../../data/siedlungen.js';
import { teile } from '../lib/winkel.js';

/** @typedef {import('../types.js').Koloss} Koloss */
/** @typedef {import('../types.js').Zustand} Zustand */
/** @typedef {import('../types.js').Crew} Crew */

/**
 * Ein Tick Crew für einen Koloss (nach dem Kessel, damit die neue Wärme an Bord zählt;
 * vor dem Bergen, damit der Trupp schon die gesunden Arbeiter dieses Ticks hat).
 * @param {Koloss} k
 * @param {Zustand} state
 */
export function crewSchritt(k, state) {
  const c = k.crew;
  // Gerettete (M5b) essen mit und frieren mit, arbeiten aber nicht.
  const leute = c.heizer + c.arbeiter + c.passagiere;
  if (leute > 0 && siedlungImStand(k) >= 0) {
    inDerSiedlung(c);
  } else if (leute > 0) {
    essen(k, c, leute);
    c.gesundheit = klemmen(c.gesundheit + gesundheitAenderung(c, k.waerme));
    sterben(c);
    moral(c, k.waerme);
  }
  state.trupps[k.trupp].leute = gesundeArbeiter(c);
}

/**
 * In der Siedlung (im Stand, M4d): Die Crew sitzt warm in den Hütten und isst dort — die Vorräte an
 * Bord bleiben unberührt. Sie wird satt, erholt sich schnell, niemand stirbt (Nutzerentscheidung).
 * @param {Crew} c
 */
function inDerSiedlung(c) {
  c.essenMg = 0;
  c.sterben = 0;
  c.satt = klemmen(c.satt + SIEDLUNG_SATT);
  c.gesundheit = klemmen(c.gesundheit + SIEDLUNG_ERHOLUNG);
  moral(c, SIEDLUNG_WAERME);
}

// ── Essen ──

/**
 * Vorräte aus dem Warenlager essen; ohne Vorräte sinkt die Sattheit.
 * @param {Koloss} k @param {Crew} c @param {number} leute
 */
function essen(k, c, leute) {
  if (lagerMenge(k, WARENLAGER, 'nahrung') <= 0) {
    c.essenMg = 0;
    c.satt = klemmen(c.satt - SATT_SINKT);
    return;
  }
  c.satt = klemmen(c.satt + SATT_STEIGT);
  c.essenMg += leute * ESSEN_MG_TICK;
  // WARUM Milligramm-Sammler: Je Tick sind es nur Gramm, im Lager zählen ganze kg.
  const kg = Math.floor(c.essenMg / 1000000);
  if (kg > 0) {
    einlagern(k, WARENLAGER, 'nahrung', -Math.min(kg, lagerMenge(k, WARENLAGER, 'nahrung')));
    c.essenMg -= kg * 1000000;
  }
}

// ── Gesundheit und Sterben ──

/**
 * Wie sehr sich die Gesundheit in diesem Tick ändert: Kälte und Hunger kosten, Wärme + Essen heilen.
 * @param {Crew} c @param {number} waerme  an Bord (Zehntel °C)
 * @returns {number}
 */
function gesundheitAenderung(c, waerme) {
  const kaelte = waerme < KALT_AB ? (KALT_AB - waerme) * KAELTE_SCHADEN : 0;
  const hunger = c.satt < HUNGER_AB ? teile(HUNGER_AB - c.satt, HUNGER_TEILER) : 0;
  if (kaelte + hunger > 0) return -(kaelte + hunger);
  return waerme >= ERHOLUNG_WARM_AB && c.satt >= ERHOLUNG_SATT_AB ? ERHOLUNG : 0;
}

/**
 * Unter STERBEN_UNTER stirbt nach und nach jemand — zuerst aus der größeren Gruppe.
 * WARUM Sammler statt Zufall: deterministisch und ohne Würfeln gleich auf allen Rechnern.
 * @param {Crew} c
 */
function sterben(c) {
  if (c.gesundheit >= STERBEN_UNTER) { c.sterben = 0; return; }
  c.sterben += STERBEN_UNTER - c.gesundheit;
  if (c.sterben < STERBEN_SCHWELLE) return;
  c.sterben -= STERBEN_SCHWELLE;
  // Aus der größten Gruppe (Gleichstand: Passagiere, dann Arbeiter, dann Heizer).
  if (c.passagiere > 0 && c.passagiere >= c.arbeiter && c.passagiere >= c.heizer) c.passagiere -= 1;
  else if (c.arbeiter >= c.heizer && c.arbeiter > 0) c.arbeiter -= 1;
  else if (c.heizer > 0) c.heizer -= 1;
  else return;
  c.tote += 1;
  c.moral = klemmen(c.moral - TOD_MORAL);
}

/**
 * Wie viele einer Gruppe krank sind: Anzahl × (1 − Gesundheit), gerundet (bei fast 0 % sind alle krank).
 * @param {number} anzahl @param {Crew} c
 * @returns {number}
 */
export function kranke(anzahl, c) {
  return teile(anzahl * (VOLL - c.gesundheit) + VOLL / 2, VOLL);
}

/**
 * Gesunde Arbeiter = Größe des Bergungstrupps.
 * @param {Crew} c
 * @returns {number}
 */
export function gesundeArbeiter(c) {
  return c.arbeiter - kranke(c.arbeiter, c);
}

// ── Moral (nur Anzeige in M4b) ──

/**
 * Moral strebt träge zu „voll minus Kälte, Hunger, Krankheit“ (mindestens 1 Schritt, siehe
 * CLAUDE.md „Annähern um x %“). Todesfälle drücken sie sofort (sterben()).
 * @param {Crew} c @param {number} waerme
 */
function moral(c, waerme) {
  const kalt = waerme < ERHOLUNG_WARM_AB ? (ERHOLUNG_WARM_AB - waerme) * MORAL_KAELTE : 0;
  const ziel = klemmen(VOLL - kalt - teile((VOLL - c.satt) * MORAL_HUNGER_PROZENT, 100)
    - teile((VOLL - c.gesundheit) * MORAL_KRANK_PROZENT, 100));
  const rest = ziel - c.moral;
  const schritt = teile(rest, MORAL_TRAEGHEIT);
  c.moral += schritt !== 0 ? schritt : Math.sign(rest);
}

/** @param {number} wert @returns {number}  auf 0 … VOLL begrenzt */
function klemmen(wert) {
  return Math.max(0, Math.min(VOLL, wert));
}
