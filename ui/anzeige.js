// @ts-check
/**
 * anzeige.js — Anzeigen am Bildrand: Tempo, Dampfmaschine, Kesseldruck, Maschinentelegraf, Wind,
 *              Boden, Laderaum (M3), Trupp, Maßstab.
 *
 * ZWECK:    Das Nötigste zum Fahren, schlicht (Nutzerwunsch aus Kronwege: keine Extra-Fenster,
 *           Bedienhinweise nur hinter „?“).
 * LIEST:    eigener Koloss (auch Ladung und Trupp), Wetter, Verbindung (Pause/Tempo), Kamera, gefahrene Meter
 * SCHREIBT: nur DOM-Elemente in #hud
 * REGEL:    „Aufbauen + Aktualisieren“: Elemente einmal bauen, danach nur Texte setzen.
 */

import { kolossVon, laengsTempo, alsKmh, kesselUeberlastet, ladungKg, truppVon } from '../sim/abfragen.js';
import { fundstelleMitId } from '../sim/welt/fundstellen.js';
import { WAREN, FUNDARTEN, LADERAUM_KG } from '../data/fundstellen.js';
import { tonnen } from '../render/fundstellen.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { DRUCKSTUFEN, EINGABE_MAX, TELEGRAF } from '../data/koloss.js';
import { kamera } from '../render/kamera.js';
import { wegVon } from '../render/spuren.js';
import { windVektor, windRelativ } from '../render/wind.js';
import { dampfmaschineEinrichten, dampfmaschineZeichnen } from './dampfmaschine.js';
import { telegrafEinrichten, telegrafZeichnen } from './telegraf.js';
import { lampeEinrichten, lampeZeichnen } from './lampe.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/** @type {Record<string, HTMLElement>} */
const el = {};
/** @type {HTMLCanvasElement} */
let maschine;
/** @type {HTMLCanvasElement} */
let telegraf;
/** @type {HTMLCanvasElement} */
let lampe;

/**
 * Baut die Anzeige einmal auf.
 * @param {HTMLElement} hud
 * @param {{telegraf: (stufe: number) => void, licht: () => void}} aktionen  aus eingabe/tastatur.js
 */
export function anzeigeAufbauen(hud, aktionen) {
  hud.innerHTML = `
    <div class="tafel links-unten">
      <div class="tempo"><span id="a-tempo">0</span><small> km/h</small></div>
      <canvas id="a-maschine" title="Kessel: Glut und Manometer zeigen den Druck, Kolben und Schwungrad laufen mit den Rädern"></canvas>
      <div class="zeile"><span class="beschr">Kessel</span><span id="a-druck"></span></div>
      <canvas id="a-telegraf" title="Maschinentelegraf: W/S oder Klick stellen den Hebel, die Maschine hält das Tempo. Der kleine Kupferzeiger zeigt das echte Tempo."></canvas>
      <div id="a-befehl" class="schild"></div>
      <div class="zeile"><span class="beschr">Licht</span>
        <button id="a-licht" class="lampe" tabindex="-1" title="Scheinwerfer an/aus (L)"><canvas id="a-lampe"></canvas></button></div>
      <div class="zeile"><span class="beschr">Wind</span><span id="a-windpfeil" class="windpfeil">➜</span><span id="a-wind"></span></div>
      <div class="zeile"><span class="beschr">Boden</span><span id="a-boden"></span></div>
      <div class="zeile" title="Laderaum: Linksklick auf eine Fundstelle in Reichweite schickt den Trupp (nur im Stand). Ladung macht den Koloss träger."><span class="beschr">Ladung</span>
        <span class="ladebalken"><span id="a-ladefuell"></span></span><span id="a-ladung"></span></div>
      <div class="waren">${WAREN.map((w) => `<span class="ware"><i style="background:${w.farbe}"></i>${w.name} <b id="a-ware-${w.ware}"></b></span>`).join('')}</div>
      <div class="zeile"><span class="beschr">Trupp</span><span id="a-trupp"></span></div>
    </div>
    <div class="tafel rechts-unten"><div id="a-mass" class="mass"></div><div id="a-masstext"></div></div>
    <div id="a-status" class="status"></div>`;
  const ids = ['a-tempo', 'a-druck', 'a-befehl', 'a-licht', 'a-windpfeil', 'a-wind', 'a-boden', 'a-mass', 'a-masstext', 'a-status',
    'a-ladefuell', 'a-ladung', 'a-trupp', ...WAREN.map((w) => 'a-ware-' + w.ware)];
  for (const id of ids) {
    el[id] = /** @type {HTMLElement} */ (hud.querySelector('#' + id));
  }
  maschine = /** @type {HTMLCanvasElement} */ (hud.querySelector('#a-maschine'));
  telegraf = /** @type {HTMLCanvasElement} */ (hud.querySelector('#a-telegraf'));
  dampfmaschineEinrichten(maschine);
  telegrafEinrichten(telegraf, aktionen.telegraf);
  lampe = /** @type {HTMLCanvasElement} */ (hud.querySelector('#a-lampe'));
  lampeEinrichten(lampe);
  // blur(): sonst behält der Schalter den Fokus, und die Leertaste würde ihn erneut auslösen.
  el['a-licht'].addEventListener('click', () => { aktionen.licht(); el['a-licht'].blur(); });
}

