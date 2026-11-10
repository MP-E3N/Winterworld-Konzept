// @ts-check
/**
 * konsole.js — Hilfen für die Browser-Konsole (F12): alles unter `ek.…`.
 *
 * ZWECK:    Selbst nachsehen und eingreifen, ohne den Code zu ändern.
 *             ek.state          aktueller Zustand (nur lesen!)
 *             ek.step(n)        n Ticks ausführen (auch bei Pause; gut bei versteckter Vorschau)
 *             ek.hash()         Prüfsumme des Zustands
 *             ek.untergrund()   Untergrund unter dem eigenen Koloss
 *             ek.neu(seed)      neue Welt (0 = Testgelände)
 *             ek.kacheln()      Gelände-Kacheln der Darstellung
 *             ek.replay()       Protokoll dieser Fahrt als JSON (für Fehlerberichte)
 *             ek.kamera, ek.spiel, ek.verbindung, ek.optik()
 * LIEST:    das Spiel
 * SCHREIBT: nur über Befehle bzw. die Verbindung
 */

import { einTick } from '../game/spiel.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { kolossVon } from '../sim/abfragen.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { kamera } from '../render/kamera.js';
import { optikZahlen } from '../render/spuren.js';
import { kachelZahlen } from '../render/welt.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/**
 * @param {() => Spiel} spielHolen
 * @param {(seed: number) => void} neueWelt
 */
export function konsoleEinrichten(spielHolen, neueWelt) {
  const ek = {
    get spiel() { return spielHolen(); },
    get verbindung() { return spielHolen().verbindung; },
    get state() { return spielHolen().verbindung.zustand(); },
    kamera,
    /** @param {number} [n=1] */
    step(n = 1) { for (let i = 0; i < n; i++) einTick(spielHolen()); return spielHolen().verbindung.zustand().tick; },
    hash() { return zustandsHash(spielHolen().verbindung.zustand()); },
    untergrund() {
      const v = spielHolen().verbindung;
      const k = kolossVon(v.zustand(), v.spieler);
      return k ? UNTERGRUND[untergrundAn(v.zustand().seed, k.x, k.y)].name : '–';
    },
    /** @param {number} [seed] */
    neu(seed = Date.now() % 100000) { neueWelt(seed); return seed; },
    replay() {
      const v = spielHolen().verbindung;
      const s = v.zustand();
      return JSON.stringify({ seed: s.seed, ticks: s.tick, hash: zustandsHash(s), protokoll: v.protokoll() });
    },
    optik: optikZahlen,
    kacheln: kachelZahlen,
  };
  /** @type {any} */ (window).ek = ek;
}
