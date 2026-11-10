// @ts-check
/**
 * spiel.js — Spielschleife: verbindet echte Zeit mit dem festen Takt der Simulation.
 *
 * ZWECK:    Misst die echte Zeit seit dem letzten Bild und lässt so viele Ticks laufen, wie fällig
 *           sind („Akkumulator“). Merkt sich die Lage der Kolosse VOR dem letzten Tick, damit die
 *           Darstellung zwischen zwei Ticks weich überblenden kann (20 Ticks/s, aber 60+ Bilder/s).
 * LIEST:    verbindung (Zustand, Pause, Tempo), data/takt.js
 * SCHREIBT: nur eigene Verwaltungswerte; den Zustand ändert nur verbindung.schritt()
 * REGEL:    KONZEPT.md §8 Regel 2 (fester Takt), CLAUDE.md Regel 1
 * DEBUG:    `ek.spiel` zeigt akkuMs, alpha, msProTick. Ruckelt der Koloss? alpha im F3-Overlay
 *           beobachten — er muss gleichmäßig von 0 bis 1 laufen.
 * Quelle Akkumulator: https://gafferongames.com/post/fix_your_timestep/
 */

import { TICK_MS, MAX_TICKS_PRO_BILD } from '../data/takt.js';
import { alsMeter } from '../sim/abfragen.js';

/** @typedef {import('../netz/verbindung.js').Verbindung} Verbindung */
/** @typedef {import('../sim/types.js').Koloss} Koloss */

/** Lage eines Kolosses zum Zeichnen: Meter und Bogenmaß (Kommazahlen, nur Darstellung). */
/** @typedef {{x: number, y: number, h: number}} Lage */

/**
 * @typedef {Object} Spiel
 * @property {Verbindung} verbindung
 * @property {number} akkuMs      angesammelte, noch nicht verrechnete echte Zeit
 * @property {number} alpha       0 … 1: wie weit wir zwischen vorletztem und letztem Tick sind
 * @property {Lage[]} vorher      Lage je Koloss-ID vor dem letzten Tick
 * @property {number} msProTick   Messwert: Rechenzeit des letzten Ticks
 */

/**
 * @param {Verbindung} verbindung
 * @returns {Spiel}
 */
export function spielErstellen(verbindung) {
  return { verbindung, akkuMs: 0, alpha: 1, vorher: [], msProTick: 0 };
}

/**
 * Lässt die fälligen Ticks laufen. Einmal pro Bild aufrufen.
 * @param {Spiel} spiel
 * @param {number} dtMs  echte Zeit seit dem letzten Bild
 */
export function bildSchritt(spiel, dtMs) {
  const v = spiel.verbindung;
  if (v.pausiert()) return; // alpha bleibt stehen → das Bild friert sauber ein
  spiel.akkuMs += dtMs * v.tempo();
  let n = Math.floor(spiel.akkuMs / TICK_MS);
  if (n > MAX_TICKS_PRO_BILD) {
    // Zu weit hinterher (Tab war im Hintergrund): Rest verwerfen statt einzufrieren.
    n = MAX_TICKS_PRO_BILD;
    spiel.akkuMs = n * TICK_MS;
  }
  for (let i = 0; i < n; i++) einTick(spiel);
  spiel.akkuMs -= n * TICK_MS;
  spiel.alpha = spiel.akkuMs / TICK_MS;
}

/**
 * Genau ein Tick, mit Lage-Schnappschuss für die Überblendung. Auch für `ek.step()`.
 * @param {Spiel} spiel
 */
export function einTick(spiel) {
  spiel.vorher = spiel.verbindung.zustand().kolosse.map(lageAus);
  const t0 = performance.now();
  spiel.verbindung.schritt();
  spiel.msProTick = performance.now() - t0;
}

/**
 * Überblendete Lage eines Kolosses für das aktuelle Bild.
 * @param {Spiel} spiel
 * @param {Koloss} k
 * @returns {Lage}
 */
export function lageZumZeichnen(spiel, k) {
  const jetzt = lageAus(k);
  const alt = spiel.vorher[k.id];
  if (!alt) return jetzt;
  const a = spiel.alpha;
  // Winkel über den kürzeren Weg überblenden (sonst dreht er bei 359° → 0° einmal herum).
  let dh = jetzt.h - alt.h;
  if (dh > Math.PI) dh -= 2 * Math.PI;
  if (dh < -Math.PI) dh += 2 * Math.PI;
  return { x: alt.x + (jetzt.x - alt.x) * a, y: alt.y + (jetzt.y - alt.y) * a, h: alt.h + dh * a };
}

/**
 * @param {Koloss} k
 * @returns {Lage}
 */
function lageAus(k) {
  return { x: alsMeter(k.x), y: alsMeter(k.y), h: (k.h / 65536) * 2 * Math.PI };
}
