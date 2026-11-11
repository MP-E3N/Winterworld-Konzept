// @ts-check
/**
 * depot.js — Depot-Fenster der Siedlung: Klick auf den Depot-Schuppen öffnet es (M4d, Spieltest-Wunsch).
 *
 * ZWECK:    Waren zwischen Koloss und Depot bewegen, so einfach wie möglich (Nutzerwunsch: „Klick auf
 *           das Depot und dort auswählen, ob und was man ablädt oder belädt“):
 *             oben die Richtung wählen — ⇣ Abladen (Koloss → Depot) oder ⇡ Beladen (Depot → Koloss),
 *             je Ware „an Bord“ und „im Depot“ nebeneinander, dazu 1 t · 10 t · Alle.
 *           Darunter die Crew: Leute anheuern (+) oder in der Siedlung lassen (−), bis zu den Kojen.
 *           Steht der Koloss nicht in der Siedlung, sind die Knöpfe matt (keine Warntexte).
 *           Holz: Abladen nimmt erst aus dem Warenlager, dann aus dem Brennstofflager; Beladen legt es
 *           dorthin, wo „Neues Holz ins“ im Lager-Popup hinzeigt.
 * LIEST:    eigener Koloss, Depot (sim/siedlung.js), data/siedlungen.js, Kamera
 * SCHREIBT: nur eigene DOM-Elemente und siedlungAnsicht.markiert; Änderungen nur über Befehle
 *           (EINLAGERN, AUSLAGERN, CREW)
 * REGEL:    docs/specs/M4d-siedlung.md „Anzeige“; „Aufbauen + Aktualisieren“ (Texte nur bei Änderung)
 * DEBUG:    Knopf tut nichts? Grund steht in der Konsole ([Befehl abgelehnt]).
 */

