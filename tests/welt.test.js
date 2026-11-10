// @ts-check
/**
 * welt.test.js — Tests für Rauschen und Weltgenerator (M2).
 * REGEL: docs/specs/M2-welt.md „Tests“, CLAUDE.md „Generatoren über viele Seeds testen“
 */

import { test, pruefe, gleich } from './harness.js';
import { wertRauschen, schichtRauschen, RAUSCH_MAX } from '../sim/welt/rauschen.js';
import { gelaendeAn } from '../sim/welt/generator.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND, FELS, SCHLUCHT, PACKSCHNEE, EIS_DICK, EIS_DUENN } from '../data/untergrund.js';
import { START_FREI_M, START_SICHER_M, FEIN_PRO_M } from '../data/welt.js';

const SEEDS = Array.from({ length: 20 }, (_, i) => 1000 + i * 37);

/** Typ an einer Stelle in METERN. @param {number} seed @param {number} mx @param {number} my */
const typAn = (seed, mx, my) => Math.floor(gelaendeAn(seed, mx * FEIN_PRO_M, my * FEIN_PRO_M) / 65536);

test('Rauschen: gleich bei gleichem Seed, im Bereich, verschieden bei anderem Seed', () => {
  let anders = 0;
  for (let i = 0; i < 2000; i++) {
    const gx = (i * 7919) % 3001 - 1500, gy = (i * 104729) % 2999 - 1500;
    const a = schichtRauschen(5, gx, gy, 50);
    gleich(a, schichtRauschen(5, gx, gy, 50), 'wiederholbar');
    pruefe(a >= 0 && a <= RAUSCH_MAX && Number.isInteger(a), `außerhalb: ${a}`);
    if (a !== schichtRauschen(6, gx, gy, 50)) anders += 1;
  }
  pruefe(anders > 1900, `Seeds 5 und 6 zu ähnlich (${anders} von 2000 verschieden)`);
});

test('Rauschen: weich — Nachbarzellen unterscheiden sich wenig', () => {
  let maxSprung = 0;
  for (let gx = -300; gx < 300; gx++) maxSprung = Math.max(maxSprung, Math.abs(wertRauschen(9, gx + 1, 17, 64) - wertRauschen(9, gx, 17, 64)));
  pruefe(maxSprung < 3000, `Sprung ${maxSprung} zwischen Nachbarzellen`);
});

test('Welt: Physik-Abfrage (µm) und Generator (Feinpunkte) sehen dieselbe Welt', () => {
  for (let i = 0; i < 500; i++) {
    const mx = (i * 7919) % 4001 - 2000, my = (i * 6151) % 3999 - 2000;
    gleich(untergrundAn(4711, mx * 1e6, my * 1e6), typAn(4711, mx, my), `Punkt ${mx}/${my} m`);
  }
});

test('Welt: Start frei — Packschnee im Kern, kein Fels/keine Schlucht im Sicherheitsring (20 Seeds)', () => {
  for (const seed of SEEDS) {
    for (let my = -START_SICHER_M; my <= START_SICHER_M; my += 9) {
      for (let mx = -START_SICHER_M; mx <= START_SICHER_M; mx += 9) {
        const r2 = mx * mx + my * my, typ = typAn(seed, mx, my);
        if (r2 < START_FREI_M * START_FREI_M) gleich(typ, PACKSCHNEE, `Seed ${seed} Kern ${mx}/${my} m`);
        else if (r2 < START_SICHER_M * START_SICHER_M) pruefe(typ !== FELS && typ !== SCHLUCHT, `Seed ${seed} Hindernis bei ${mx}/${my} m`);
      }
    }
  }
});

test('Welt: Geländeanteile im 12-km-Feld plausibel (20 Seeds)', () => {
  const summe = UNTERGRUND.map(() => 0);
  let n = 0;
  for (const seed of SEEDS) {
    const z = UNTERGRUND.map(() => 0);
    for (let my = -6000; my < 6000; my += 120) for (let mx = -6000; mx < 6000; mx += 120) { z[typAn(seed, mx, my)] += 1; n += 1; }
    const anteil = (/** @type {number} */ t) => (z[t] * 100) / 10000;
    pruefe(anteil(PACKSCHNEE) > 25, `Seed ${seed}: zu wenig Packschnee (${anteil(PACKSCHNEE)} %)`);
    pruefe(anteil(FELS) < 40, `Seed ${seed}: zu viel Fels (${anteil(FELS)} %)`);
    z.forEach((v, i) => { summe[i] += v; });
  }
  const mittel = (/** @type {number} */ t) => (summe[t] * 100) / n;
  pruefe(mittel(FELS) > 4 && mittel(FELS) < 25, `Fels im Mittel ${mittel(FELS).toFixed(1)} %`);
  pruefe(mittel(EIS_DICK) + mittel(EIS_DUENN) > 5, `Eis im Mittel ${(mittel(EIS_DICK) + mittel(EIS_DUENN)).toFixed(1)} %`);
  // Seit Spieltest M2 bewusst weniger Schluchten (große freie Ebenen) — aber es soll sie geben.
  pruefe(mittel(SCHLUCHT) > 0.4 && mittel(SCHLUCHT) < 8, `Schlucht im Mittel ${mittel(SCHLUCHT).toFixed(1)} %`);
});

test('Welt: ≥ 90 % der befahrbaren Fläche im Umkreis von 600 m sind erreichbar (20 Seeds)', () => {
  // Ein Koloss ist ~10 m breit: Eine Zelle gilt nur als befahrbar, wenn auch ihre 8 Nachbarn
  // befahrbar sind (12-m-Korridor). Dann Breitensuche vom Start.
  const R = 150, N = 2 * R + 1; // 4-m-Raster, 600 m Radius
  for (const seed of SEEDS) {
    const frei = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) frei[y * N + x] = UNTERGRUND[typAn(seed, (x - R) * 4 + 2, (y - R) * 4 + 2)].befahrbar ? 1 : 0;
    const breit = new Uint8Array(N * N);
    let flaeche = 0;
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!frei[(y + dy) * N + x + dx]) { ok = 0; break; }
        const imKreis = (x - R) * (x - R) + (y - R) * (y - R) <= R * R;
        breit[y * N + x] = ok && imKreis ? 1 : 0;
        flaeche += breit[y * N + x];
      }
    }
    const gesehen = new Uint8Array(N * N);
    const schlange = [R * N + R];
    gesehen[R * N + R] = 1;
    let erreicht = 0;
    while (schlange.length) {
      const i = /** @type {number} */ (schlange.pop());
      erreicht += 1;
      for (const j of [i - 1, i + 1, i - N, i + N]) if (breit[j] && !gesehen[j]) { gesehen[j] = 1; schlange.push(j); }
    }
    const anteil = (erreicht * 100) / flaeche;
    pruefe(anteil >= 90, `Seed ${seed}: nur ${anteil.toFixed(1)} % erreichbar`);
  }
});

test('Welt: Seed 0 ist das Testgelände (See im Norden, Felsblock im Süden)', () => {
  gleich(typAn(0, 0, -450), EIS_DICK, 'Seemitte (0/−450 m)');
  gleich(typAn(0, 0, -640), EIS_DUENN, 'Seerand (0/−640 m)');
  gleich(typAn(0, 0, 420), FELS, 'Felsblock (0/420 m)');
  gleich(typAn(0, 0, 0), PACKSCHNEE, 'Start');
});
