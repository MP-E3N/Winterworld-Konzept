// @ts-check
/**
 * befehle-lager.js — Befehle rund um Bergen und Lager: BERGEN_START, AUFNEHMEN, BERGEN_ABBRECHEN,
 *                    ABWERFEN, UMLAGERN, HOLZZIEL.
 *
 * ZWECK:    Teil von sim/befehle.js (dort ruft befehlPruefen/befehlAnwenden diese Funktionen auf),
 *           ausgelagert, damit jede Datei überschaubar bleibt. Gleiche Regeln: erst misstrauisch
 *           prüfen, dann ändern.
 * LIEST:    Koloss, Trupp, Lager, Fundstellen, state.abwuerfe
 * SCHREIBT: Trupp-Auftrag, Lager (über sim/koloss/lager.js einlagern), k.holzZiel, state.abwuerfe
 * REGEL:    docs/specs/M3-fundstellen.md, docs/specs/M4a-kessel-kaelte.md „Lager“, CLAUDE.md Regel 1
 * DEBUG:    Abgelehnte Befehle stehen mit Grund in der Konsole. Tests: tests/bergen.test.js,
 *           tests/lager.test.js.
 */

import { kolossSteht, inReichweite, fundRest, truppVon, rumpfMitte } from './abfragen.js';
import { lagerMenge, lagerFrei, zielLager, passtIns, einlagern } from './koloss/lager.js';
import { fundstelleMitId } from './welt/fundstellen.js';
import { cosW, sinW, teile, TRIG_EINS } from './lib/winkel.js';
import { FUNDARTEN, LAGER, WAREN, ABWURF_HINTER_M, ABWURF_ZUSAMMEN_M, ABWURF_SEITE_M } from '../data/fundstellen.js';
import { UM_PRO_METER } from '../data/koloss.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Koloss} Koloss */
/** @typedef {import('./types.js').Befehl} Befehl */

const LAGER_ARTEN = ['BERGEN_START', 'AUFNEHMEN', 'BERGEN_ABBRECHEN', 'ABWERFEN', 'UMLAGERN', 'HOLZZIEL'];

/**
 * Gehört der Befehl hierher?
 * @param {Befehl} b
 * @returns {boolean}
 */
export function istLagerBefehl(b) {
  return LAGER_ARTEN.includes(b.art);
}

/**
 * Prüft einen Lager-/Bergen-Befehl.
 * @param {Zustand} state @param {Befehl} b @param {Koloss} k
 * @returns {string | null}
 */
export function lagerBefehlPruefen(state, b, k) {
  if (b.art === 'BERGEN_START') {
    const f = typeof b.fund === 'number' ? fundstelleMitId(state.seed, b.fund) : null;
    if (!f) return 'keine Fundstelle';
    const rest = fundRest(state, f);
    if (rest <= 0) return 'Fundstelle ist leer';
    return bergenErlaubt(k, f.x, f.y, FUNDARTEN[f.art].ware, Math.min(FUNDARTEN[f.art].stueckKg, rest));
  }
  if (b.art === 'AUFNEHMEN') {
    const a = ganzImBereich(b.abwurf, 0, state.abwuerfe.length - 1) ? state.abwuerfe[b.abwurf] : null;
    if (!a) return 'kein Abwurf';
    if (a.kg <= 0) return 'Abwurf ist leer';
    const stueck = (FUNDARTEN.find((f) => f.ware === a.ware) ?? FUNDARTEN[0]).stueckKg;
    return bergenErlaubt(k, a.x, a.y, a.ware, Math.min(stueck, a.kg));
  }
  if (b.art === 'BERGEN_ABBRECHEN') return null;
  if (b.art === 'ABWERFEN') {
    if (!ganzImBereich(b.lager, 0, LAGER.length - 1) || !passtIns(b.lager, b.ware)) return 'Ware gehört nicht in dieses Lager';
    if (!ganzImBereich(b.kg, 1, lagerMenge(k, b.lager, b.ware))) return 'so viel ist nicht da';
    return null;
  }
  if (b.art === 'UMLAGERN') {
    if (!ganzImBereich(b.nach, 0, LAGER.length - 1)) return 'unbekanntes Lager';
    if (!ganzImBereich(b.kg, 1, lagerMenge(k, 1 - b.nach, 'holz'))) return 'so viel Holz ist nicht da';
    if (lagerFrei(k, b.nach) < b.kg) return 'Lager voll';
    return null;
  }
  if (b.art === 'HOLZZIEL') return ganzImBereich(b.lager, 0, LAGER.length - 1) ? null : 'unbekanntes Lager';
  return 'unbekannter Befehl';
}

