// @ts-check
/**
 * tick.js — Ein Simulationsschritt (1/20 Sekunde Spielzeit).
 *
 * ZWECK:    Ruft alle Systeme in fester Reihenfolge auf. Neue Systeme (Kessel, Kälte, Bergen …)
 *           werden HIER eingetragen.
 * LIEST:    den ganzen Zustand
 * SCHREIBT: state.tick und alles, was die Systeme schreiben
 * REGEL:    CLAUDE.md Regel 5 (feste Reihenfolge, Gleichstand nach ID)
 * DEBUG:    `ek.step(n)` führt n Ticks aus, auch bei Pause.
 */

import { windSchritt } from './wetter/wind.js';
import { sturmSchritt } from './wetter/sturm.js';
import { fahrSchritt } from './koloss/fahren.js';
import { bergenSchritt } from './bergen.js';
import { kesselSchritt } from './koloss/kessel.js';
import { crewSchritt } from './koloss/crew.js';
import { liegenPruefen } from './koloss/wrack.js';
import { siedlungSchritt } from './siedlung.js';
import { auftragSchritt } from './auftrag.js';

/** @typedef {import('./types.js').Zustand} Zustand */

/**
 * @param {Zustand} state
 */
export function tickAusfuehren(state) {
  // 1. Wetter zuerst: Alles, was danach kommt (später Kälte, Verbrauch), sieht den neuen Wind.
  windSchritt(state);
  // Sturm direkt danach (M5a): Die Kolosse sehen schon die Schneelast dieses Ticks.
  sturmSchritt(state);
  // 2. Kolosse in ID-Reihenfolge. WARUM wichtig: Ab M2 können sie sich berühren; dann muss jeder
  //    Rechner sie in derselben Reihenfolge bewegen.
  for (const k of state.kolosse) {
    // Kessel vor dem Fahren: Der Schub dieses Ticks sieht schon den neuen Dampf (M4a).
    kesselSchritt(k, state);
    // Hält er in einer Siedlung, wird sie seine Heimat (M4d).
    siedlungSchritt(k, state);
    // Crew nach dem Kessel (sieht die neue Wärme an Bord), vor dem Bergen (Trupp = gesunde Arbeiter).
    crewSchritt(k, state);
    fahrSchritt(k, state.seed, state.wetter.sturm);
    // Bleibt er liegen (Crew tot, kein Brennstoff)? Dann Wrack + Neustart (M4c, F6).
    liegenPruefen(k, state);
  }
  // 3. Bergen nach dem Fahren: Wer in diesem Tick losgefahren ist, bricht sofort ab.
  bergenSchritt(state);
  // 4. Rettungsauftrag (M5b): Ist jemand nah genug, steigt der Signalballon auf.
  auftragSchritt(state);
  state.tick += 1;
}
