// @ts-check
/**
 * zeichnen.js — Zeichnet ein ganzes Bild: Boden, Ruß, Spuren, Schneetreiben, Kolosse, Rauch.
 *
 * ZWECK:    Reihenfolge der Ebenen an einer Stelle. Einzelne Ebenen stehen in eigenen Dateien.
 * LIEST:    Spiel (Zustand über die Verbindung, Überblendung), Kamera
 * SCHREIBT: nur das Canvas und die Optik-Listen in render/
 * REGEL:    CLAUDE.md Regel 1 (Darstellung liest nur)
 */

import { kamera, kameraAktualisieren } from './kamera.js';
import { bodenZeichnen } from './boden.js';
import { kolossZeichnen, schornsteinPos, radEinschlagAktualisieren } from './koloss.js';
import { optikAktualisieren, optikBewegen, spurenZeichnen, russZeichnen } from './spuren.js';
import { rauchZeichnen } from './rauch.js';
import { windVektor, schneetreibenAktualisieren, schneetreibenZeichnen } from './wind.js';
import { lageZumZeichnen } from '../game/spiel.js';
import { kolossVon } from '../sim/abfragen.js';
import { DRUCKSTUFEN, EINGABE_MAX } from '../data/koloss.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Spiel} spiel
 * @param {number} dtMs
 */
export function bildZeichnen(ctx, spiel, dtMs) {
  const v = spiel.verbindung;
  const s = v.zustand();
  const eigener = kolossVon(s, v.spieler);
  // Optik läuft mit der Spielzeit: bei Pause steht der Rauch still, bei 4× fliegt er schneller.
  const optikDt = v.pausiert() ? 0 : dtMs * v.tempo();
  const wind = windVektor(s.wetter);

  const lagen = s.kolosse.map((k) => lageZumZeichnen(spiel, k));
  kameraAktualisieren(dtMs, eigener ? lagen[eigener.id] : null);

  /** @type {number[]} */
  const wege = s.kolosse.map((k, i) => {
    const druckAnteil = k.druck / (DRUCKSTUFEN.length - 1);
    // antrieb statt gas: Auch mit „Tempo halten“ (ohne W) arbeitet die Maschine sichtbar.
    const staerke = druckAnteil * (0.25 + 0.75 * Math.max(0, k.antrieb) / EINGABE_MAX);
    return optikAktualisieren(k.id, lagen[i], schornsteinPos(lagen[i]), staerke, druckAnteil, wind, optikDt);
  });
  optikBewegen(wind, optikDt);
  schneetreibenAktualisieren(s.wetter, optikDt);

  ctx.clearRect(0, 0, kamera.breite, kamera.hoehe);
  bodenZeichnen(ctx);
  russZeichnen(ctx);
  spurenZeichnen(ctx);
  schneetreibenZeichnen(ctx);
  s.kolosse.forEach((k, i) => {
    const lenk = radEinschlagAktualisieren(k.id, k.lenkung, optikDt);
    kolossZeichnen(ctx, lagen[i], wege[i], k.besitzer === v.spieler, lenk);
  });
  rauchZeichnen(ctx);
}
