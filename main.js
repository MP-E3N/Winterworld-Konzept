// @ts-check
/**
 * main.js — Startpunkt im Browser: baut alles zusammen und startet die Bildschleife.
 *
 * ZWECK:    Verbindung (Einzelspiel), Spielschleife, Kamera, Tastatur, Maus, Anzeige und Debug
 *           verdrahten. Enthält selbst keine Spielregeln.
 * LIEST:    index.html (#welt, #hud, #debug, #hilfe)
 * SCHREIBT: —
 * DEBUG:    In der Konsole `ek` (siehe debug/konsole.js). F3 = Messwerte.
 */

import { lokaleVerbindungErstellen } from './netz/lokal.js';
import { spielErstellen, bildSchritt } from './game/spiel.js';
import { kamera, kameraEinrichten } from './render/kamera.js';
import { bildZeichnen } from './render/zeichnen.js';
import { optikZuruecksetzen } from './render/spuren.js';
import { schneetreibenZuruecksetzen } from './render/wind.js';
import { weltZuruecksetzen } from './render/welt.js';
import {
  tastaturEinrichten, steuerungSenden, tastaturZuruecksetzen, telegrafSetzen, lichtUmschalten, brennstoffWaehlen, heizungUmschalten,
} from './eingabe/tastatur.js';
import { lagerEinrichten, lagerAktualisieren } from './ui/lager.js';
import { mausEinrichten } from './eingabe/maus.js';
import { fundstellenZuruecksetzen } from './render/fundstellen.js';
import { anzeigeAufbauen, anzeigeAktualisieren } from './ui/anzeige.js';
import { overlayEinrichten, overlayAktualisieren } from './debug/overlay.js';
import { konsoleEinrichten } from './debug/konsole.js';
import { ZOOM_START } from './data/ansicht.js';

/** Seed der ersten Welt (bestimmt die ganze Karte). 0 = Testgelände aus M1: ek.neu(0). */
const START_SEED = 4711;

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('welt'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const hud = /** @type {HTMLElement} */ (document.getElementById('hud'));
const debugEl = /** @type {HTMLElement} */ (document.getElementById('debug'));
const hilfe = /** @type {HTMLElement} */ (document.getElementById('hilfe'));
const hilfeKnopf = /** @type {HTMLElement} */ (document.getElementById('hilfe-knopf'));

let spiel = spielErstellen(lokaleVerbindungErstellen(START_SEED, 'Eiskoloss'));

/**
 * Neue Welt (auch aus der Konsole: ek.neu(seed)).
 * @param {number} seed
 */
function neueWelt(seed) {
  spiel = spielErstellen(lokaleVerbindungErstellen(seed, 'Eiskoloss'));
  optikZuruecksetzen();
  schneetreibenZuruecksetzen();
  weltZuruecksetzen();
  fundstellenZuruecksetzen();
  tastaturZuruecksetzen();
  kamera.folgen = true;
  kamera.zoomZiel = ZOOM_START;
}

/** @param {boolean} [an] */
function hilfeUmschalten(an) {
  hilfe.hidden = an === undefined ? !hilfe.hidden : !an;
}

/** Canvas an Fenstergröße und Bildschirmschärfe (devicePixelRatio) anpassen. */
function groesseAnpassen() {
  const dpr = window.devicePixelRatio || 1;
  kamera.breite = window.innerWidth;
  kamera.hoehe = window.innerHeight;
  canvas.width = Math.round(kamera.breite * dpr);
  canvas.height = Math.round(kamera.hoehe * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── Einrichten (alles nur EINMAL) ─────────────────────────
groesseAnpassen();
window.addEventListener('resize', groesseAnpassen);
kameraEinrichten(canvas);
tastaturEinrichten(() => spiel, hilfeUmschalten);
mausEinrichten(canvas, () => spiel);
anzeigeAufbauen(hud, {
  telegraf: (stufe) => telegrafSetzen(spiel, stufe),
  licht: () => lichtUmschalten(spiel),
  heizung: () => heizungUmschalten(spiel),
  brennstoff: (wahl) => brennstoffWaehlen(spiel, wahl),
});
lagerEinrichten(hud, () => spiel);
overlayEinrichten(debugEl);
konsoleEinrichten(() => spiel, neueWelt);
hilfeKnopf.addEventListener('click', () => hilfeUmschalten());

// ── Bildschleife ──────────────────────────────────────────
let letzte = performance.now();
/** @param {number} jetzt */
function bild(jetzt) {
  const dt = Math.min(250, jetzt - letzte); // nach langer Pause nicht riesig springen
  letzte = jetzt;
  steuerungSenden(spiel);
  bildSchritt(spiel, dt);
  bildZeichnen(ctx, spiel, dt);
  anzeigeAktualisieren(spiel, dt);
  lagerAktualisieren(spiel);
  overlayAktualisieren(debugEl, spiel, dt);
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);