import { kolossVon } from '../sim/abfragen.js';
import { siedlungImStand, depotMenge } from '../sim/siedlung.js';
import { lagerMenge, lagerFrei, zielLager } from '../sim/koloss/lager.js';
import { WAREN, LAGER, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { SIEDLUNGEN, KOJEN, DEPOT_WAREN } from '../data/siedlungen.js';
import { tonnen } from '../render/fundstellen.js';
import { kamera, weltZuBild } from '../render/kamera.js';
import { siedlungAnsicht } from '../render/siedlungen.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */
/** @typedef {import('../sim/types.js').Koloss} Koloss */
/** @typedef {import('../netz/verbindung.js').Verbindung} Verbindung */

/** Mengen-Knöpfe (kg; 0 = alles). */
const MENGEN = [{ kg: 1000, text: '1 t' }, { kg: 10000, text: '10 t' }, { kg: 0, text: 'Alle' }];
/** Abstand des Fensters vom Schuppen (Bildpunkte). */
const ABSTAND_PX = 18;

/** Welche Siedlung gezeigt wird (−1 = zu). */
let siedlung = -1;
/** true = Abladen (Koloss → Depot), false = Beladen. */
let abladen = true;
/** Fenstergröße, einmal nach dem Öffnen gemessen. */
let groesse = { b: 0, h: 0 };
/** @type {HTMLElement} */
let box;
/** @type {Record<string, HTMLElement>} */
const el = {};

/**
 * Fenster für eine Siedlung auf/zu (Klick auf den Depot-Schuppen).
 * @param {number} id  Siedlung
 */
export function depotUmschalten(id) {
  siedlung = siedlung === id ? -1 : id;
  siedlungAnsicht.markiert = siedlung;
  groesse = { b: 0, h: 0 };
  if (box) box.hidden = siedlung < 0;
}

/**
 * Baut das Fenster einmal auf. NUR EINMAL aufrufen.
 * @param {HTMLElement} hud @param {() => Spiel} spielHolen
 */
export function depotEinrichten(hud, spielHolen) {
  box = document.createElement('div');
  box.className = 'tafel lagerpopup depotpopup';
  box.hidden = true;
  const zeilen = DEPOT_WAREN.map((ware) => {
    const w = WAREN.find((x) => x.ware === ware);
    return `<div class="depotzeile" id="d-zeile-${ware}"><i style="background:${w?.farbe}"></i><span class="name">${w?.name ?? ware}</span>
      <b id="d-bord-${ware}"></b><span class="pfeil" data-pfeil></span><b id="d-depot-${ware}"></b>
      <span class="mengen">${MENGEN.map((m) => `<button data-ware="${ware}" data-kg="${m.kg}" tabindex="-1">${m.text}</button>`).join('')}</span></div>`;
  }).join('');
  const gruppe = (/** @type {string} */ g, /** @type {string} */ name) => `<div class="warezeile"><span class="name">${name}</span><b id="c-${g}"></b>
    <button data-crew="${g}" data-n="-1" tabindex="-1" title="Einen ${name} in der Siedlung lassen">−</button>
    <button data-crew="${g}" data-n="1" tabindex="-1" title="Einen ${name} anheuern (kommt gesund und satt)">+</button></div>`;
  box.innerHTML = `<div class="kopf"><span id="d-titel">Depot</span><button class="zu" title="Schließen">×</button></div>
    <div class="richtung"><button data-richtung="ab" tabindex="-1" title="Vom Koloss ins Depot">⇣ Abladen</button><button data-richtung="be" tabindex="-1" title="Vom Depot auf den Koloss">⇡ Beladen</button></div>
    <div class="depotzeile kopfzeile"><i></i><span class="name"></span><b>an Bord</b><span class="pfeil" data-pfeil></span><b>im Depot</b><span class="mengen"></span></div>
    ${zeilen}
    <div class="lagerblock"><div class="titel"><span>Crew</span><span id="c-kojen" class="lagerzahl"></span></div>
      ${gruppe('heizer', 'Heizer')}${gruppe('arbeiter', 'Arbeiter')}</div>`;
  hud.appendChild(box);
  for (const e of box.querySelectorAll('[id]')) el[e.id] = /** @type {HTMLElement} */ (e);
  /** @type {HTMLElement} */ (box.querySelector('.zu')).addEventListener('click', () => depotUmschalten(siedlung));
  box.addEventListener('click', (ev) => klick(spielHolen(), /** @type {MouseEvent} */ (ev)));
}

/**
 * Klicks im Fenster → Richtung wählen oder Befehle senden.
 * @param {Spiel} spiel @param {MouseEvent} ev
 */
function klick(spiel, ev) {
  const knopf = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (ev.target).closest('button'));
  if (!knopf || knopf.classList.contains('matt')) return;
  knopf.blur();
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  if (knopf.dataset.richtung) abladen = knopf.dataset.richtung === 'ab';
  else if (knopf.dataset.crew) {
    v.senden({ art: 'CREW', spieler: v.spieler, gruppe: /** @type {'heizer' | 'arbeiter'} */ (knopf.dataset.crew), anzahl: Number(knopf.dataset.n) });
  } else if (knopf.dataset.ware) {
    const ware = knopf.dataset.ware, wunsch = Number(knopf.dataset.kg);
    if (abladen) abladenSenden(v, k, ware, wunsch);
    else beladenSenden(v, k, ware, wunsch);
  }
}

/**
 * Koloss → Depot. Holz kommt erst aus dem Warenlager, dann aus dem Brennstofflager.
 * @param {Verbindung} v @param {Koloss} k @param {string} ware @param {number} wunsch  kg, 0 = alles
 */
function abladenSenden(v, k, ware, wunsch) {
  let rest = wunsch > 0 ? wunsch : Infinity;
  for (const lager of [WARENLAGER, BRENNSTOFFLAGER]) {
    if (!LAGER[lager].waren.includes(/** @type {any} */ (ware))) continue;
    const kg = Math.min(rest, lagerMenge(k, lager, ware));
    if (kg <= 0) continue;
    v.senden({ art: 'EINLAGERN', spieler: v.spieler, lager, ware, kg });
    rest -= kg;
  }
}

