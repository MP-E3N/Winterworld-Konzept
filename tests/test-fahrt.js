// @ts-check
/**
 * test-fahrt.js — Eine feste Testfahrt als Befehls-Protokoll (keine Tests selbst).
 *
 * ZWECK:    Dient den Determinismus-Tests und tools/replay-aufnehmen.js. Die Fahrt berührt alles,
 *           was M1 kann: anfahren, Druck wechseln, über Packschnee aufs Eis, Kurve mit Rutschen,
 *           bremsen, rückwärts mit Lenkung, ausrollen.
 * REGEL:    CLAUDE.md „Tests“ (Replays nur bei absichtlicher Regeländerung neu aufnehmen)
 */

/** @typedef {import('../sim/types.js').ProtokollEintrag} ProtokollEintrag */

/**
 * @returns {{seed: number, ticks: number, protokoll: ProtokollEintrag[]}}
 */
export function testProtokoll() {
  /** @type {ProtokollEintrag[]} */
  const protokoll = [];
  /** @param {number} tick @param {import('../sim/types.js').Befehl} befehl */
  const bei = (tick, befehl) => protokoll.push({ tick, befehl });
  const steuern = (/** @type {number} */ gas, /** @type {number} */ lenkung) =>
    ({ art: /** @type {'STEUERN'} */ ('STEUERN'), spieler: 0, gas, lenkung });

  bei(0, { art: 'BEITRETEN', spieler: 0, name: 'Testfahrt' });
  bei(0, { art: 'DRUCK', spieler: 0, stufe: 4 });
  bei(1, steuern(100, 0));      // geradeaus nach Norden, Richtung See
  bei(300, steuern(100, 30));   // leicht rechts
  bei(400, steuern(100, 0));
  bei(800, steuern(100, 100));  // scharf rechts — inzwischen auf dem Eis: rutschen
  bei(880, steuern(100, 0));
  bei(900, { art: 'TEMPOMAT', spieler: 0, an: true }); // Tempo halten, Gas loslassen
  bei(901, steuern(0, 0));
  bei(1000, { art: 'DRUCK', spieler: 0, stufe: 1 });
  bei(1100, steuern(-100, 0));  // bremsen, dann rückwärts
  bei(1400, steuern(-100, -100)); // rückwärts mit Lenkung
  bei(1550, steuern(0, 0));     // ausrollen
  // Seed 0 = Testgelände: Der See liegt garantiert geradeaus im Norden.
  return { seed: 0, ticks: 1800, protokoll };
}
