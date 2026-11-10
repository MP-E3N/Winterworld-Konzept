// @ts-check
/**
 * replay-aufnehmen.js — Nimmt die Testfahrt neu auf und speichert ihren Hash.
 * Aufruf: `node tools/replay-aufnehmen.js`
 *
 * ZWECK:    tests/replays/m1-fahren.json hält fest, wie die Testfahrt ausgeht. Ändert sich das
 *           Fahrverhalten, schlägt der Replay-Test an.
 * LIEST:    tests/test-fahrt.js
 * SCHREIBT: tests/replays/m1-fahren.json
 * REGEL:    NUR nach ABSICHTLICHER Regeländerung ausführen und das in der Commit-Nachricht sagen.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { testProtokoll } from '../tests/test-fahrt.js';
import { replayAbspielen } from '../sim/replay.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { alsKmh, alsMeter, laengsTempo } from '../sim/abfragen.js';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { seed, ticks, protokoll } = testProtokoll();
const s = replayAbspielen(seed, protokoll, ticks);
const k = s.kolosse[0];
const datei = { seed, ticks, hash: zustandsHash(s), protokoll };
writeFileSync(path.join(WURZEL, 'tests', 'replays', 'm1-fahren.json'), JSON.stringify(datei, null, 1) + '\n');
console.log(`m1-fahren.json: Hash ${datei.hash}`);
console.log(`Ende: x=${alsMeter(k.x).toFixed(1)} m, y=${alsMeter(k.y).toFixed(1)} m, ` +
  `Richtung=${k.h}, Tempo=${alsKmh(laengsTempo(k)).toFixed(2)} km/h`);
