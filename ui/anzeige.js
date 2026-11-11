// @ts-check
/**
 * anzeige.js — Anzeigen am Bildrand: Tempo, Dampfmaschine, Kesseldruck, Maschinentelegraf, Wind,
 *              Boden, Laderaum (M3), Crew (M4b), Meldung beim Liegenbleiben (M4c), Trupp, Brennstoff-Wahlschalter, Kälte, Uhr (M4a), Maßstab.
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
import { kranke } from '../sim/koloss/crew.js';
import { ofenEinrichten, ofenZeichnen } from './ofen.js';
import { LAGER, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { tonnen } from '../render/fundstellen.js';
import { aussenTemperatur } from '../sim/abfragen.js';
import { uhrzeit, tagNummer, dunkelheit } from '../sim/wetter/tag.js';
import { BRENNSTOFFE, DAMPF_JE_STUFE, DAMPF_MAX } from '../data/koloss.js';
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
      <canvas id="a-maschine" title="Feuer-Zeiger (oben, Q/E): wie stark angeheizt wird = wie schnell der Druck steigt. Manometer: Dampfvorrat in Prozent — auf jeder Feuerstufe wird der Kessel voll, nur verschieden schnell. Kolben und Schwungrad laufen mit den Rädern."></canvas>
      <div class="zeile"><span class="beschr">Kessel</span><span id="a-druck"></span>
        <span class="wahl" title="Brennstoff (B): Die Heizer verfeuern nur diesen. Ist er alle, geht das Feuer aus.">${BRENNSTOFFE.map((b, i) => `<button data-wahl="${i}" tabindex="-1">${b.name}</button>`).join('')}</span></div>
      <canvas id="a-telegraf" title="Maschinentelegraf: W/S oder Klick stellen den Hebel, die Maschine hält das Tempo. Der kleine Kupferzeiger zeigt das echte Tempo."></canvas>
      <div id="a-befehl" class="schild"></div>
      <div class="zeile"><span class="beschr">Licht</span>
        <button id="a-licht" class="lampe" tabindex="-1" title="Scheinwerfer an/aus (L)"><canvas id="a-lampe"></canvas></button>
        <span class="beschr rechts">Heizung</span>
        <button id="a-heizung" class="lampe" tabindex="-1" title="Heizung an Bord an/aus (O) — hält +23 °C; je kälter draußen, desto mehr Brennstoff"><canvas id="a-ofen"></canvas></button></div>
      <div class="zeile"><span class="beschr">Wind</span><span id="a-windpfeil" class="windpfeil">➜</span><span id="a-wind"></span></div>
      <div class="zeile"><span class="beschr">Boden</span><span id="a-boden"></span></div>
      <div class="zeile"><span class="beschr">Kälte</span><span id="a-kaelte"></span></div>
      <div class="zeile" title="Brennstofflager (Kohle, Holz, Öl). Klick auf den Koloss oder I öffnet die Lager."><span class="beschr">Brennst.</span>
        <span class="ladebalken"><span id="a-fuell-0"></span></span><span id="a-lager-0" class="lagerzahl"></span></div>
      <div class="zeile" title="Warenlager (Vorräte, Holz als Baustoff). Klick auf den Koloss oder I öffnet die Lager."><span class="beschr">Waren</span>
        <span class="ladebalken"><span id="a-fuell-1"></span></span><span id="a-lager-1" class="lagerzahl"></span></div>
      <div class="zeile" title="Crew (M4b): Kälte unter 0 °C an Bord und Hunger machen krank, Kranke arbeiten nicht, unter 25 % Gesundheit sterben Leute."><span class="beschr">Crew</span><span id="a-crew"></span></div>
      <div class="zeile crewwerte"><span class="beschr"></span>
        <span class="mini" title="Sattheit — ohne Vorräte sinkt sie"><small>Satt</small><span class="minibalken"><span id="a-satt" class="satt"></span></span></span>
        <span class="mini" title="Gesundheit — Kälte und Hunger kosten, Wärme und Essen heilen"><small>Gesund</small><span class="minibalken"><span id="a-gesund" class="gesund"></span></span></span>
        <span class="mini" title="Moral — wird noch nur angezeigt"><small>Moral</small><span class="minibalken"><span id="a-moral" class="moral"></span></span></span></div>
      <div class="zeile"><span class="beschr">Trupp</span><span id="a-trupp"></span></div>
    </div>
    <div class="tafel rechts-unten"><div id="a-uhr" class="uhr"></div><div id="a-mass" class="mass"></div><div id="a-masstext"></div></div>
    <div id="a-status" class="status"></div>`;
  const ids = ['a-tempo', 'a-druck', 'a-befehl', 'a-licht', 'a-windpfeil', 'a-wind', 'a-boden', 'a-mass', 'a-masstext', 'a-status',
    'a-fuell-0', 'a-fuell-1', 'a-lager-0', 'a-lager-1', 'a-trupp', 'a-crew', 'a-satt', 'a-gesund', 'a-moral', 'a-kaelte', 'a-uhr', 'a-heizung'];
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
    setzen('a-druck', `${DRUCKSTUFEN[k.druck].name} · ${kesselTrend(k.dampf)}`);
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
      druck: k.dampf / DAMPF_JE_STUFE, druckMax: DRUCKSTUFEN.length - 1, feuer: k.druck, feuerMax: DRUCKSTUFEN.length - 1, gas: k.antrieb / EINGABE_MAX, // Dampfvorrat (M4a)
      weg: wegVon(k.id), dtMs: v.pausiert() ? 0 : dtMs,
    });
    laderaum(s, k);
    kesselUndKaelte(s, k);
  }
  uhr(s.tick);
  massstab();
  const status = v.pausiert() ? 'PAUSE' : liegenMeldung(s, v.spieler, dtMs) || (v.tempo() > 1 ? `Tempo ${v.tempo()}×` : '');
  el['a-status'].textContent = status;
  el['a-status'].hidden = status === '';
}

/** Letzter Dampfvorrat und geglättete Änderung je Bild — nur für den Pfeil in der Kessel-Zeile. */
const trend = { dampf: -1, aenderung: 0 };

