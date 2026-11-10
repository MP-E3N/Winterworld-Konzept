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
 *             ek.nacht(x)       Dunkelheit 0 … 1 zum Testen der Scheinwerfer (ek.nacht(0) = Tag)
 *             ek.funde(m)       Fundstellen im Umkreis m (Standard 600 m) mit Abstand und Rest
 *             ek.ladung()       Laderaum des eigenen Kolosses (t)
 *             ek.replay()       Protokoll dieser Fahrt als JSON (für Fehlerberichte)
 *             ek.kamera, ek.spiel, ek.verbindung, ek.optik()
 * LIEST:    das Spiel
 * SCHREIBT: nur über Befehle bzw. die Verbindung
 */

import { einTick } from '../game/spiel.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { kolossVon, rumpfMitte, fundRest } from '../sim/abfragen.js';
import { fundstellenImBereich } from '../sim/welt/fundstellen.js';
import { FUNDARTEN } from '../data/fundstellen.js';
import { UM_PRO_METER } from '../data/koloss.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { kamera } from '../render/kamera.js';
import { optikZahlen } from '../render/spuren.js';
import { kachelZahlen } from '../render/welt.js';
import { ansichtLicht } from '../render/licht.js';

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
    /** @param {number} [umkreis=600]  Meter */
    funde(umkreis = 600) {
      const v = spielHolen().verbindung;
      const s = v.zustand();
      const k = kolossVon(s, v.spieler);
      if (!k) return [];
      const m = rumpfMitte(k), r = umkreis * UM_PRO_METER;
      return fundstellenImBereich(s.seed, m.x - r, m.y - r, m.x + r, m.y + r)
        .map((f) => ({ id: f.id, art: FUNDARTEN[f.art].name, abstandM: Math.round(Math.hypot(f.x - m.x, f.y - m.y) / UM_PRO_METER), restT: fundRest(s, f) / 1000, mengeT: f.menge / 1000 }))
        .filter((f) => f.abstandM <= umkreis)
        .sort((a, b) => a.abstandM - b.abstandM);
    },
    ladung() {
      const v = spielHolen().verbindung;
      const k = kolossVon(v.zustand(), v.spieler);
      return k ? Object.fromEntries(Object.entries(k.ladung).map(([w, kg]) => [w, kg / 1000])) : null;
    },
    optik: optikZahlen,
    kacheln: kachelZahlen,
    /** Dunkelheit zum Ausprobieren der Scheinwerfer (0 = Tag … 1 = Nacht); ab M4 macht das die Tageszeit.
     * @param {number} [wert=0.85] */
    nacht(wert = 0.85) { ansichtLicht.nacht = Math.max(0, Math.min(1, wert)); return ansichtLicht.nacht; },
  };
  /** @type {any} */ (window).ek = ek;
}
