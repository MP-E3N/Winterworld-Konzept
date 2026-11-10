// @ts-check
/**
 * anzeige.js — Anzeigen am Bildrand: Tempo, Dampfmaschine, Kesseldruck, Maschinentelegraf, Wind,
 *              Boden, Laderaum (M3), Trupp, Brennstoff-Wahlschalter, Kälte, Uhr (M4a), Maßstab.
 *
 * ZWECK:    Das Nötigste zum Fahren, schlicht (Nutzerwunsch aus Kronwege: keine Extra-Fenster,
 *           Bedienhinweise nur hinter „?“).
 * LIEST:    eigener Koloss (auch Ladung und Trupp), Wetter, Verbindung (Pause/Tempo), Kamera, gefahrene Meter
 * SCHREIBT: nur DOM-Elemente in #hud
 * REGEL:    „Aufbauen + Aktualisieren“: Elemente einmal bauen, danach nur Texte setzen.
 */

import { kolossVon, laengsTempo, alsKmh, truppVon } from '../sim/abfragen.js';
import { lagerKg, lagerMenge } from '../sim/koloss/lager.js';
import { truppZiel } from '../sim/bergen.js';
import { ofenEinrichten, ofenZeichnen } from './ofen.js';
import { LAGER, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { tonnen } from '../render/fundstellen.js';
import { aussenTemperatur } from '../sim/abfragen.js';
import { uhrzeit, tagNummer, dunkelheit } from '../sim/wetter/tag.js';
import { BRENNSTOFFE, DAMPF_JE_STUFE } from '../data/koloss.js';
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
/** @type {HTMLCanvasElement} */
let ofen;
/** Knöpfe des Brennstoff-Wahlschalters (Index = Brennstoff). @type {HTMLElement[]} */
let wahlknoepfe = [];

/**
 * Baut die Anzeige einmal auf.
 * @param {HTMLElement} hud
 * @param {{telegraf: (stufe: number) => void, licht: () => void, heizung: () => void, brennstoff: (wahl: number) => void}} aktionen  aus eingabe/tastatur.js
 */
export function anzeigeAufbauen(hud, aktionen) {
  hud.innerHTML = `
    <div class="tafel links-unten">
      <div class="tempo"><span id="a-tempo">0</span><small> km/h</small></div>
      <canvas id="a-maschine" title="Kessel: Glut und Manometer zeigen den Druck, Kolben und Schwungrad laufen mit den Rädern"></canvas>
      <div class="zeile"><span class="beschr">Kessel</span><span id="a-druck"></span>
        <span class="wahl" title="Brennstoff (B): Die Heizer verfeuern nur diesen. Ist er alle, geht das Feuer aus.">${BRENNSTOFFE.map((b, i) => `<button data-wahl="${i}" tabindex="-1">${b.name}</button>`).join('')}</span></div>
      <canvas id="a-telegraf" title="Maschinentelegraf: W/S oder Klick stellen den Hebel, die Maschine hält das Tempo. Der kleine Kupferzeiger zeigt das echte Tempo."></canvas>
      <div id="a-befehl" class="schild"></div>
      <div class="zeile"><span class="beschr">Licht</span>
        <button id="a-licht" class="lampe" tabindex="-1" title="Scheinwerfer an/aus (L)"><canvas id="a-lampe"></canvas></button>
        <span class="beschr rechts">Heizung</span>
        <button id="a-heizung" class="lampe" tabindex="-1" title="Heizung an Bord an/aus (O) — wärmt, kostet Brennstoff"><canvas id="a-ofen"></canvas></button></div>
      <div class="zeile"><span class="beschr">Wind</span><span id="a-windpfeil" class="windpfeil">➜</span><span id="a-wind"></span></div>
      <div class="zeile"><span class="beschr">Boden</span><span id="a-boden"></span></div>
      <div class="zeile"><span class="beschr">Kälte</span><span id="a-kaelte"></span></div>
      <div class="zeile" title="Brennstofflager (Kohle, Holz, Öl). Klick auf den Koloss oder I öffnet die Lager."><span class="beschr">Brennst.</span>
        <span class="ladebalken"><span id="a-fuell-0"></span></span><span id="a-lager-0" class="lagerzahl"></span></div>
      <div class="zeile" title="Warenlager (Vorräte, Holz als Baustoff). Klick auf den Koloss oder I öffnet die Lager."><span class="beschr">Waren</span>
        <span class="ladebalken"><span id="a-fuell-1"></span></span><span id="a-lager-1" class="lagerzahl"></span></div>
      <div class="zeile"><span class="beschr">Trupp</span><span id="a-trupp"></span></div>
    </div>
    <div class="tafel rechts-unten"><div id="a-uhr" class="uhr"></div><div id="a-mass" class="mass"></div><div id="a-masstext"></div></div>
    <div id="a-status" class="status"></div>`;
  const ids = ['a-tempo', 'a-druck', 'a-befehl', 'a-licht', 'a-windpfeil', 'a-wind', 'a-boden', 'a-mass', 'a-masstext', 'a-status',
    'a-fuell-0', 'a-fuell-1', 'a-lager-0', 'a-lager-1', 'a-trupp', 'a-kaelte', 'a-uhr', 'a-heizung'];
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
  ofen = /** @type {HTMLCanvasElement} */ (hud.querySelector('#a-ofen'));
  ofenEinrichten(ofen);
  el['a-heizung'].addEventListener('click', () => { aktionen.heizung(); el['a-heizung'].blur(); });
  wahlknoepfe = [...hud.querySelectorAll('.wahl button')].map((b) => /** @type {HTMLElement} */ (b));
  wahlknoepfe.forEach((b, i) => b.addEventListener('click', () => { aktionen.brennstoff(i); b.blur(); }));
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
    const brennt = lagerMenge(k, BRENNSTOFFLAGER, BRENNSTOFFE[k.brennstoff].ware) > 0;
    ofenZeichnen(ofen, k.heizung === 1 && brennt, v.pausiert() ? 0 : dtMs);
    el['a-boden'].textContent = UNTERGRUND[untergrundAn(s.seed, k.x, k.y)].name;
    const wind = windVektor(s.wetter);
    // Pfeil zeigt, wohin der Wind weht (Norden = oben, wie auf der Karte).
    el['a-windpfeil'].style.transform = `rotate(${wind.rad}rad)`;
    el['a-wind'].textContent = `${wind.ms.toFixed(0)} m/s · ${windRelativ(s.wetter, (k.h / 65536) * 2 * Math.PI)}`;
    dampfmaschineZeichnen(maschine, {
      druck: k.dampf / DAMPF_JE_STUFE, druckMax: DRUCKSTUFEN.length - 1, gas: k.antrieb / EINGABE_MAX, // Dampfvorrat (M4a)
      weg: wegVon(k.id), dtMs: v.pausiert() ? 0 : dtMs,
    });
    laderaum(s, k);
    kesselUndKaelte(s, k);
  }
  uhr(s.tick);
  massstab();
  const status = v.pausiert() ? 'PAUSE' : v.tempo() > 1 ? `Tempo ${v.tempo()}×` : '';
  el['a-status'].textContent = status;
  el['a-status'].hidden = status === '';
}

