// @ts-check
/**
 * maus.js — Linke Maustaste: Fundstellen und Abgeworfenes anklicken, Klick auf den eigenen Koloss.
 *
 * ZWECK:    Merkt sich, wo der Mauszeiger steht (render/fundstellen.js findet damit, was darunter
 *           liegt), und übersetzt einen Linksklick:
 *             auf eine Fundstelle   → BERGEN_START (oder BERGEN_ABBRECHEN, wenn der Trupp schon dort ist)
 *             auf einen Abwurf      → AUFNEHMEN (oder BERGEN_ABBRECHEN)
 *             auf den eigenen Koloss → Lager-Popup auf/zu (Spieltest M4a, wie Taste I)
 *             auf den Depot-Schuppen → Depot-Fenster auf/zu (abladen, beladen, Crew; M4d)
 *           Geht Bergen gerade nicht, wird nichts gesendet, der Ring leuchtet kurz rot (keine Warntexte).
 *           Rechte/mittlere Taste (Karte verschieben) und Mausrad gehören render/kamera.js.
 * LIEST:    Mausereignisse am Canvas, fundAnsicht.hover, Zustand über die Verbindung, Kamera
 * SCHREIBT: Befehle über verbindung.senden(), fundAnsicht.maus / .abgelehnt, Mauszeiger-Form
 * REGEL:    KONZEPT.md §7 Steuerung, §8 Regel 4 (alles über Befehle)
 * DEBUG:    Abgelehnte Befehle stehen mit Grund in der Konsole; den Grund vorab zeigt
 *           `befehlPruefen(ek.state, {art: 'BERGEN_START', spieler: 0, fund: <id>})`.
 *
 * NUR EINMAL einrichten (wie Tastatur und Kamera).
 */

import { fundAnsicht } from '../render/fundstellen.js';
import { bildZuWelt } from '../render/kamera.js';
import { rumpfLage } from '../render/koloss-mass.js';
import { lageZumZeichnen } from '../game/spiel.js';
import { befehlPruefen } from '../sim/befehle.js';
import { kolossVon, truppVon } from '../sim/abfragen.js';
import { KOLOSS_LAENGE_M, KOLOSS_BREITE_M } from '../data/koloss.js';
import { lagerUmschalten } from '../ui/lager.js';
import { depotUmschalten } from '../ui/depot.js';
import { siedlungAnsicht, depotUnter } from '../render/siedlungen.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => Spiel} spielHolen
 */
export function mausEinrichten(canvas, spielHolen) {
  canvas.addEventListener('pointermove', (ev) => {
    fundAnsicht.maus = { bx: ev.offsetX, by: ev.offsetY };
    // Eine Bildfolge hinterher — reicht, der Zeiger bewegt sich ja gerade.
    siedlungAnsicht.hover = fundAnsicht.hover ? -1 : depotUnter(ev.offsetX, ev.offsetY);
    canvas.style.cursor = fundAnsicht.hover || aufKoloss(spielHolen(), ev.offsetX, ev.offsetY) || siedlungAnsicht.hover >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { fundAnsicht.maus = null; siedlungAnsicht.hover = -1; });
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    fundAnsicht.maus = { bx: ev.offsetX, by: ev.offsetY };
    klicken(spielHolen(), ev.offsetX, ev.offsetY);
  });
}

/**
 * Linksklick: Marke unter dem Zeiger geht vor, sonst der eigene Koloss.
 * @param {Spiel} spiel @param {number} bx @param {number} by
 */
function klicken(spiel, bx, by) {
  const m = fundAnsicht.hover;
  const v = spiel.verbindung;
  const s = v.zustand();
  const k = kolossVon(s, v.spieler);
  if (!k) return;
  if (!m) {
    const depot = depotUnter(bx, by);
    if (depot >= 0) depotUmschalten(depot);
    else if (aufKoloss(spiel, bx, by)) lagerUmschalten();
    return;
  }
  const t = truppVon(s, k);
  if ((m.fund >= 0 && t.fund === m.fund) || (m.abwurf >= 0 && t.abwurf === m.abwurf)) {
    v.senden({ art: 'BERGEN_ABBRECHEN', spieler: v.spieler });
    return;
  }
  /** @type {import('../sim/types.js').Befehl} */
  const b = m.abwurf >= 0
    ? { art: 'AUFNEHMEN', spieler: v.spieler, abwurf: m.abwurf }
    : { art: 'BERGEN_START', spieler: v.spieler, fund: m.fund };
  // WARUM vorab prüfen: Die Oberfläche zeigt sofort, dass es nicht geht. Der Server (M6) prüft
  // trotzdem selbst — befehlPruefen ist dieselbe Funktion.
  if (befehlPruefen(s, b) === null) v.senden(b);
  else fundAnsicht.abgelehnt = performance.now();
}

/**
 * Liegt der Bildpunkt auf dem eigenen Koloss? (Rumpf als gedrehtes Rechteck, etwas großzügiger.)
 * @param {Spiel} spiel @param {number} bx @param {number} by
 * @returns {boolean}
 */
function aufKoloss(spiel, bx, by) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return false;
  const r = rumpfLage(lageZumZeichnen(spiel, k));
  const [wx, wy] = bildZuWelt(bx, by);
  const dx = wx - r.x, dy = wy - r.y;
  const laengs = dx * Math.cos(r.h) + dy * Math.sin(r.h), quer = -dx * Math.sin(r.h) + dy * Math.cos(r.h);
  return Math.abs(laengs) <= KOLOSS_LAENGE_M / 2 + 2 && Math.abs(quer) <= KOLOSS_BREITE_M / 2 + 2;
}
