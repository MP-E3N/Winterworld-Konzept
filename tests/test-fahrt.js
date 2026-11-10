// @ts-check
/**
 * test-fahrt.js — Eine feste Testfahrt als Befehls-Protokoll (keine Tests selbst).
 *
 * ZWECK:    Dient den Determinismus-Tests und tools/replay-aufnehmen.js. Die Fahrt berührt alles,
 *           was M1–M3 kann: im Stand Kohle bergen (M3), mit Ladung anfahren (Abbruch des Bergens),
 *           Druck wechseln, über Packschnee aufs Eis, Kurve mit Rutschen, bremsen, rückwärts mit
 *           Lenkung, ausrollen.
 * REGEL:    CLAUDE.md „Tests“ (Replays nur bei absichtlicher Regeländerung neu aufnehmen)
 */

import { fundId } from '../sim/welt/fundstellen.js';

/** @typedef {import('../sim/types.js').ProtokollEintrag} ProtokollEintrag */

/** So lange wird am Anfang Kohle geborgen (Ticks), danach beginnt die Fahrt aus M1. */
const BERGEN_TICKS = 200;

/**
 * @returns {{seed: number, ticks: number, protokoll: ProtokollEintrag[]}}
 */
export function testProtokoll() {
  /** @type {ProtokollEintrag[]} */
  const protokoll = [];
  // Tick 0 bleibt der Start (Beitritt, Bergen); alle späteren Befehle der M1-Fahrt rücken um
  // BERGEN_TICKS nach hinten, damit die Fahrt selbst so abläuft wie vorher.
  /** @param {number} tick @param {import('../sim/types.js').Befehl} befehl */
  const bei = (tick, befehl) => protokoll.push({ tick: tick === 0 ? 0 : tick + BERGEN_TICKS, befehl });
  const steuern = (/** @type {number} */ gas, /** @type {number} */ lenkung) =>
    ({ art: /** @type {'STEUERN'} */ ('STEUERN'), spieler: 0, gas, lenkung });

  bei(0, { art: 'BEITRETEN', spieler: 0, name: 'Testfahrt' });
  bei(0, { art: 'DRUCK', spieler: 0, stufe: 4 });
  // M3: Die Kohlehalde des Testgeländes (Zelle 0/−1) liegt vom Start aus in Reichweite.
  bei(0, { art: 'BERGEN_START', spieler: 0, fund: fundId(0, -1) });
  bei(1, steuern(100, 0));      // geradeaus nach Norden, Richtung See
  bei(300, steuern(100, 30));   // leicht rechts
  bei(400, steuern(100, 0));
  bei(800, steuern(100, 100));  // scharf rechts — inzwischen auf dem Eis: rutschen
  bei(880, steuern(100, 0));
  bei(900, { art: 'TELEGRAF', spieler: 0, stufe: 7 }); // Telegraf „Voll voraus“, Handgas los
  bei(901, steuern(0, 0));
  bei(1000, { art: 'DRUCK', spieler: 0, stufe: 1 });
  bei(1100, { art: 'TELEGRAF', spieler: 0, stufe: 1 }); // „Halb zurück“: bremsen, dann rückwärts
  bei(1400, steuern(0, -100));  // rückwärts mit Lenkung
  bei(1550, { art: 'TELEGRAF', spieler: 0, stufe: 3 }); // „Stopp“
  bei(1551, steuern(0, 0));
  // Seed 0 = Testgelände: Der See liegt garantiert geradeaus im Norden.
  return { seed: 0, ticks: 1800 + BERGEN_TICKS, protokoll };
}
