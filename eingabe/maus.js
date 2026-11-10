// @ts-check
/**
 * maus.js — Linke Maustaste: Fundstellen anklicken (M3).
 *
 * ZWECK:    Merkt sich, wo der Mauszeiger steht (render/fundstellen.js findet damit die Fundstelle
 *           darunter), und übersetzt einen Linksklick in BERGEN_START — oder BERGEN_ABBRECHEN, wenn
 *           der Trupp genau dort schon arbeitet. Geht Bergen gerade nicht, wird nichts gesendet,
 *           der Ring leuchtet kurz rot (keine Warntexte).
 *           Rechte/mittlere Taste (Karte verschieben) und Mausrad gehören render/kamera.js.
 * LIEST:    Mausereignisse am Canvas, fundAnsicht.hover, Zustand über die Verbindung
 * SCHREIBT: Befehle über verbindung.senden(), fundAnsicht.maus / .abgelehnt, Mauszeiger-Form
 * REGEL:    KONZEPT.md §7 Steuerung, §8 Regel 4 (alles über Befehle)
 * DEBUG:    Abgelehnte Befehle stehen mit Grund in der Konsole; den Grund vorab zeigt
 *           `befehlPruefen(ek.state, {art: 'BERGEN_START', spieler: 0, fund: <id>})`.
 *
 * NUR EINMAL einrichten (wie Tastatur und Kamera).
 */

import { fundAnsicht } from '../render/fundstellen.js';
import { befehlPruefen } from '../sim/befehle.js';
import { kolossVon, truppVon } from '../sim/abfragen.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => Spiel} spielHolen
 */
export function mausEinrichten(canvas, spielHolen) {
  canvas.addEventListener('pointermove', (ev) => {
    fundAnsicht.maus = { bx: ev.offsetX, by: ev.offsetY };
    // Eine Bildfolge hinterher — reicht, der Zeiger bewegt sich ja gerade.
    canvas.style.cursor = fundAnsicht.hover ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { fundAnsicht.maus = null; });
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    fundAnsicht.maus = { bx: ev.offsetX, by: ev.offsetY };
    klicken(spielHolen());
  });
}

/**
 * Linksklick auf die Fundstelle unter dem Mauszeiger.
 * @param {Spiel} spiel
 */
function klicken(spiel) {
  const f = fundAnsicht.hover;
  if (!f) return;
  const v = spiel.verbindung;
  const s = v.zustand();
  const k = kolossVon(s, v.spieler);
  if (!k) return;
  if (truppVon(s, k).fund === f.id) {
    v.senden({ art: 'BERGEN_ABBRECHEN', spieler: v.spieler });
    return;
  }
  /** @type {import('../sim/types.js').BefehlBergenStart} */
  const b = { art: 'BERGEN_START', spieler: v.spieler, fund: f.id };
  // WARUM vorab prüfen: Die Oberfläche zeigt sofort, dass es nicht geht. Der Server (M6) prüft
  // trotzdem selbst — befehlPruefen ist dieselbe Funktion.
  if (befehlPruefen(s, b) === null) v.senden(b);
  else fundAnsicht.abgelehnt = performance.now();
}
