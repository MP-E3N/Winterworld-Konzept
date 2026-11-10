// @ts-check
/**
 * welt-ansehen.js — Zeigt die Umgebung des Starts als Text-Karte und zählt die Geländeanteile.
 * Aufruf: `node tools/welt-ansehen.js [seed] [meter]`   (meter = Meter pro Zeichen, Standard 64)
 *
 * ZWECK:    Schwellen in data/welt.js abstimmen, ohne den Browser zu öffnen.
 *           Zeichen:  . Packschnee  , Pulverschnee  o dickes Eis  ~ dünnes Eis  # Fels  X Schlucht  @ Start
 * LIEST:    sim/welt/generator.js
 * SCHREIBT: — (nur Konsole)
 */

import { gelaendeAn } from '../sim/welt/generator.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { FEIN_PRO_M } from '../data/welt.js';

const seed = Number(process.argv[2] ?? 4711);
const meter = Number(process.argv[3] ?? 64);
const ZEICHEN = ['.', ',', 'o', '~', '#', 'X'];
const BREITE = 120, HOEHE = 50;

const zaehler = UNTERGRUND.map(() => 0);
const zeilen = [];
for (let zy = 0; zy < HOEHE; zy++) {
  let zeile = '';
  for (let zx = 0; zx < BREITE; zx++) {
    // Zeichen sind etwa doppelt so hoch wie breit → senkrecht doppelter Abstand.
    const mx = (zx - BREITE / 2) * meter, my = (zy - HOEHE / 2) * meter * 2;
    const typ = Math.floor(gelaendeAn(seed, mx * FEIN_PRO_M, my * FEIN_PRO_M) / 65536);
    zaehler[typ] += 1;
    zeile += zx === BREITE / 2 && zy === HOEHE / 2 ? '@' : ZEICHEN[typ];
  }
  zeilen.push(zeile);
}
console.log(zeilen.join('\n'));
console.log(`Seed ${seed}, je Zeichen ${meter} m breit, Ausschnitt ${(BREITE * meter) / 1000} km`);
console.log(UNTERGRUND.map((u, i) => `${u.name} ${((zaehler[i] * 100) / (BREITE * HOEHE)).toFixed(1)} %`).join(' · '));