/**
 * Setzt die aktuellen Werte (jedes Bild).
 * @param {Spiel} spiel
 * @param {number} dtMs
 */
export function anzeigeAktualisieren(spiel, dtMs) {
  const v = spiel.verbindung;
  const s = v.zustand();
  const k = kolossVon(s, v.spieler);
  if (k) {
    el['a-tempo'].textContent = Math.abs(alsKmh(laengsTempo(k))).toFixed(0);
    el['a-druck'].textContent = DRUCKSTUFEN[k.druck].name;
    const kmh = alsKmh(laengsTempo(k));
    telegrafZeichnen(telegraf, { stufe: k.telegraf, kmh, dtMs });
    const t = TELEGRAF[k.telegraf];
    const befehl = t.kmh === 0 ? t.name.toUpperCase() : `${t.name.toUpperCase()} · ${Math.abs(t.kmh)} km/h`;
    if (el['a-befehl'].textContent !== befehl) el['a-befehl'].textContent = befehl;
    lampeZeichnen(lampe, k.licht === 1, v.pausiert() ? 0 : dtMs);
    el['a-boden'].textContent = UNTERGRUND[untergrundAn(s.seed, k.x, k.y)].name;
    const wind = windVektor(s.wetter);
    // Pfeil zeigt, wohin der Wind weht (Norden = oben, wie auf der Karte).
    el['a-windpfeil'].style.transform = `rotate(${wind.rad}rad)`;
    el['a-wind'].textContent = `${wind.ms.toFixed(0)} m/s · ${windRelativ(s.wetter, (k.h / 65536) * 2 * Math.PI)}`;
    dampfmaschineZeichnen(maschine, {
      druck: k.druck, druckMax: DRUCKSTUFEN.length - 1, gas: k.antrieb / EINGABE_MAX,
      // Überlast: Der Telegraf will schneller, als der Kessel auf diesem Boden schafft.
      ueberlast: kesselUeberlastet(s.seed, k),
      weg: wegVon(k.id), dtMs: v.pausiert() ? 0 : dtMs,
    });
    laderaum(s, k);
  }
  massstab();
  const status = v.pausiert() ? 'PAUSE' : v.tempo() > 1 ? `Tempo ${v.tempo()}×` : '';
  el['a-status'].textContent = status;
  el['a-status'].hidden = status === '';
}

/**
 * Laderaum und Trupp (M3). Texte nur setzen, wenn sie sich ändern.
 * @param {import('../sim/types.js').Zustand} s
 * @param {import('../sim/types.js').Koloss} k
 */
function laderaum(s, k) {
  const kg = ladungKg(k);
  setzen('a-ladung', `${tonnen(kg)} / ${LADERAUM_KG / 1000} t`);
  el['a-ladefuell'].style.width = `${(100 * kg) / LADERAUM_KG}%`;
  for (const w of WAREN) {
    setzen('a-ware-' + w.ware, tonnen(k.ladung[w.ware]).replace(' t', ''));
    el['a-ware-' + w.ware].parentElement?.classList.toggle('leer', k.ladung[w.ware] === 0);
  }
  const t = truppVon(s, k);
  const f = t.fund >= 0 ? fundstelleMitId(s.seed, t.fund) : null;
  setzen('a-trupp', f ? `birgt ${FUNDARTEN[f.art].name} · ${t.leute} Mann` : `an Bord · ${t.leute} Mann`);
}

/** @param {string} id @param {string} text */
function setzen(id, text) {
  if (el[id].textContent !== text) el[id].textContent = text;
}

/** Maßstabsbalken: runde Länge (1-2-5-Reihe), die 60–150 Bildpunkte breit ist. */
function massstab() {
  const ziel = 100 / kamera.zoom; // Meter auf 100 Bildpunkten
  const stufe = Math.pow(10, Math.floor(Math.log10(ziel)));
  const meter = [1, 2, 5, 10].map((f) => f * stufe).find((m) => m * kamera.zoom >= 60) ?? stufe * 10;
  el['a-mass'].style.width = `${Math.round(meter * kamera.zoom)}px`;
  el['a-masstext'].textContent = meter >= 1000 ? `${meter / 1000} km` : `${meter} m`;
}