/**
 * Zwei Lager und Trupp (Spieltest M4a). Texte nur setzen, wenn sie sich ändern.
 * @param {import('../sim/types.js').Zustand} s
 * @param {import('../sim/types.js').Koloss} k
 */
function laderaum(s, k) {
  for (const lager of [BRENNSTOFFLAGER, WARENLAGER]) {
    const kg = lagerKg(k, lager);
    setzen('a-lager-' + lager, `${tonnen(kg)} / ${LAGER[lager].kg / 1000} t`);
    el['a-fuell-' + lager].style.width = `${(100 * kg) / LAGER[lager].kg}%`;
  }
  const t = truppVon(s, k);
  const z = truppZiel(s, t);
  setzen('a-trupp', z ? `birgt ${zielName(z.ware, t.abwurf >= 0)} · ${t.leute} Mann` : `an Bord · ${t.leute} Mann`);
}

/** @param {string} ware @param {boolean} abwurf */
function zielName(ware, abwurf) {
  const name = { kohle: 'Kohle', holz: 'Holz', oel: 'Öl', nahrung: 'Vorräte' }[ware] ?? ware;
  return abwurf ? `abgeworfenes ${name}` : name;
}

/**
 * Brennstoff-Wahlschalter und Temperaturen (M4a).
 * @param {import('../sim/types.js').Zustand} s
 * @param {import('../sim/types.js').Koloss} k
 */
function kesselUndKaelte(s, k) {
  wahlknoepfe.forEach((b, i) => {
    b.classList.toggle('an', i === k.brennstoff);
    // Leerer Brennstoff: Knopf wirkt matt (kein Text, Nutzerwunsch: keine Warntexte).
    b.classList.toggle('leer', lagerMenge(k, BRENNSTOFFLAGER, BRENNSTOFFE[i].ware) === 0);
  });
  setzen('a-kaelte', `außen ${grad(aussenTemperatur(s, k))} · an Bord ${grad(k.waerme)}`);
}

/** Zehntel °C → „−23 °C“. @param {number} zehntel */
function grad(zehntel) {
  const g = Math.round(zehntel / 10);
  return `${g < 0 ? '−' : ''}${Math.abs(g)} °C`;
}

/** Uhr unten rechts: Sonne oder Mond, Tag und Uhrzeit. @param {number} tick */
function uhr(tick) {
  const m = uhrzeit(tick);
  const zeit = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  setzen('a-uhr', `${dunkelheit(tick) > 500 ? '☾' : '☀'} Tag ${tagNummer(tick)} · ${zeit}`);
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