/**
 * Gemeinsame Prüfung fürs Bergen und Aufnehmen: nur im Stand, in Reichweite, Platz im Lager.
 * @param {Koloss} k @param {number} x @param {number} y @param {string} ware @param {number} stueckKg
 * @returns {string | null}
 */
function bergenErlaubt(k, x, y, ware, stueckKg) {
  if (!kolossSteht(k)) return 'Koloss steht nicht (Telegraf auf Stopp)';
  if (!inReichweite(k, x, y)) return 'außer Reichweite';
  if (lagerFrei(k, zielLager(k, ware)) < stueckKg) return 'Lager voll';
  return null;
}

/**
 * Wendet einen (schon geprüften) Lager-/Bergen-Befehl an.
 * @param {Zustand} state @param {Befehl} b @param {Koloss} k
 */
export function lagerBefehlAnwenden(state, b, k) {
  const t = truppVon(state, k);
  if (b.art === 'BERGEN_START' || b.art === 'AUFNEHMEN' || b.art === 'BERGEN_ABBRECHEN') {
    // Ein laufender Auftrag wird ersetzt; das angefangene Stück ist verloren.
    t.fund = b.art === 'BERGEN_START' ? b.fund : -1;
    t.abwurf = b.art === 'AUFNEHMEN' ? b.abwurf : -1;
    t.fortschritt = 0;
  } else if (b.art === 'ABWERFEN') {
    einlagern(k, b.lager, b.ware, -b.kg);
    abwerfen(state, k, b.ware, b.kg);
  } else if (b.art === 'UMLAGERN') {
    einlagern(k, 1 - b.nach, 'holz', -b.kg);
    einlagern(k, b.nach, 'holz', b.kg);
  } else if (b.art === 'HOLZZIEL') {
    k.holzZiel = b.lager;
  }
}

/**
 * Legt abgeworfene Ware hinter dem Koloss ab. Liegt dort schon ein Haufen derselben Ware, wird er
 * größer (sonst entstünde bei jedem Klick ein neuer).
 * @param {Zustand} state @param {Koloss} k @param {string} ware @param {number} kg
 */
function abwerfen(state, k, ware, kg) {
  const m = rumpfMitte(k), hinten = ABWURF_HINTER_M * UM_PRO_METER;
  // Jede Ware etwas seitlich versetzt (Kohle links … Vorräte rechts), damit verschiedene Haufen
  // nicht aufeinanderliegen und einzeln anklickbar bleiben.
  const seite = (WAREN.findIndex((w) => w.ware === ware) * 2 - 3) * ABWURF_SEITE_M * UM_PRO_METER / 2;
  const c = cosW(k.h), s = sinW(k.h);
  const x = m.x - teile(hinten * c + seite * s, TRIG_EINS), y = m.y - teile(hinten * s - seite * c, TRIG_EINS);
  const nah = ABWURF_ZUSAMMEN_M * 1000; // mm
  for (const a of state.abwuerfe) {
    if (a.ware !== ware) continue;
    const dx = teile(a.x - x, 1000), dy = teile(a.y - y, 1000);
    if (Math.abs(dx) > nah || Math.abs(dy) > nah || dx * dx + dy * dy > nah * nah) continue;
    a.kg += kg;
    a.menge = Math.max(a.menge, a.kg);
    return;
  }
  state.abwuerfe.push({ id: state.abwuerfe.length, ware: /** @type {import('./types.js').Abwurf['ware']} */ (ware), x, y, kg, menge: kg });
}

/**
 * @param {unknown} wert
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function ganzImBereich(wert, min, max) {
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= min && wert <= max;
}
