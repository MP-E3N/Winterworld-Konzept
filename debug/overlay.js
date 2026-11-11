// @ts-check
/**
 * overlay.js — Debug-Anzeige oben rechts (Taste F3).
 *
 * ZWECK:    Messwerte, die man beim Testen ständig braucht: Tick, Bilder/s, Rechenzeit, Hash,
 *           Lage und Tempo des eigenen Kolosses (längs/quer), Untergrund, Zoom.
 * LIEST:    das laufende Spiel, die Kamera
 * SCHREIBT: DOM-Element #debug
 * DEBUG:    —  (das hier IST das Debug-Werkzeug)
 */

import { zustandsHash } from '../sim/lib/hash.js';
import { kolossVon, laengsTempo, querTempo, alsKmh, alsMeter } from '../sim/abfragen.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { kamera } from '../render/kamera.js';
import { ladungKg } from '../sim/koloss/lager.js';
import { uhrzeit, tagNummer, dunkelheit } from '../sim/wetter/tag.js';
import { optikZahlen } from '../render/spuren.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/** Hash nur alle 500 ms neu berechnen. */
const HASH_INTERVALL_MS = 500;

let sichtbar = false;
let fps = 60;
let hashText = '';
let seitHash = HASH_INTERVALL_MS;

/**
 * @param {HTMLElement} el
 */
export function overlayEinrichten(el) {
  window.addEventListener('keydown', (ev) => {
    if (ev.code !== 'F3') return;
    ev.preventDefault(); // F3 ist im Browser sonst „Suchen“
    sichtbar = !sichtbar;
    el.hidden = !sichtbar;
    seitHash = HASH_INTERVALL_MS;
  });
}

/**
 * @param {HTMLElement} el
 * @param {Spiel} spiel
 * @param {number} dtMs
 */
export function overlayAktualisieren(el, spiel, dtMs) {
  if (dtMs > 0) fps = fps * 0.9 + (1000 / dtMs) * 0.1;
  if (!sichtbar) return;
  const v = spiel.verbindung;
  const s = v.zustand();
  seitHash += dtMs;
  if (seitHash >= HASH_INTERVALL_MS) { hashText = zustandsHash(s); seitHash = 0; }
  const k = kolossVon(s, v.spieler);
  const o = optikZahlen();
  el.textContent = [
    `Tick      ${s.tick}  (Seed ${s.seed})`,
    `Hash      ${hashText}`,
    `Bilder/s  ${fps.toFixed(0)}   ms/Tick ${spiel.msProTick.toFixed(3)}   α ${spiel.alpha.toFixed(2)}`,
    k ? `Lage      ${alsMeter(k.x).toFixed(1)} / ${alsMeter(k.y).toFixed(1)} m   ${((k.h / 65536) * 360).toFixed(1)}°` : 'kein Koloss',
    k ? `Tempo     längs ${alsKmh(laengsTempo(k)).toFixed(2)}  quer ${alsKmh(querTempo(k)).toFixed(2)} km/h` : '',
    k ? `Eingabe   Gas ${k.gas}  Lenkung ${k.lenkung}  Drehung ${k.dreh}` : '',
    k ? `Boden     ${UNTERGRUND[untergrundAn(s.seed, k.x, k.y)].name}` : '',
    `Kamera    ${kamera.zoom.toFixed(2)} px/m  ${kamera.folgen ? 'folgt' : 'frei'}`,
    `Optik     ${o.spurpunkte} Spurpunkte, ${o.russ} Ruß, ${o.teilchen} Teilchen`,
    `Wind      ${(s.wetter.windStaerke / 10).toFixed(1)} m/s → ${((s.wetter.windRichtung / 65536) * 360).toFixed(0)}°  (Ziel ${((s.wetter.zielRichtung / 65536) * 360).toFixed(0)}°, Wechsel bei Tick ${s.wetter.naechsterWechsel})`,
    k ? `Trupp     Fund ${s.trupps[k.trupp].fund}  Fortschritt ${s.trupps[k.trupp].fortschritt}  Abwurf ${s.trupps[k.trupp].abwurf}  Ladung ${(ladungKg(k) / 1000).toFixed(1)} t` : '',
    k ? `Kessel    Feuer ${k.druck}  Dampf ${k.dampf}  Glut ${Math.floor(k.feuerMg / 1000)} g  Heizung ${k.heizung}  Brennstoff ${k.brennstoff}  an Bord ${(k.waerme / 10).toFixed(1)} °C` : '',
    k ? `Crew      Heizer ${k.crew.heizer}  Arbeiter ${k.crew.arbeiter}  satt ${(k.crew.satt / 10000).toFixed(1)} %  gesund ${(k.crew.gesundheit / 10000).toFixed(1)} %  Moral ${(k.crew.moral / 10000).toFixed(1)} %  Tote ${k.crew.tote}  Vorräte ${k.lager.waren.nahrung} kg` : '',
    `Uhr       Tag ${tagNummer(s.tick)}  ${Math.floor(uhrzeit(s.tick) / 60)}:${String(uhrzeit(s.tick) % 60).padStart(2, '0')}  Dunkel ${dunkelheit(s.tick)}`,
    `Befehle   ${v.protokoll().length} aufgezeichnet`,
  ].join('\n');
}
