// @ts-check
/**
 * fahren.js — Fahrphysik des Kolosses (ein Tick).
 *
 * ZWECK:    Aus Gas, Lenkung, Kesseldruck und Untergrund das neue Tempo, die neue Richtung und
 *           die neue Position berechnen. Schwer und träge: langsames Anfahren, langer Bremsweg,
 *           auf Eis rutscht der Koloss seitlich weg.
 * LIEST:    k.gas, k.lenkung, k.druck, k.tempomat, Untergrund an der Position (Seed), data/koloss.js
 * SCHREIBT: k.x, k.y, k.vx, k.vy, k.h, k.dreh, k.antrieb
 * REGEL:    KONZEPT.md §3 „Fahrgefühl“, CLAUDE.md Regeln 2+3 (nur Ganzzahlen)
 * DEBUG:    F3 zeigt Längs-/Quertempo und Untergrund. Zum Nachstellen: `ek.step(n)` und
 *           Haltepunkt in fahrSchritt(). Tests: tests/fahren.test.js.
 *
 * MODELL (einfach, aber bewährt):
 *   1. Das Tempo liegt als Weltvektor (vx, vy) vor. Es wird in „längs“ (Fahrtrichtung) und
 *      „quer“ (seitlich) zerlegt.
 *   2. Längs wirken Schub, Bremse, Ausrollen und ein Widerstand proportional zum Tempo.
 *      Schub und Widerstand gleichen sich beim Höchsttempo aus.
 *   3. Quer wirkt nur die Haftung: Auf Schnee verschwindet das Rutschen sofort, auf Eis kaum.
 *   4. Lenken dreht die Fahrtrichtung, nicht das Tempo. Das Tempo „folgt“ über die Haftung —
 *      genau dadurch rutscht der Koloss auf Eis in Kurven nach außen.
 */

import {
  SCHUB, SCHUB_RUECKWAERTS, BREMSE, ROLLEN, DREH_MAX, TEMPO_VOLLE_LENKUNG, DREH_ANPASSUNG, EINGABE_MAX,
  TEMPOMAT_KORREKTUR, TEMPO_EIN_KMH,
} from '../../data/koloss.js';
import { UNTERGRUND } from '../../data/untergrund.js';
import { untergrundAn } from '../welt/untergrund.js';
import { bewegenMitKollision } from './kollision.js';
import { cosW, sinW, teile, winkelNorm, klemme, TRIG_EINS } from '../lib/winkel.js';

/** @typedef {import('../types.js').Koloss} Koloss */

/**
 * Ein Tick Fahrphysik für einen Koloss.
 * @param {Koloss} k
 * @param {number} seed  Welt-Seed (für Untergrund und Kollision)
 */
export function fahrSchritt(k, seed) {
  const u = UNTERGRUND[untergrundAn(seed, k.x, k.y)];
  const c = cosW(k.h);
  const s = sinW(k.h);

  // ── 1. Zerlegen in längs/quer ─────────────────────────
  let laengs = teile(k.vx * c + k.vy * s, TRIG_EINS);
  let quer = teile(-k.vx * s + k.vy * c, TRIG_EINS);

  // ── 2. Längs: Antrieb, Bremse, Widerstand ─────────────
  k.antrieb = wirksamesGas(k, laengs, u.zug, u.widerstand);
  laengs += laengsBeschleunigung(k, laengs, u.zug, u.bremsen);
  // Widerstand ∝ Tempo. Er bestimmt zusammen mit dem Schub das Höchsttempo.
  laengs -= teile(laengs * u.widerstand, 4096);

  // ── 3. Quer: Haftung baut Rutschen ab ─────────────────
  quer -= teile(quer * u.haftung, 4096);

  // ── 4. Lenken ─────────────────────────────────────────
  // Gewünschte Drehung: voller Einschlag erst ab TEMPO_VOLLE_LENKUNG, im Stand keine.
  // Rückwärts dreht sich die Lenkung um (wie beim Auto).
  const tempoAnteil = klemme(Math.abs(laengs), 0, TEMPO_VOLLE_LENKUNG);
  let ziel = teile(teile(k.lenkung * DREH_MAX, EINGABE_MAX) * tempoAnteil, TEMPO_VOLLE_LENKUNG);
  ziel = teile(ziel * u.lenken, 100);
  if (laengs < 0) ziel = -ziel;
  k.dreh += drehSchritt(ziel - k.dreh);
  // Im Stand kann sich ein Radfahrzeug nicht drehen — egal, was von vorher übrig ist.
  if (laengs === 0) k.dreh = 0;
  const neuH = winkelNorm(k.h + k.dreh);

  // ── 5. Zurück in Weltrichtung (mit der ALTEN Richtung) und bewegen ──
  // WARUM alte Richtung: Das Tempo dreht NICHT automatisch mit. Im nächsten Tick zeigt die
  // neue Fahrtrichtung etwas schräg zum Tempo → es entsteht Quertempo, das die Haftung
  // abbaut. Auf Schnee geht das fast sofort (der Koloss fährt die Kurve), auf Eis kaum
  // (er rutscht weiter geradeaus, obwohl der Bug schon zur Seite zeigt).
  k.vx = teile(laengs * c - quer * s, TRIG_EINS);
  k.vy = teile(laengs * s + quer * c, TRIG_EINS);

  // ── 6. Bewegen — aber nicht in Fels oder Schlucht hinein (sim/koloss/kollision.js) ──
  bewegenMitKollision(k, seed, neuH);
}

