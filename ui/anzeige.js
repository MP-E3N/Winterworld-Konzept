// @ts-check
/**
 * anzeige.js — Anzeigen am Bildrand: Tempo, Dampfmaschine, Kesseldruck, Wind, Boden, Maßstab.
 *
 * ZWECK:    Das Nötigste zum Fahren, schlicht (Nutzerwunsch aus Kronwege: keine Extra-Fenster,
 *           Bedienhinweise nur hinter „?“).
 * LIEST:    eigener Koloss, Wetter, Verbindung (Pause/Tempo), Kamera, gefahrene Meter
 * SCHREIBT: nur DOM-Elemente in #hud
 * REGEL:    „Aufbauen + Aktualisieren“: Elemente einmal bauen, danach nur Texte setzen.
 */

import { kolossVon, laengsTempo, alsKmh, hoechstTempo } from '../sim/abfragen.js';
import { befehlPruefen } from '../sim/befehle.js';
import { untergrundAn } from '../sim/welt/untergrund.js';
import { UNTERGRUND } from '../data/untergrund.js';
import { DRUCKSTUFEN, EINGABE_MAX, TEMPOMAT_MIN_KMH, TEMPOMAT_MAX_KMH } from '../data/koloss.js';
import { kamera } from '../render/kamera.js';
import { wegVon } from '../render/spuren.js';
import { windVektor, windRelativ } from '../render/wind.js';
import { dampfmaschineEinrichten, dampfmaschineZeichnen } from './dampfmaschine.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/** @type {Record<string, HTMLElement>} */
const el = {};
/** @type {HTMLCanvasElement} */
let maschine;

/**
 * Baut die Anzeige einmal auf.
 * @param {HTMLElement} hud
 * @param {{tempoHalten: () => void, zieltempo: (kmh: number) => void}} aktionen  aus eingabe/tastatur.js
 */
export function anzeigeAufbauen(hud, aktionen) {
  hud.innerHTML = `
    <div class="tafel links-unten">
      <div class="tempo"><span id="a-tempo">0</span><small> km/h</small></div>
      <canvas id="a-maschine" title="Kessel: Glut und Manometer zeigen den Druck, Kolben und Schwungrad laufen mit den Rädern"></canvas>
      <div class="zeile"><span class="beschr">Kessel</span><span id="a-druck"></span></div>
      <button id="a-tempomat" class="knopf" tabindex="-1" title="Hält das aktuelle Tempo ohne W. S schaltet aus, W + Loslassen setzt ein neues Tempo.">Tempo halten (R)</button>
      <div id="a-regler" class="zeile regler" title="Zieltempo für „Tempo halten“">
        <input id="a-zieltempo" type="range" min="2" max="34" step="1" tabindex="-1">
        <span id="a-zielwert"></span>
      </div>
      <div class="zeile"><span class="beschr">Wind</span><span id="a-windpfeil" class="windpfeil">➜</span><span id="a-wind"></span></div>
      <div class="zeile"><span class="beschr">Boden</span><span id="a-boden"></span></div>
    </div>
    <div class="tafel rechts-unten"><div id="a-mass" class="mass"></div><div id="a-masstext"></div></div>
    <div id="a-status" class="status"></div>`;
  for (const id of ['a-tempo', 'a-druck', 'a-tempomat', 'a-regler', 'a-zieltempo', 'a-zielwert', 'a-windpfeil', 'a-wind', 'a-boden', 'a-mass', 'a-masstext', 'a-status']) {
    el[id] = /** @type {HTMLElement} */ (hud.querySelector('#' + id));
  }
  maschine = /** @type {HTMLCanvasElement} */ (hud.querySelector('#a-maschine'));
  // blur(): sonst behält der Knopf den Fokus, und die Leertaste würde ihn erneut auslösen.
  el['a-tempomat'].addEventListener('click', () => { aktionen.tempoHalten(); el['a-tempomat'].blur(); });
  reglerEinrichten(aktionen.zieltempo);
  dampfmaschineEinrichten(maschine);
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
    tempoHaltenAnzeigen(s, v.spieler, k);
    el['a-boden'].textContent = UNTERGRUND[untergrundAn(s.seed, k.x, k.y)].name;
    const wind = windVektor(s.wetter);
    // Pfeil zeigt, wohin der Wind weht (Norden = oben, wie auf der Karte).
    el['a-windpfeil'].style.transform = `rotate(${wind.rad}rad)`;
    el['a-wind'].textContent = `${wind.ms.toFixed(0)} m/s · ${windRelativ(s.wetter, (k.h / 65536) * 2 * Math.PI)}`;
    dampfmaschineZeichnen(maschine, {
      druck: k.druck, druckMax: DRUCKSTUFEN.length - 1, gas: k.antrieb / EINGABE_MAX,
      // Überlast: „Tempo halten“ will schneller, als der Kessel auf diesem Boden schafft.
      ueberlast: k.tempomat > 0 && k.gas === 0 && k.tempomat > hoechstTempo(s.seed, k),
      weg: wegVon(k.id), dtMs: v.pausiert() ? 0 : dtMs,
    });
  }
  massstab();
  const status = v.pausiert() ? 'PAUSE' : v.tempo() > 1 ? `Tempo ${v.tempo()}×` : '';
  el['a-status'].textContent = status;
  el['a-status'].hidden = status === '';
}

