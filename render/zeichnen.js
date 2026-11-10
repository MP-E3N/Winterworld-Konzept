// @ts-check
/**
 * zeichnen.js — Zeichnet ein ganzes Bild: Boden, Ruß, Spuren, Fundstellen, Schneetreiben, Lichtkegel,
 *               Kolosse, Rauch, Dunkelheit, Ladebalken/Markierung der Fundstellen.
 *
 * ZWECK:    Reihenfolge der Ebenen an einer Stelle. Einzelne Ebenen stehen in eigenen Dateien.
 * LIEST:    Spiel (Zustand über die Verbindung, Überblendung), Kamera
 * SCHREIBT: nur das Canvas und die Optik-Listen in render/
 * REGEL:    CLAUDE.md Regel 1 (Darstellung liest nur)
 */

import { kamera, kameraAktualisieren } from './kamera.js';
import { bodenZeichnen } from './boden.js';
import { kolossZeichnen, schornsteinPos, radEinschlagAktualisieren, feuerscheinZeichnen } from './koloss.js';
import { rumpfLage } from './koloss-mass.js';
import { lichtkegelZeichnen, dunkelheitZeichnen } from './licht.js';
import { optikAktualisieren, optikBewegen, spurenZeichnen } from './spuren.js';
import { schmutzZeichnen } from './schmutz.js';
import { rauchZeichnen } from './rauch.js';
import { funkenZeichnen } from './funken.js';
import { fundstellenZeichnen, fundMarkenZeichnen } from './fundstellen.js';
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

  // lagen = Drehpunkte (Zustand, für die Spuren), rumpfe = Rumpfmitten (alles Gezeichnete).
  const lagen = s.kolosse.map((k) => lageZumZeichnen(spiel, k));
  const rumpfe = lagen.map(rumpfLage);
  kameraAktualisieren(dtMs, eigener ? rumpfe[eigener.id] : null);

  // Last je Koloss (0 … 1): antrieb statt gas — der Telegraf regelt, die Maschine arbeitet sichtbar.
  const lasten = s.kolosse.map((k) => (k.druck / (DRUCKSTUFEN.length - 1)) * (0.25 + 0.75 * Math.max(0, k.antrieb) / EINGABE_MAX));
  /** @type {number[]} */
  const wege = s.kolosse.map((k, i) => {
    const druckAnteil = k.druck / (DRUCKSTUFEN.length - 1);
    return optikAktualisieren(k.id, lagen[i], schornsteinPos(rumpfe[i]), lasten[i], druckAnteil, wind, optikDt, rumpfe[i]);
  });
  optikBewegen(wind, optikDt);
  schneetreibenAktualisieren(s.wetter, optikDt);

  ctx.clearRect(0, 0, kamera.breite, kamera.hoehe);
  bodenZeichnen(ctx, s.seed);
  schmutzZeichnen(ctx);
  spurenZeichnen(ctx);
  fundstellenZeichnen(ctx, s);
  schneetreibenZeichnen(ctx);
  const mitLicht = rumpfe.filter((_, i) => s.kolosse[i].licht === 1);
  lichtkegelZeichnen(ctx, mitLicht);
  s.kolosse.forEach((k, i) => {
    const lenk = radEinschlagAktualisieren(k.id, k.lenkung, optikDt);
    kolossZeichnen(ctx, rumpfe[i], wege[i], k.besitzer === v.spieler, lenk, k.licht === 1, lasten[i]);
  });
  rauchZeichnen(ctx);
  funkenZeichnen(ctx);
  rumpfe.forEach((r, i) => feuerscheinZeichnen(ctx, r, lasten[i]));
  dunkelheitZeichnen(ctx, rumpfe, mitLicht);
  // Ladebalken und Maus-Markierung über der Dunkelheit — man soll sie auch nachts sehen.
  fundMarkenZeichnen(ctx, s, v.spieler, eigener ? rumpfe[eigener.id] : null);
}
