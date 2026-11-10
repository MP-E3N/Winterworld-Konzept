// @ts-check
/**
 * fundstellen.js — Wo liegen Fundstellen? Berechnet aus dem Seed, wie das Gelände.
 *
 * ZWECK:    Die Welt ist in Fundzellen zu FUND_ZELLE_M geteilt. Ein Hash aus Seed und Zellnummer
 *           entscheidet, ob in einer Zelle eine Fundstelle liegt, welche Art, wo genau und wie viel
 *           darin ist. Nichts davon steht im Zustand — nur, was schon geborgen wurde
 *           (state.geborgen, Änderungsliste nach KONZEPT §8 R7).
 * LIEST:    data/fundstellen.js, data/testgelaende.js (Seed 0), Untergrund (sim/welt/untergrund.js)
 * SCHREIBT: —
 * REGEL:    docs/specs/M3-fundstellen.md, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    `ek.funde()` listet die Fundstellen in der Nähe. tests/bergen.test.js prüft Verteilung,
 *           Untergrund und die ID-Rückrechnung.
 *
 * ID: gepackte Zellnummer (zx + 32768) * 65536 + (zy + 32768) — eine sichere Ganzzahl ≥ 0, über
 * die sich die Fundstelle jederzeit wieder berechnen lässt (fundstelleMitId).
 */

import { hash2 } from './rauschen.js';
import { untergrundAn } from './untergrund.js';
import { PACKSCHNEE, PULVERSCHNEE } from '../../data/untergrund.js';
import { UM_PRO_METER } from '../../data/koloss.js';
import { TESTGELAENDE_SEED } from '../../data/welt.js';
import { TESTFUNDE } from '../../data/testgelaende.js';
import {
  FUNDARTEN, OELFAESSER, FUND_ZELLE_M, FUND_RAND_M, FUND_CHANCE, FUND_CHANCE_START, START_FUND_M,
  START_ABSTAND_M, OEL_AB_M, OEL_VOLL_M, OEL_GEWICHT_MAX,
} from '../../data/fundstellen.js';

/**
 * Eine Fundstelle (berechnet, nicht im Zustand).
 * @typedef {Object} Fundstelle
 * @property {number} id        gepackte Zellnummer (siehe oben)
 * @property {number} art       Index in FUNDARTEN
 * @property {number} x         Mitte (µm)
 * @property {number} y
 * @property {number} menge     Anfangsmenge (kg) = Stücke × Stückgewicht
 * @property {number} variante  0 … 255, nur für die Darstellung (welches Bildchen)
 */

/** Zellgröße in µm. */
const ZELLE_UM = FUND_ZELLE_M * UM_PRO_METER;
/** Versatz beim Packen der Zellnummer (Zellen von −32768 bis 32767 ≈ ±6500 km). */
const VERSATZ = 32768;

/**
 * ID einer Fundzelle.
 * @param {number} zx @param {number} zy  Zellnummern
 * @returns {number}
 */
export function fundId(zx, zy) {
  return (zx + VERSATZ) * 65536 + (zy + VERSATZ);
}

/**
 * Zellnummer, in der ein Punkt liegt.
 * @param {number} um  Koordinate (µm)
 * @returns {number}
 */
export function fundZelle(um) {
  return Math.floor(um / ZELLE_UM);
}

/**
 * Die Fundstelle mit dieser ID (oder null, wenn es keine gibt).
 * @param {number} seed
 * @param {number} id
 * @returns {Fundstelle | null}
 */
export function fundstelleMitId(seed, id) {
  if (!Number.isSafeInteger(id) || id < 0) return null;
  const zx = Math.floor(id / 65536) - VERSATZ;
  const zy = (id % 65536) - VERSATZ;
  return fundstelleInZelle(seed, zx, zy);
}

/**
 * Die Fundstelle einer Zelle (oder null).
 * @param {number} seed
 * @param {number} zx @param {number} zy
 * @returns {Fundstelle | null}
 */
