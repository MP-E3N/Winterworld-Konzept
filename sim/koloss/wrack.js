// @ts-check
/**
 * wrack.js — Liegenbleiben: Der Koloss wird zum Wrack, die Ladung bleibt liegen, Neustart (M4c, F6).
 *
 * ZWECK:    Nutzerentscheidung: Der Koloss bleibt NUR liegen, wenn die Crew tot ist oder wenn kein
 *           Brennstoff mehr an Bord ist und der Kessel kalt bleibt (nach einer Gnadenfrist). Dann
 *           bleibt ein Wrack in der Welt, seine Ladung liegt als Haufen drumherum (wie Abgeworfenes —
 *           jeder kann sie bergen), und der Spieler startet mit einem einfachen Koloss neu — in der
 *           zuletzt besuchten Siedlung (k.heimat, M4d).
 * LIEST:    Koloss (Crew, Lager, Dampf), data/wrack.js
 * SCHREIBT: state.wracks, state.abwuerfe, k.kalt; beim Neustart den ganzen Koloss und seinen Trupp
 * REGEL:    docs/specs/M4c-liegenbleiben.md, KONZEPT.md F6
 * DEBUG:    F3 zeigt „kalt“ (Ticks bis zur Gnadenfrist). Tests: tests/wrack.test.js.
 */

import { GNADENFRIST_TICKS, WRACK_HAUFEN_ABSTAND_M } from '../../data/wrack.js';
import { UM_PRO_METER } from '../../data/koloss.js';
import { WAREN } from '../../data/fundstellen.js';
import { rumpfMitte } from '../abfragen.js';
import { kolossStartwerte } from './start.js';
import { gesundeArbeiter } from './crew.js';
import { verlorenBeimWrack } from '../auftrag.js';
import { cosW, sinW, teile, winkelNorm, TRIG_EINS } from '../lib/winkel.js';

/** @typedef {import('../types.js').Koloss} Koloss */
/** @typedef {import('../types.js').Zustand} Zustand */

/**
 * Prüft nach dem Tick, ob der Koloss liegen bleibt.
 * @param {Koloss} k
 * @param {Zustand} state
 */
export function liegenPruefen(k, state) {
  if (k.crew.heizer + k.crew.arbeiter === 0) { wrackMachen(state, k); return; }
  // Kein Brennstoff mehr irgendwo an Bord (auch kein Holz im Warenlager zum Umlagern) und kein Druck.
  const b = k.lager.brennstoff;
  const nichtsMehr = b.kohle + b.holz + b.oel + k.lager.waren.holz === 0 && k.dampf === 0;
  k.kalt = nichtsMehr ? k.kalt + 1 : 0;
  if (k.kalt >= GNADENFRIST_TICKS) wrackMachen(state, k);
}

/**
 * Wrack zurücklassen, Ladung als Haufen drumherum, Koloss neu starten.
 * @param {Zustand} state
 * @param {Koloss} k
 */
export function wrackMachen(state, k) {
  const m = rumpfMitte(k);
  state.wracks.push({ id: state.wracks.length, koloss: k.id, name: k.name, x: m.x, y: m.y, h: k.h, tick: state.tick });
  ladungAblegen(state, k, m);
  verlorenBeimWrack(state, k); // Gerettete an Bord sind verloren (M5b)
  // Neustart: frischer Koloss in der Heimat (zuletzt besuchte Siedlung, M4d), gleiche ID, gleicher
  // Trupp (der wartet wieder an Bord). Das Depot dort bleibt.
  const neu = kolossStartwerte(k.id, k.besitzer, k.name, k.trupp, k.heimat);
  Object.assign(k, neu);
  const t = state.trupps[k.trupp];
  t.fund = -1; t.abwurf = -1; t.fortschritt = 0; t.leute = gesundeArbeiter(k.crew);
}

/**
 * Jede Ware des Wracks wird ein Haufen im Kreis ums Wrack (Holz aus beiden Lagern zusammen).
 * @param {Zustand} state @param {Koloss} k @param {{x: number, y: number}} m  Rumpfmitte
 */
function ladungAblegen(state, k, m) {
  const r = WRACK_HAUFEN_ABSTAND_M * UM_PRO_METER;
  WAREN.forEach((w, i) => {
    const kg = (w.ware in k.lager.brennstoff ? k.lager.brennstoff[/** @type {'kohle'|'holz'|'oel'} */ (w.ware)] : 0)
      + (w.ware in k.lager.waren ? k.lager.waren[/** @type {'holz'|'nahrung'} */ (w.ware)] : 0);
    if (kg <= 0) return;
    // Vier Waren gleichmäßig im Kreis (Viertelkreis-Schritte), quer zur Fahrtrichtung beginnend.
    const winkel = winkelNorm(k.h + 16384 + i * 16384);
    const x = m.x + teile(r * cosW(winkel), TRIG_EINS), y = m.y + teile(r * sinW(winkel), TRIG_EINS);
    state.abwuerfe.push({ id: state.abwuerfe.length, ware: w.ware, x, y, kg, menge: kg });
  });
}
