// @ts-check
/**
 * zeichnen.js — Zeichnet ein ganzes Bild: Boden, Ruß, Spuren, Siedlungen, Fundstellen, Schneetreiben, Lichtkegel,
 *               Kolosse, Rauch, Dunkelheit, Siedlungslichter, Ladebalken/Markierung der Fundstellen.
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
import { fundstellenZeichnen } from './fundstellen.js';
import { fundMarkenZeichnen } from './fund-marken.js';
import { wracksZeichnen } from './wracks.js';
import { siedlungenZeichnen } from './siedlungen.js';
import { siedlungsLichterZeichnen } from './siedlungs-lichter.js';
import { windVektor, schneetreibenAktualisieren, schneetreibenZeichnen } from './wind.js';
import { lageZumZeichnen } from '../game/spiel.js';
import { kolossVon } from '../sim/abfragen.js';
import { DRUCKSTUFEN, EINGABE_MAX, BRENNSTOFFE } from '../data/koloss.js';
import { BRENNSTOFFLAGER } from '../data/fundstellen.js';
import { lagerMenge } from '../sim/koloss/lager.js';
import { NACHT_MAX } from '../data/ansicht.js';
import { ansichtLicht } from './licht.js';
import { dunkelheit } from '../sim/wetter/tag.js';

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
  // Tageszeit → Dunkelheit (M4a); eine Vorgabe aus der Konsole (ek.nacht) geht vor.
  ansichtLicht.nacht = ansichtLicht.vorgabe ?? (dunkelheit(s.tick) / 1000) * NACHT_MAX;

  // lagen = Drehpunkte (Zustand, für die Spuren), rumpfe = Rumpfmitten (alles Gezeichnete).
  const lagen = s.kolosse.map((k) => lageZumZeichnen(spiel, k));
  const rumpfe = lagen.map(rumpfLage);
  kameraAktualisieren(dtMs, eigener ? rumpfe[eigener.id] : null);

  // Last je Koloss (0 … 1): antrieb statt gas — der Telegraf regelt, die Maschine arbeitet sichtbar.
  // Rauch kommt vom Feuer (Spieltest M4a): Feuerstufe, solange Brennstoff da ist.
  const feuer = s.kolosse.map((k) => (lagerMenge(k, BRENNSTOFFLAGER, BRENNSTOFFE[k.brennstoff].ware) > 0 ? k.druck : 0));
  const lasten = s.kolosse.map((k, i) => (feuer[i] / (DRUCKSTUFEN.length - 1)) * (0.25 + 0.75 * Math.max(0, k.antrieb) / EINGABE_MAX));
  /** @type {number[]} */
  const wege = s.kolosse.map((k, i) => {
    const druckAnteil = feuer[i] / (DRUCKSTUFEN.length - 1);
    return optikAktualisieren(k.id, lagen[i], schornsteinPos(rumpfe[i]), lasten[i], druckAnteil, wind, optikDt, rumpfe[i]);
  });
  optikBewegen(wind, optikDt);
  schneetreibenAktualisieren(s.wetter, optikDt);

  ctx.clearRect(0, 0, kamera.breite, kamera.hoehe);
  bodenZeichnen(ctx, s.seed);
  schmutzZeichnen(ctx);
  spurenZeichnen(ctx);
  siedlungenZeichnen(ctx, s, v.spieler);
  fundstellenZeichnen(ctx, s);
  wracksZeichnen(ctx, s);
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
  siedlungsLichterZeichnen(ctx);
  // Ladebalken und Maus-Markierung über der Dunkelheit — man soll sie auch nachts sehen.
  fundMarkenZeichnen(ctx, s, v.spieler, eigener ? rumpfe[eigener.id] : null);
}