export function fundstelleInZelle(seed, zx, zy) {
  if (seed === TESTGELAENDE_SEED) return testfund(zx, zy);
  const h1 = hash2(seed + 71, zx, zy), h2 = hash2(seed + 73, zx, zy);
  const h3 = hash2(seed + 79, zx, zy), h4 = hash2(seed + 83, zx, zy);

  // Lage in der Zelle (Dezimeter-Raster), mit Rand zu den Nachbarzellen.
  const spanneDm = (FUND_ZELLE_M - 2 * FUND_RAND_M) * 10;
  const x = zx * ZELLE_UM + FUND_RAND_M * UM_PRO_METER + (h2 % spanneDm) * (UM_PRO_METER / 10);
  const y = zy * ZELLE_UM + FUND_RAND_M * UM_PRO_METER + (h3 % spanneDm) * (UM_PRO_METER / 10);
  const xm = Math.floor(x / UM_PRO_METER), ym = Math.floor(y / UM_PRO_METER);

  // Gibt es hier eine? Rund um den Start öfter, direkt am Startpunkt nie.
  const abstand2 = xm * xm + ym * ym;
  if (abstand2 < START_ABSTAND_M * START_ABSTAND_M) return null;
  const chance = abstand2 < START_FUND_M * START_FUND_M ? FUND_CHANCE_START : FUND_CHANCE;
  if (h1 % 100 >= chance) return null;

  // Nur auf Schnee: nicht auf Eis (zu schwer, M4), nicht in Fels oder Schlucht.
  const boden = untergrundAn(seed, x, y);
  if (boden !== PACKSCHNEE && boden !== PULVERSCHNEE) return null;

  const art = artWaehlen(h4 % 1000, Math.max(Math.abs(xm), Math.abs(ym)));
  const a = FUNDARTEN[art];
  const stuecke = a.stueckeMin + (Math.floor(h4 / 1000) % (a.stueckeMax - a.stueckeMin + 1));
  return { id: fundId(zx, zy), art, x, y, menge: stuecke * a.stueckKg, variante: (h1 >>> 8) & 255 };
}

/**
 * Würfelt die Art nach Häufigkeit. Öl erst ab OEL_AB_M, nach außen bis OEL_VOLL_M häufiger.
 * @param {number} wurf  0 … 999
 * @param {number} weite  größeres der beiden Maße vom Start (m)
 * @returns {number} Art-Nummer
 */
function artWaehlen(wurf, weite) {
  const oel = weite < OEL_AB_M ? 0
    : Math.floor((OEL_GEWICHT_MAX * Math.min(weite - OEL_AB_M, OEL_VOLL_M - OEL_AB_M)) / (OEL_VOLL_M - OEL_AB_M));
  const gewichte = FUNDARTEN.map((a, i) => (i === OELFAESSER ? oel : a.gewicht));
  let summe = 0;
  for (const g of gewichte) summe += g;
  let rest = Math.floor((wurf * summe) / 1000);
  for (let i = 0; i < gewichte.length; i++) {
    if (rest < gewichte[i]) return i;
    rest -= gewichte[i];
  }
  return 0;
}

/**
 * Seed 0: feste Fundstellen aus data/testgelaende.js.
 * @param {number} zx @param {number} zy
 * @returns {Fundstelle | null}
 */
function testfund(zx, zy) {
  for (const t of TESTFUNDE) {
    const x = t.x * UM_PRO_METER, y = t.y * UM_PRO_METER;
    if (fundZelle(x) !== zx || fundZelle(y) !== zy) continue;
    return { id: fundId(zx, zy), art: t.art, x, y, menge: t.stuecke * FUNDARTEN[t.art].stueckKg, variante: (zx * 7 + zy * 13) & 255 };
  }
  return null;
}

/**
 * Alle Fundstellen, deren Zelle den Bereich berührt (für Konsole und Tests; die Darstellung hat
 * einen eigenen Zwischenspeicher).
 * @param {number} seed
 * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1  µm
 * @returns {Fundstelle[]}
 */
export function fundstellenImBereich(seed, x0, y0, x1, y1) {
  /** @type {Fundstelle[]} */
  const liste = [];
  for (let zy = fundZelle(y0); zy <= fundZelle(y1); zy++) {
    for (let zx = fundZelle(x0); zx <= fundZelle(x1); zx++) {
      const f = fundstelleInZelle(seed, zx, zy);
      if (f) liste.push(f);
    }
  }
  return liste;
}
