// @ts-check
/**
 * wegweiser.js — Unten rechts: Heimat und Auftrag mit Richtungspfeil und Entfernung, die Testknöpfe,
 *                und die Meldungen zum Rettungsauftrag oben (M4d, M5b).
 *
 * ZWECK:    Unter der Schneewehen-Decke findet man nur mit Wegweisern heim und zum Ziel:
 *             ⌂ Heimstatt · 1,2 km  (Pfeil = Richtung, Norden oben)
 *             ✚ Überlebende · 5,1 km · 8 warten   (Ziel = Mitte der Region, nach dem Sichten das Lager)
 *           Meldungen: Notsignal beim Start, Signalballon gesichtet, an Bord, Auftrag erfüllt.
 *           Testknöpfe (Spieltest): Sturm an/aus (Befehl STURM_TEST), Nebel an/aus (nur Darstellung).
 * LIEST:    eigener Koloss, state.auftrag, Rettungsort (Seed), data/siedlungen.js
 * SCHREIBT: nur eigene DOM-Elemente; den Sturm nur über den Befehl (aktionen.sturm in main.js)
 * REGEL:    „Aufbauen + Aktualisieren“: Texte nur bei Änderung setzen
 * DEBUG:    ek.auftrag()
 */

import { rumpfMitte } from '../sim/abfragen.js';
import { siedlungVon } from '../sim/siedlung.js';
import { rettungsOrt, auftragErfuellt } from '../sim/auftrag.js';
import { sturmLaeuft } from '../sim/wetter/sturm.js';
import { SIEDLUNGEN } from '../data/siedlungen.js';
import { UEBERLEBENDE } from '../data/auftrag.js';
import { UM_PRO_METER } from '../data/koloss.js';
import { ansichtNebel } from '../render/nebel.js';
import { brennendeLaternen } from '../sim/laternen.js';
import { LATERNEN_MAX } from '../data/laternen.js';

/** @typedef {import('../sim/types.js').Zustand} Zustand */
/** @typedef {import('../sim/types.js').Koloss} Koloss */

/** @type {Record<string, HTMLElement>} */
const el = {};

/**
 * HTML für die Tafel unten rechts (zwischen Uhr und Maßstab).
 * @returns {string}
 */
export function wegweiserHtml() {
  return `<div class="werkzeuge"><button id="w-sucher" class="messingknopf" tabindex="-1" title="Suchscheinwerfer an/aus (F) — schmaler, weiter Lichtkegel, zeigt zur Maus; sieht auch durch Nebel">Suchlicht</button>
      <button id="w-laterne" class="messingknopf" tabindex="-1" title="Laterne hinter dem Heck absetzen (G) — leuchtet 2 Stunden als Wegpunkt; höchstens 5, die sechste löscht die älteste">Laterne</button></div>
    <div class="testknoepfe"><button id="w-sturm" class="testknopf" tabindex="-1" title="Testknopf: Sturm sofort beginnen lassen bzw. beenden">Sturm an</button>
      <button id="w-nebel" class="testknopf" tabindex="-1" title="Testknopf: Schneewehen-Decke aus/an (nur Ansicht)">Nebel aus</button></div>
    <div class="heimat" title="Heimat: hier speicherst du, lagerst ein und startest nach einem Wrack neu. Pfeil = Richtung (Norden oben)."><span id="w-heimpfeil" class="windpfeil">➜</span><span id="w-heim"></span></div>
    <div class="heimat auftrag" title="Auftrag: Überlebende finden und in die Heimstatt bringen. Pfeil zeigt zur Region, nach dem Sichten des Signalballons zum Lager."><span id="w-zielpfeil" class="windpfeil">➜</span><span id="w-ziel"></span></div>`;
}

/**
 * Nach dem Einbau einmal aufrufen.
 * @param {HTMLElement} hud
 * @param {{sturm: () => void, sucher: () => void, laterne: () => void}} aktionen  Befehle (main.js, eingabe/tastatur.js)
 */
export function wegweiserEinrichten(hud, aktionen) {
  for (const id of ['w-sturm', 'w-nebel', 'w-heimpfeil', 'w-heim', 'w-zielpfeil', 'w-ziel', 'w-sucher', 'w-laterne']) el[id] = /** @type {HTMLElement} */ (hud.querySelector('#' + id));
  el['w-sturm'].addEventListener('click', () => { aktionen.sturm(); el['w-sturm'].blur(); });
  el['w-sucher'].addEventListener('click', () => { aktionen.sucher(); el['w-sucher'].blur(); });
  el['w-laterne'].addEventListener('click', () => { aktionen.laterne(); el['w-laterne'].blur(); });
  el['w-nebel'].addEventListener('click', () => { ansichtNebel.an = !ansichtNebel.an; el['w-nebel'].blur(); });
}

/**
 * Jedes Bild.
 * @param {Zustand} s @param {Koloss | null} k
 */
