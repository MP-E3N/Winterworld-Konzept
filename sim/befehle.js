// @ts-check
/**
 * befehle.js — Prüft und wendet Befehle an. Der EINZIGE Weg, den Zustand von außen zu ändern.
 *
 * ZWECK:    Tastatur, Maus, KI und (ab M6) das Netz erzeugen nur Befehle. Hier wird geprüft,
 *           ob ein Befehl erlaubt ist, und dann der Zustand geändert. So kann der Server später
 *           jeden Befehl genauso prüfen wie das Einzelspiel.
 * LIEST:    state.spieler, state.kolosse, data/koloss.js
 * SCHREIBT: state.spieler, state.kolosse (Steuerwerte, Feuerstufe, Brennstoff, Heizung, Telegraf, Licht);
 *           Bergen und Lager über sim/befehle-lager.js, Depot und Crew in der Siedlung über
 *           sim/befehle-siedlung.js
 * REGEL:    KONZEPT.md §8 Regel 4, CLAUDE.md Regel 1
 * DEBUG:    Abgelehnte Befehle landen mit Grund in der Konsole (game/spiel.js).
 *           Neuen Befehl? Typ in sim/types.js, Prüfung + Wirkung hier, Test in tests/befehle.test.js.
 */

import { DRUCKSTUFEN, EINGABE_MAX, TELEGRAF, BRENNSTOFFE } from '../data/koloss.js';
import { kolossVon } from './abfragen.js';
import { istLagerBefehl, lagerBefehlPruefen, lagerBefehlAnwenden, ganzImBereich } from './befehle-lager.js';
import { istSiedlungsBefehl, siedlungsBefehlPruefen, siedlungsBefehlAnwenden } from './befehle-siedlung.js';
import { START_ARBEITER } from '../data/crew.js';
import { kolossStartwerte } from './koloss/start.js';
import { sturmTesten } from './wetter/sturm.js';
import { rettenPruefen, rettenAnwenden } from './auftrag.js';
import { laterneSetzen } from './laternen.js';

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
  if (b.art === 'LATERNE') return null;
  if (b.art === 'HEIZUNG' || b.art === 'STURM_TEST' || b.art === 'SUCHER') {
    if (typeof b.an !== 'boolean') return 'an muss ja/nein sein';
    return null;
  }
  if (istLagerBefehl(b)) return lagerBefehlPruefen(state, b, /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler)));
  if (istSiedlungsBefehl(b)) return siedlungsBefehlPruefen(state, b, /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler)));
  if (b.art === 'BRENNSTOFF') {
    if (!ganzImBereich(b.wahl, 0, BRENNSTOFFE.length - 1)) return 'unbekannter Brennstoff';
    return null;
  }
  if (b.art === 'RETTEN') return rettenPruefen(state, /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler)));
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
    state.kolosse.push(kolossStartwerte(id, b.spieler, b.name, trupp));
    // Jeder Koloss hat genau einen Trupp (M3). fund/abwurf −1 = wartet an Bord.
    state.trupps.push({ id: trupp, koloss: id, fund: -1, abwurf: -1, leute: START_ARBEITER, fortschritt: 0 });
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
  } else if (b.art === 'HEIZUNG') {
    k.heizung = b.an ? 1 : 0;
  } else if (b.art === 'SUCHER') {
    k.sucher = b.an ? 1 : 0;
  } else if (b.art === 'LATERNE') {
    laterneSetzen(state, k, b.spieler);
  } else if (b.art === 'RETTEN') {
    rettenAnwenden(state, k);
  } else if (b.art === 'STURM_TEST') {
    sturmTesten(state, b.an); // Test-Knopf (Spieltest M5a); später für den Server sperren
  } else if (b.art === 'BRENNSTOFF') {
    k.brennstoff = b.wahl;
  } else if (istLagerBefehl(b)) {
    lagerBefehlAnwenden(state, b, k);
  } else if (istSiedlungsBefehl(b)) {
    siedlungsBefehlAnwenden(state, b, k);
  }
  return { ok: true };
}