/**
 * Depot → Koloss, ins Lager, in das die Ware gehört (Holz: „Neues Holz ins“).
 * @param {Verbindung} v @param {Koloss} k @param {string} ware @param {number} wunsch  kg, 0 = alles
 */
function beladenSenden(v, k, ware, wunsch) {
  const lager = zielLager(k, ware);
  const moeglich = Math.min(depotMenge(v.zustand(), siedlung, v.spieler, ware), lagerFrei(k, lager));
  const kg = wunsch > 0 ? Math.min(wunsch, moeglich) : moeglich;
  if (kg > 0) v.senden({ art: 'AUSLAGERN', spieler: v.spieler, lager, ware, kg });
}

/**
 * Jedes Bild: Zahlen, matte Knöpfe, Lage neben dem Schuppen.
 * @param {Spiel} spiel
 */
export function depotAktualisieren(spiel) {
  if (siedlung < 0 || !box) return;
  const v = spiel.verbindung, s = v.zustand();
  const k = kolossVon(s, v.spieler);
  if (!k) return;
  const geht = siedlungImStand(k) === siedlung;
  setzen('d-titel', `Depot ${SIEDLUNGEN[siedlung].name}`);
  for (const b of box.querySelectorAll('[data-richtung]')) {
    b.classList.toggle('an', (/** @type {HTMLElement} */ (b).dataset.richtung === 'ab') === abladen);
  }
  for (const p of box.querySelectorAll('[data-pfeil]')) if (p.textContent !== (abladen ? '→' : '←')) p.textContent = abladen ? '→' : '←';
  for (const ware of DEPOT_WAREN) {
    const bord = lagerMenge(k, BRENNSTOFFLAGER, ware) + lagerMenge(k, WARENLAGER, ware);
    const depot = depotMenge(s, siedlung, v.spieler, ware);
    setzen(`d-bord-${ware}`, tonnen(bord));
    setzen(`d-depot-${ware}`, tonnen(depot));
    const quelle = abladen ? bord : Math.min(depot, lagerFrei(k, zielLager(k, ware)));
    el[`d-zeile-${ware}`].classList.toggle('leer', !geht || quelle <= 0);
    for (const b of el[`d-zeile-${ware}`].querySelectorAll('button')) b.classList.toggle('matt', !geht || quelle <= 0);
  }
  const c = k.crew, leute = c.heizer + c.arbeiter;
  setzen('c-heizer', String(c.heizer));
  setzen('c-arbeiter', String(c.arbeiter));
  setzen('c-kojen', `${leute} / ${KOJEN} Kojen`);
  for (const b of box.querySelectorAll('[data-crew]')) {
    const d = /** @type {HTMLElement} */ (b).dataset, g = /** @type {'heizer' | 'arbeiter'} */ (d.crew);
    const ok = geht && (d.n === '1' ? leute < KOJEN : c[g] > 0 && leute > 1);
    b.classList.toggle('matt', !ok);
  }
  lage();
}

/** Fenster rechts neben den Depot-Schuppen, ins Bild geklemmt. */
function lage() {
  const sd = SIEDLUNGEN[siedlung], g = sd.gebaeude.find((x) => x.art === 'depot');
  if (!g) return;
  const [bx, by] = weltZuBild(sd.x + g.dx + g.b / 2, sd.y + g.dy);
  if (groesse.b === 0) groesse = { b: box.offsetWidth, h: box.offsetHeight };
  const x = Math.min(kamera.breite - groesse.b - 8, Math.max(8, bx + ABSTAND_PX));
  const y = Math.min(kamera.hoehe - groesse.h - 8, Math.max(8, by - groesse.h / 2));
  const links = `${Math.round(x)}px`, oben = `${Math.round(y)}px`;
  if (box.style.left !== links) box.style.left = links;
  if (box.style.top !== oben) box.style.top = oben;
}

/** @param {string} id @param {string} text */
function setzen(id, text) {
  if (el[id].textContent !== text) el[id].textContent = text;
}
