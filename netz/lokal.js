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
  /** @type {Befehl[]} */
  let warteschlange = [];
  /** @type {ProtokollEintrag[]} */
  const protokoll = [];
  let pause = false;
  let tempo = 1;
  // Im Einzelspiel ist man immer der erste Spieler. Die Nummer kommt trotzdem aus der
  // Verbindung, damit die Oberfläche das später nicht annehmen muss.
  const spieler = state.spieler.length;

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
  v.senden({ art: 'BEITRETEN', spieler, name });
  return v;
}
