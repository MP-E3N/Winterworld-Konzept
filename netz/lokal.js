// @ts-check
/**
 * lokal.js — Verbindung fürs Einzelspiel: Die Simulation läuft im selben Browser.
 *
 * ZWECK:    Erfüllt die Schnittstelle aus netz/verbindung.js. Hält den einzigen echten
 *           Zustand, reiht Befehle ein und zeichnet sie für Replays auf.
 * LIEST:    —
 * SCHREIBT: den Zustand NUR über befehlAnwenden() und tickAusfuehren()
 * REGEL:    KONZEPT.md §8 Regel 5
 * DEBUG:    `ek.verbindung.protokoll()` zeigt alle ausgeführten Befehle mit Tick.
 */

import { neuerZustand } from '../sim/zustand.js';
import { befehlAnwenden } from '../sim/befehle.js';
import { tickAusfuehren } from '../sim/tick.js';
import { TEMPI } from '../data/takt.js';

/** @typedef {import('./verbindung.js').Verbindung} Verbindung */
/** @typedef {import('../sim/types.js').Befehl} Befehl */
/** @typedef {import('../sim/types.js').ProtokollEintrag} ProtokollEintrag */

/**
 * Erstellt eine neue Welt und tritt ihr als Spieler bei.
 * @param {number} seed
 * @param {string} name  Name des eigenen Kolosses
 * @returns {Verbindung}
 */
export function lokaleVerbindungErstellen(seed, name) {
  const state = neuerZustand(seed);
  // Im Einzelspiel ist man immer der erste Spieler. Die Nummer kommt trotzdem aus der
  // Verbindung, damit die Oberfläche das später nicht annehmen muss.
  const v = verbindungUm(state, state.spieler.length);
  v.senden({ art: 'BEITRETEN', spieler: v.spieler, name });
  return v;
}

/**
 * Weiterspielen mit einem geladenen Spielstand (M4d, game/speichern.js). Der Spieler ist schon
 * beigetreten; das Protokoll beginnt leer (Replays starten dann bei diesem Stand).
 * @param {{zustand: import('../sim/types.js').Zustand, spieler: number}} stand
 * @returns {Verbindung}
 */
export function lokaleVerbindungLaden(stand) {
  return verbindungUm(stand.zustand, stand.spieler);
}

/**
 * Die Verbindung um einen vorhandenen Zustand.
 * @param {import('../sim/types.js').Zustand} state
 * @param {number} spieler
 * @returns {Verbindung}
 */
function verbindungUm(state, spieler) {
  /** @type {Befehl[]} */
  let warteschlange = [];
  /** @type {ProtokollEintrag[]} */
  const protokoll = [];
  let pause = false;
  let tempo = 1;

  /** @type {Verbindung} */
  const v = {
    spieler,
    zustand: () => state,
    senden(b) { warteschlange.push(b); },
    schritt() {
      for (const b of warteschlange) {
        const erg = befehlAnwenden(state, b);
        if (erg.ok) protokoll.push({ tick: state.tick, befehl: b });
        else console.warn(`[Befehl abgelehnt] ${b.art}: ${erg.grund}`, b);
      }
      warteschlange = [];
      tickAusfuehren(state);
    },
    pausiert: () => pause,
    pauseSetzen(an) { pause = an; },
    tempo: () => tempo,
    tempoSetzen(faktor) { if (TEMPI.includes(faktor)) tempo = faktor; },
    protokoll: () => protokoll,
  };
  return v;
}
