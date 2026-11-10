// @ts-check
/**
 * befehle.js — Prüft und wendet Befehle an. Der EINZIGE Weg, den Zustand von außen zu ändern.
 *
 * ZWECK:    Tastatur, Maus, KI und (ab M6) das Netz erzeugen nur Befehle. Hier wird geprüft,
 *           ob ein Befehl erlaubt ist, und dann der Zustand geändert. So kann der Server später
 *           jeden Befehl genauso prüfen wie das Einzelspiel.
 * LIEST:    state.spieler, state.kolosse, data/koloss.js
 * SCHREIBT: state.spieler, state.kolosse (Steuerwerte, Druck)
 * REGEL:    KONZEPT.md §8 Regel 4, CLAUDE.md Regel 1
 * DEBUG:    Abgelehnte Befehle landen mit Grund in der Konsole (game/spiel.js).
 *           Neuen Befehl? Typ in sim/types.js, Prüfung + Wirkung hier, Test in tests/befehle.test.js.
 */

import {
  DRUCKSTUFEN, START_DRUCK, START_X, START_Y, START_RICHTUNG, EINGABE_MAX, KOLOSS_BREITE_M, UM_PRO_METER,
  TEMPOMAT_MIN_KMH, TEMPOMAT_MAX_KMH, TEMPO_EIN_KMH,
} from '../data/koloss.js';
import { kolossVon, laengsTempo } from './abfragen.js';

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
  if (b.art === 'TEMPOMAT') {
    if (typeof b.an !== 'boolean') return 'an muss ja/nein sein';
    const k = /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler));
    if (b.kmh !== undefined) {
      // Schieberegler: festes Zieltempo, geht auch aus dem Stand (der Koloss fährt dann an).
      if (!b.an) return 'Zieltempo nur beim Einschalten';
      if (!ganzImBereich(b.kmh, TEMPOMAT_MIN_KMH, TEMPOMAT_MAX_KMH)) return `Zieltempo ${TEMPOMAT_MIN_KMH}–${TEMPOMAT_MAX_KMH} km/h`;
      return null;
    }
    if (b.an && laengsTempo(k) < TEMPOMAT_MIN_KMH * TEMPO_EIN_KMH) return `erst ab ${TEMPOMAT_MIN_KMH} km/h vorwärts`;
    return null;
  }
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
    // Weitere Spieler starten nebeneinander (Abstand 3 Breiten), damit sie sich nicht überlappen.
    const versatz = b.spieler * KOLOSS_BREITE_M * 3 * UM_PRO_METER;
    state.kolosse.push({
      id, besitzer: b.spieler, name: b.name,
      x: START_X + versatz, y: START_Y, vx: 0, vy: 0, h: START_RICHTUNG, dreh: 0,
      druck: START_DRUCK, gas: 0, lenkung: 0, tempomat: 0, antrieb: 0,
    });
    state.spieler.push({ id: b.spieler, name: b.name, koloss: id });
    return { ok: true };
  }

  const k = /** @type {import('./types.js').Koloss} */ (kolossVon(state, b.spieler));
  if (b.art === 'STEUERN') {
    // Tempo halten: Bremsen (S) schaltet es aus. Gibt man selbst Gas (W) und lässt wieder los,
    // wird das dann erreichte Tempo das neue Ziel — wie beim Tempomat im Auto.
    if (k.tempomat > 0 && b.gas < 0) k.tempomat = 0;
    else if (k.tempomat > 0 && k.gas > 0 && b.gas === 0) {
      k.tempomat = Math.max(laengsTempo(k), TEMPOMAT_MIN_KMH * TEMPO_EIN_KMH);
    }
    k.gas = b.gas;
    k.lenkung = b.lenkung;
  } else if (b.art === 'DRUCK') {
    k.druck = b.stufe;
  } else if (b.art === 'TEMPOMAT') {
    if (b.kmh !== undefined) k.tempomat = b.kmh * TEMPO_EIN_KMH;
    else k.tempomat = b.an ? laengsTempo(k) : 0;
  }
  return { ok: true };
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