/**
 * Knopf „Tempo halten“: leuchtet, wenn an, und zeigt das gehaltene Tempo; gesperrt, wenn zu langsam.
 * @param {import('../sim/types.js').Zustand} s @param {number} spieler
 * @param {import('../sim/types.js').Koloss} k
 */
function tempoHaltenAnzeigen(s, spieler, k) {
  const knopf = /** @type {HTMLButtonElement} */ (el['a-tempomat']);
  const an = k.tempomat > 0;
  knopf.classList.toggle('an', an);
  const text = an ? `Tempo halten: ${alsKmh(k.tempomat).toFixed(0)} km/h (R)` : 'Tempo halten (R)';
  if (knopf.textContent !== text) knopf.textContent = text; // nur bei Änderung: sonst gehen Klicks verloren
  knopf.disabled = !an && befehlPruefen(s, { art: 'TEMPOMAT', spieler, an: true }) !== null;
  // Regler nur, solange Tempo halten an ist (Nutzerwunsch).
  el['a-regler'].hidden = !an;
  if (!an) return;
  const regler = /** @type {HTMLInputElement} */ (el['a-zieltempo']);
  const ziel = Math.round(alsKmh(k.tempomat));
  if (!reglerZiehen && regler.value !== String(ziel)) regler.value = String(ziel);
  // Spieltest 4: kein Warntext — Überlast zeigt die zitternde Manometer-Nadel.
  const zielText = `${ziel} km/h`;
  if (el['a-zielwert'].textContent !== zielText) el['a-zielwert'].textContent = zielText;
}

/** true, solange der Spieler den Regler zieht — dann nicht aus dem Zustand überschreiben. */
let reglerZiehen = false;

/**
 * Schieberegler fürs Zieltempo. Sendet bei jeder ganzen km/h einen TEMPOMAT-Befehl.
 * WARUM blur(): Behält der Regler den Fokus, verstellen ihn die Pfeiltasten statt zu lenken.
 * @param {(kmh: number) => void} zieltempo
 */
function reglerEinrichten(zieltempo) {
  const regler = /** @type {HTMLInputElement} */ (el['a-zieltempo']);
  regler.min = String(TEMPOMAT_MIN_KMH);
  regler.max = String(TEMPOMAT_MAX_KMH);
  regler.addEventListener('pointerdown', () => { reglerZiehen = true; });
  regler.addEventListener('input', () => zieltempo(Number(regler.value)));
  regler.addEventListener('change', () => { reglerZiehen = false; regler.blur(); });
  window.addEventListener('pointerup', () => { reglerZiehen = false; regler.blur(); });
}

/** Maßstabsbalken: runde Länge (1-2-5-Reihe), die 60–150 Bildpunkte breit ist. */
function massstab() {
  const ziel = 100 / kamera.zoom; // Meter auf 100 Bildpunkten
  const stufe = Math.pow(10, Math.floor(Math.log10(ziel)));
  const meter = [1, 2, 5, 10].map((f) => f * stufe).find((m) => m * kamera.zoom >= 60) ?? stufe * 10;
  el['a-mass'].style.width = `${Math.round(meter * kamera.zoom)}px`;
  el['a-masstext'].textContent = meter >= 1000 ? `${meter / 1000} km` : `${meter} m`;
}
