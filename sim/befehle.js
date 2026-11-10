// @ts-check
/**
 * befehle.js — Prüft und wendet Befehle an. Der EINZIGE Weg, den Zustand von außen zu ändern.
 *
 * ZWECK:    Tastatur, Maus, KI und (ab M6) das Netz erzeugen nur Befehle. Hier wird geprüft,
 *           ob ein Befehl erlaubt ist, und dann der Zustand geändert. So kann der Server später
 *           jeden Befehl genauso prüfen wie das Einzelspiel.
 * LIEST:    state.spieler, state.kolosse, data/koloss.js
 * SCHREIBT: state.spieler, state.kolosse (Steuerwerte, Druck, Telegraf, Licht), state.trupps (Auftrag)
 * REGEL:    KONZEPT.md §8 Regel 4, CLAUDE.md Regel 1
 * DEBUG:    Abgelehnte Befehle landen mit Grund in der Konsole (game/spiel.js).
 *           Neuen Befehl? Typ in sim/types.js, Prüfung + Wirkung hier, Test in tests/befehle.test.js.
 */

import {
  DRUCKSTUFEN, START_DRUCK, START_X, START_Y, START_RICHTUNG, EINGABE_MAX, KOLOSS_BREITE_M, UM_PRO_METER,
  TELEGRAF, TELEGRAF_STOPP,
} from '../data/koloss.js';
import { kolossVon, kolossSteht, inReichweite, fundRest, ladungFrei, truppVon } from './abfragen.js';
import { fundstelleMitId } from './welt/fundstellen.js';
import { FUNDARTEN, TRUPP_LEUTE } from '../data/fundstellen.js';

/** @typedef {import('./types.js').Zustand} Zustand */
/** @typedef {import('./types.js').Befehl} Befehl */
/** @typedef {import('./types.js').BefehlsErgebnis} BefehlsErgebnis */

/** Höchstlänge eines Spielernamens. */
const NAME_MAX = 24;

/**
 * Prüft einen Befehl, ohne etwas zu ändern. Die Oberfläche kann damit Knöpfe sperren.
 * WARUM so misstrauisch: Ab M6 kommen Befehle über das Netz — jeder Wert kann Unsinn sein.
 * @param {Zustand} state
 * @param {Befehl} b
 * @returns {string | null}  null = erlaubt, sonst Grund
 */
export function befehlPruefen(state, b) {
  if (!Number.isInteger(b.spieler) || b.spieler < 0) return 'ungültige Spielernummer';
  if (b.art === 'BEITRETEN') {
    if (state.spieler[b.spieler]) return 'Spieler ist schon beigetreten';
    if (b.spieler !== state.spieler.length) return 'Spielernummern müssen lückenlos vergeben werden';
    if (typeof b.name !== 'string' || b.name.length === 0 || b.name.length > NAME_MAX) return 'ungültiger Name';
    return null;
  }
  if (!kolossVon(state, b.spieler)) return 'Spieler hat keinen Koloss';
  if (b.art === 'STEUERN') {
    if (!ganzImBereich(b.gas, -EINGABE_MAX, EINGABE_MAX)) return 'Gas außerhalb ±100';
    if (!ganzImBereich(b.lenkung, -EINGABE_MAX, EINGABE_MAX)) return 'Lenkung außerhalb ±100';
    return null;
  }
  if (b.art === 'DRUCK') {
    if (!ganzImBereich(b.stufe, 0, DRUCKSTUFEN.length - 1)) return 'unbekannte Druckstufe';
    return null;
  }
  if (b.art === 'TELEGRAF') {
    if (!ganzImBereich(b.stufe, 0, TELEGRAF.length - 1)) return 'unbekannte Telegrafen-Stellung';
    return null;
  }
  if (b.art === 'LICHT') {
    if (typeof b.an !== 'boolean') return 'an muss ja/nein sein';
    return null;
  }
  if (b.art === 'BERGEN_START') return bergenPruefen(state, b);
  if (b.art === 'BERGEN_ABBRECHEN') return null;
  return 'unbekannter Befehl';
}

/**
 * Prüft und wendet einen Befehl an.
 * @param {Zustand} state
 * @param {Befehl} b
 * @returns {BefehlsErgebnis}
 */
export function befehlAnwenden(state, b) {
  const grund = befehlPruefen(state, b);
  if (grund) return { ok: false, grund };

  if (b.art === 'BEITRETEN') {
    const id = state.kolosse.length;
    const trupp = state.trupps.length;
    // Weitere Spieler starten nebeneinander (Abstand 3 Breiten), damit sie sich nicht überlappen.
    const versatz = b.spieler * KOLOSS_BREITE_M * 3 * UM_PRO_METER;
    state.kolosse.push({
      id, besitzer: b.spieler, name: b.name,
      x: START_X + versatz, y: START_Y, vx: 0, vy: 0, h: START_RICHTUNG, dreh: 0,
      druck: START_DRUCK, gas: 0, lenkung: 0, telegraf: TELEGRAF_STOPP, antrieb: 0, licht: 0,
      ladung: { kohle: 0, holz: 0, oel: 0, nahrung: 0 }, trupp,
    });
    // Jeder Koloss hat genau einen Trupp (M3). fund −1 = wartet an Bord.
    state.trupps.push({ id: trupp, koloss: id, fund: -1, leute: TRUPP_LEUTE, fortschritt: 0 });
    state.spieler.push({ id: b.spieler, name: b.name, koloss: id });
    return { ok: true };
  }

  const k = /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler));
  if (b.art === 'STEUERN') {
    k.gas = b.gas;
    k.lenkung = b.lenkung;
  } else if (b.art === 'DRUCK') {
    k.druck = b.stufe;
  } else if (b.art === 'TELEGRAF') {
    k.telegraf = b.stufe;
  } else if (b.art === 'LICHT') {
    k.licht = b.an ? 1 : 0; // Ganzzahl im Zustand (CLAUDE.md Regel 3)
  } else if (b.art === 'BERGEN_START') {
    // Ein laufender Auftrag wird ersetzt; das angefangene Stück ist verloren.
    const t = truppVon(state, k);
    t.fund = b.fund;
    t.fortschritt = 0;
  } else if (b.art === 'BERGEN_ABBRECHEN') {
    const t = truppVon(state, k);
    t.fund = -1;
    t.fortschritt = 0;
  }
  return { ok: true };
}

/**
 * Darf der Trupp an dieser Fundstelle bergen? (Spec M3: nur im Stand, in Reichweite, nicht leer,
 * Platz im Laderaum.)
 * @param {Zustand} state
 * @param {import('./types.js').BefehlBergenStart} b
 * @returns {string | null}
 */
function bergenPruefen(state, b) {
  const k = /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler));
  const f = typeof b.fund === 'number' ? fundstelleMitId(state.seed, b.fund) : null;
  if (!f) return 'keine Fundstelle';
  if (fundRest(state, f) <= 0) return 'Fundstelle ist leer';
  if (!kolossSteht(k)) return 'Koloss steht nicht (Telegraf auf Stopp)';
  if (!inReichweite(k, f.x, f.y)) return 'Fundstelle außer Reichweite';
  if (ladungFrei(k) < FUNDARTEN[f.art].stueckKg) return 'Laderaum voll';
  return null;
}

/**
 * @param {unknown} wert
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function ganzImBereich(wert, min, max) {
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= min && wert <= max;
}