/**
 * Druck in Prozent mit Pfeil: ▲ steigt, ▼ fällt, nichts = hält (Spieltest M4a-2).
 * WARUM geglättet: Die Simulation läuft in Ticks, die Bilder dazwischen — ohne Glätten flackert der Pfeil.
 * @param {number} dampf
 * @returns {string}
 */
function kesselTrend(dampf) {
  if (trend.dampf >= 0) trend.aenderung += (dampf - trend.dampf - trend.aenderung) * 0.1;
  trend.dampf = dampf;
  const pfeil = trend.aenderung > 20 ? ' ▲' : trend.aenderung < -20 ? ' ▼' : '';
  return `Druck ${Math.round((100 * dampf) / DAMPF_MAX)} %${pfeil}`;
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
  crew(k.crew);
}

/**
 * Crew-Zeilen (M4b): Anzahl, Kranke, Tote, drei kleine Balken.
 * @param {import('../sim/types.js').Crew} c
 */
function crew(c) {
  const krank = kranke(c.heizer, c) + kranke(c.arbeiter, c);
  setzen('a-crew', `${c.heizer} Heizer · ${c.arbeiter} Arbeiter${krank > 0 ? ` · ${krank} krank` : ''}${c.tote > 0 ? ` · ${c.tote} †` : ''}`);
  for (const [id, wert] of /** @type {[string, number][]} */ ([['a-satt', c.satt], ['a-gesund', c.gesundheit], ['a-moral', c.moral]])) {
    const breite = `${Math.round(wert / 10000)}%`;
    if (el[id].style.width !== breite) el[id].style.width = breite;
  }
}

/** Meldung nach dem Liegenbleiben: wie viele Wracks gab es zuletzt, wie lange steht sie noch (ms). */
const liegen = { wracks: -1, restMs: 0 };

/**
 * Ist der eigene Koloss gerade liegen geblieben? Dann ein paar Sekunden oben eine Meldung (F6).
 * @param {import('../sim/types.js').Zustand} s @param {number} spieler @param {number} dtMs
 * @returns {string}
 */
function liegenMeldung(s, spieler, dtMs) {
  if (liegen.wracks >= 0 && s.wracks.length > liegen.wracks) {
    const w = s.wracks[s.wracks.length - 1];
    if (s.kolosse[w.koloss]?.besitzer === spieler) liegen.restMs = 7000;
  }
  liegen.wracks = s.wracks.length;
  liegen.restMs = Math.max(0, liegen.restMs - dtMs);
  return liegen.restMs > 0 ? 'LIEGENGEBLIEBEN — das Wrack bleibt, Neustart am Startpunkt' : '';
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