export function wegweiserAktualisieren(s, k) {
  setzen('w-sturm', sturmLaeuft(s.wetter, s.tick) ? 'Sturm aus' : 'Sturm an');
  setzen('w-nebel', ansichtNebel.an ? 'Nebel aus' : 'Nebel an');
  if (!k) return;
  el['w-sucher'].classList.toggle('an', k.sucher === 1);
  setzen('w-laterne', `Laterne · ${brennendeLaternen(s, k.besitzer).length}/${LATERNEN_MAX}`);
  const sd = SIEDLUNGEN[k.heimat];
  if (sd) zeile('w-heim', 'w-heimpfeil', k, sd, siedlungVon(k) === k.heimat ? `⌂ ${sd.name} · hier` : null, `⌂ ${sd.name}`);
  const a = s.auftrag, ort = rettungsOrt(s.seed);
  if (auftragErfuellt(s)) { pfeilAus('w-zielpfeil'); setzen('w-ziel', `✚ ${a.gerettet} gerettet ✓`); return; }
  const anBord = k.crew.passagiere;
  if (anBord > 0) { zeile('w-ziel', 'w-zielpfeil', k, sd ?? SIEDLUNGEN[0], null, `✚ ${anBord} an Bord · heim`); return; }
  const ziel = a.gesichtet ? ort.lager : ort.region;
  zeile('w-ziel', 'w-zielpfeil', k, ziel, null, `✚ ${a.gesichtet ? 'Lager' : 'Region'} · ${a.leute} warten`);
}

/**
 * Eine Wegweiser-Zeile: Text, Entfernung und Pfeil zum Ziel.
 * @param {string} id @param {string} pfeil @param {Koloss} k @param {{x: number, y: number}} ziel  Meter
 * @param {string | null} fest  fester Text (dann ohne Pfeil) @param {string} name
 */
function zeile(id, pfeil, k, ziel, fest, name) {
  const m = rumpfMitte(k);
  const dx = ziel.x - m.x / UM_PRO_METER, dy = ziel.y - m.y / UM_PRO_METER, weit = Math.hypot(dx, dy);
  el[pfeil].hidden = fest !== null;
  if (fest === null) el[pfeil].style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  setzen(id, fest ?? `${name} · ${weit >= 1000 ? `${(weit / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(weit / 10) * 10} m`}`);
}

/** @param {string} pfeil */
function pfeilAus(pfeil) { el[pfeil].hidden = true; }

/** @param {string} id @param {string} text */
function setzen(id, text) {
  if (el[id].textContent !== text) el[id].textContent = text;
}

// ── Meldungen oben ──

/** Was zuletzt gesehen wurde, damit eine Meldung nur beim Wechsel erscheint. */
const merk = { tick: -1, gesichtet: -1, anBord: -1, erfuellt: false, text: '', restMs: 0 };

/**
 * Meldung zum Auftrag (leer, wenn keine). Neue Welt/geladener Stand: Notsignal, wenn noch niemand gerettet ist.
 * @param {Zustand} s @param {Koloss | null} k @param {number} dtMs
 * @returns {string}
 */
export function auftragMeldung(s, k, dtMs) {
  const a = s.auftrag;
  const anBord = k ? k.crew.passagiere : 0, erfuellt = auftragErfuellt(s);
  if (s.tick < merk.tick || merk.tick < 0) {
    // Neuer Anfang: Notsignal zeigen (falls der Auftrag noch offen ist), ohne die übrigen Wechsel zu melden.
    Object.assign(merk, { gesichtet: a.gesichtet, anBord, erfuellt });
    if (a.leute === UEBERLEBENDE) melden(`NOTSIGNAL — Überlebende rund 5 km im ${himmelsrichtung(rettungsOrt(s.seed).region)}. Findet sie und bringt sie heim.`, 12000);
  }
  merk.tick = s.tick;
  if (a.gesichtet && !merk.gesichtet) melden('SIGNALBALLON GESICHTET — dort warten die Überlebenden', 7000);
  if (anBord > merk.anBord && anBord > 0) melden(`${anBord} ÜBERLEBENDE AN BORD — bringt sie in die Heimstatt`, 7000);
  if (erfuellt && !merk.erfuellt) melden(`AUFTRAG ERFÜLLT — ${a.gerettet} Überlebende in Sicherheit`, 12000);
  Object.assign(merk, { gesichtet: a.gesichtet, anBord, erfuellt });
  merk.restMs = Math.max(0, merk.restMs - dtMs);
  return merk.restMs > 0 ? merk.text : '';
}

/** @param {string} text @param {number} ms */
function melden(text, ms) { merk.text = text; merk.restMs = ms; }

/** Grobe Himmelsrichtung vom Start aus. @param {{x: number, y: number}} p @returns {string} */
function himmelsrichtung(p) {
  const namen = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
  const w = Math.atan2(p.y, p.x); // +y = Süden
  return namen[(Math.round(w / (Math.PI / 4)) + 8) % 8];
}