/**
 * Wie weit sich die Drehung in diesem Tick dem Ziel nähert.
 * WARUM mindestens 1: DREH_ANPASSUNG ist 20 %. Bei einem Rest von ±4 ergäbe das ±0,8 → abgeschnitten 0.
 * Die Drehung blieb dann ewig bei −4 hängen, und der Koloss drehte sich ohne Lenkung langsam
 * gegen den Uhrzeigersinn — sogar im Stand (Fehler aus dem ersten Spieltest, 2026-11-10).
 * @param {number} rest  Ziel minus aktuelle Drehung
 * @returns {number}
 */
function drehSchritt(rest) {
  const schritt = teile(rest * DREH_ANPASSUNG, 100);
  if (schritt !== 0) return schritt;
  return rest > 0 ? 1 : rest < 0 ? -1 : 0;
}

/**
 * Gas, das tatsächlich wirkt: Gibt der Spieler selbst Gas oder bremst, zählt das. Sonst hält
 * „Tempo halten“ (k.tempomat) das Zieltempo — so viel Gas, dass der Schub den Widerstand beim
 * Zieltempo ausgleicht (Vorsteuerung), plus eine Korrektur je km/h Abweichung.
 * WARUM Vorsteuerung: Nur mit Korrektur pendelt sich das Tempo spürbar unter dem Ziel ein.
 * @param {Koloss} k
 * @param {number} laengs  aktuelles Längstempo (µm/Tick)
 * @param {number} zug  Prozent
 * @param {number} widerstand  /4096 pro Tick
 * @returns {number} −100 … 100
 */
function wirksamesGas(k, laengs, zug, widerstand) {
  if (k.tempomat === 0 || k.gas !== 0) return k.gas;
  if (SCHUB[k.druck] === 0 || zug === 0) return 0;
  const halten = teile(k.tempomat * widerstand * EINGABE_MAX * 100, 4096 * SCHUB[k.druck] * zug);
  const korrektur = teile((k.tempomat - laengs) * TEMPOMAT_KORREKTUR, TEMPO_EIN_KMH);
  return klemme(halten + korrektur, 0, EINGABE_MAX);
}

/**
 * Änderung des Längstempos durch Gas, Bremse und Ausrollen in diesem Tick.
 * @param {Koloss} k
 * @param {number} laengs  aktuelles Längstempo (µm/Tick)
 * @param {number} zug     Prozent Schub, die auf den Boden kommen
 * @param {number} bremsen Prozent Bremswirkung
 * @returns {number} Tempo-Änderung (µm/Tick)
 */
function laengsBeschleunigung(k, laengs, zug, bremsen) {
  const gas = k.antrieb;
  if (gas > 0) {
    return teile(teile(SCHUB[k.druck] * gas, EINGABE_MAX) * zug, 100);
  }
  if (gas < 0 && laengs > 0) {
    // S während der Vorwärtsfahrt = bremsen, aber nie über den Stillstand hinaus.
    const b = teile(teile(BREMSE * -gas, EINGABE_MAX) * bremsen, 100);
    return -Math.min(b, laengs);
  }
  if (gas < 0) {
    // Rückwärts nur mit Druck im Kessel.
    return k.druck > 0 ? teile(teile(SCHUB_RUECKWAERTS * gas, EINGABE_MAX) * zug, 100) : 0;
  }
  // Kein Gas: ausrollen, ebenfalls nie über den Stillstand hinaus.
  const r = teile(ROLLEN * bremsen, 100);
  if (laengs > 0) return -Math.min(r, laengs);
  if (laengs < 0) return Math.min(r, -laengs);
  return 0;
}
