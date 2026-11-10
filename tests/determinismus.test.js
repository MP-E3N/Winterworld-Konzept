// @ts-check
/**
 * determinismus.test.js — Gleiche Eingaben → gleicher Zustand. Speichern/Laden. Replays.
 * REGEL: KONZEPT.md §8 Regeln 3 und 10
 * DEBUG: Schlägt der Replay-Test fehl, hat sich das Fahrverhalten geändert. War das Absicht,
 *        `node tools/replay-aufnehmen.js` ausführen und es in der Commit-Nachricht sagen.
 */

import { test, pruefe, gleich } from './harness.js';
import { replayAbspielen, weiterSpielen, kopie } from '../sim/replay.js';
import { zustandsHash } from '../sim/lib/hash.js';
import { lokaleVerbindungErstellen } from '../netz/lokal.js';
import { ZUSTAND_VERSION } from '../data/takt.js';
import { testProtokoll } from './test-fahrt.js';

test('Determinismus: zweimal dieselbe Testfahrt ergibt denselben Hash', () => {
  const { seed, protokoll, ticks } = testProtokoll();
  const a = replayAbspielen(seed, protokoll, ticks);
  const b = replayAbspielen(seed, protokoll, ticks);
  gleich(zustandsHash(a), zustandsHash(b), 'Hash');
  pruefe(a.kolosse[0].x !== 0 || a.kolosse[0].y !== 0, 'Testfahrt hat sich nicht bewegt');
});

test('Determinismus: Zustand ist reines JSON aus sicheren Ganzzahlen', () => {
  const { seed, protokoll, ticks } = testProtokoll();
  const s = replayAbspielen(seed, protokoll, ticks);
  /** @param {unknown} w @param {string} pfad */
  function pruefeWert(w, pfad) {
    if (typeof w === 'number') pruefe(Number.isSafeInteger(w), `${pfad} = ${w} ist keine sichere Ganzzahl`);
    else if (Array.isArray(w)) w.forEach((x, i) => pruefeWert(x, `${pfad}[${i}]`));
    else if (w && typeof w === 'object') for (const [k, x] of Object.entries(w)) pruefeWert(x, `${pfad}.${k}`);
  }
  pruefeWert(s, 'state');
});

test('Determinismus: Speichern/Laden mitten in der Fahrt ändert den Verlauf nicht', () => {
  const { seed, protokoll, ticks } = testProtokoll();
  const halb = replayAbspielen(seed, protokoll, 400);
  // „Speichern“ = als JSON-Text, „Laden“ = zurückverwandeln.
  const geladen = JSON.parse(JSON.stringify(halb));
  gleich(geladen.version, ZUSTAND_VERSION, 'Version');
  const weiter = weiterSpielen(geladen, protokoll, ticks);
  const direkt = replayAbspielen(seed, protokoll, ticks);
  gleich(zustandsHash(weiter), zustandsHash(direkt), 'Hash nach Laden');
  pruefe(zustandsHash(kopie(direkt)) === zustandsHash(direkt), 'kopie() verändert den Zustand');
});

test('Determinismus: lokale Verbindung zeichnet ein Protokoll auf, das sich exakt nachspielen lässt', () => {
  const { protokoll } = testProtokoll();
  const v = lokaleVerbindungErstellen(0, 'Test');
  let i = 0;
  for (let t = 0; t < 600; t++) {
    // Das BEITRETEN aus dem Testprotokoll überspringen — das schickt die Verbindung selbst.
    while (i < protokoll.length && protokoll[i].tick === t) {
      if (protokoll[i].befehl.art !== 'BEITRETEN') v.senden(protokoll[i].befehl);
      i += 1;
    }
    v.schritt();
  }
  const nach = replayAbspielen(0, v.protokoll(), 600);
  gleich(zustandsHash(nach), zustandsHash(v.zustand()), 'Hash Verbindung vs. Replay');
});

test('Replay: aufgenommene Testfahrt ergibt den gespeicherten Hash', async (u) => {
  const datei = await u.jsonLaden('tests/replays/m1-fahren.json');
  const s = replayAbspielen(datei.seed, datei.protokoll, datei.ticks);
  gleich(zustandsHash(s), datei.hash, 'Hash weicht ab — Fahrverhalten geändert?');
});
