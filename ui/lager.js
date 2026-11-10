// @ts-check
/**
 * lager.js — Lager-Popup neben dem eigenen Koloss (Spieltest M4a, Nutzerwunsch).
 *
 * ZWECK:    Zeigt Brennstofflager (Kohle, Holz, Öl) und Warenlager (Holz, Vorräte) mit Füllstand.
 *           Je Ware: abwerfen (1 t je Klick, mit Umschalt alles) — das landet als Haufen hinter dem
 *           Koloss auf der Karte und kann wieder geborgen werden. Holz lässt sich zwischen den Lagern
 *           umlagern, und man wählt, wohin neu geborgenes Holz kommt.
 *           Öffnen/Schließen: Klick auf den eigenen Koloss oder Taste I. Das Popup wandert mit.
 * LIEST:    eigener Koloss (Lager, holzZiel) über die Verbindung, Kamera
 * SCHREIBT: nur eigene DOM-Elemente; Änderungen nur über Befehle (ABWERFEN, UMLAGERN, HOLZZIEL)
 * REGEL:    Messing-Stil wie die übrige Anzeige; „Aufbauen + Aktualisieren“ (Texte nur bei Änderung)
 * DEBUG:    Popup klebt falsch? Lage kommt aus lageZumZeichnen + rumpfLage (wie der gezeichnete Koloss).
 */

import { kolossVon } from '../sim/abfragen.js';
import { lagerMenge, lagerKg, lagerFrei } from '../sim/koloss/lager.js';
import { LAGER, WAREN, ABWERFEN_KG, BRENNSTOFFLAGER, WARENLAGER } from '../data/fundstellen.js';
import { KOLOSS_LAENGE_M } from '../data/koloss.js';
import { kamera, weltZuBild } from '../render/kamera.js';
import { rumpfLage } from '../render/koloss-mass.js';
import { tonnen } from '../render/fundstellen.js';
import { lageZumZeichnen } from '../game/spiel.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/** Abstand des Popups vom Koloss (Bildpunkte). */
const ABSTAND_PX = 24;

let offen = false;
/** @type {HTMLElement} */
let box;
/** Elemente je „lager:ware“ bzw. Lager. @type {Record<string, HTMLElement>} */
const el = {};

/** Popup auf/zu (Klick auf den Koloss, Taste I). */
export function lagerUmschalten() {
  offen = !offen;
  if (box) box.hidden = !offen;
}

/**
 * Baut das Popup einmal auf. NUR EINMAL aufrufen.
 * @param {HTMLElement} hud
 * @param {() => Spiel} spielHolen
 */
export function lagerEinrichten(hud, spielHolen) {
  box = document.createElement('div');
  box.className = 'tafel lagerpopup';
  box.hidden = true;
  box.innerHTML = `<div class="kopf"><span>Lager</span><button class="zu" title="Schließen (I)">×</button></div>
    ${LAGER.map((l, i) => `
    <div class="lagerblock">
      <div class="titel"><span>${l.name}</span><span id="l-zahl-${i}" class="lagerzahl"></span></div>
      <div class="ladebalken"><span id="l-fuell-${i}"></span></div>
      ${l.waren.map((w) => zeile(i, w)).join('')}
    </div>`).join('')}
    <div class="holzziel"><span>Neues Holz ins</span>
      <span class="wahl"><button data-ziel="0" tabindex="-1">Brennstoff</button><button data-ziel="1" tabindex="-1">Waren</button></span></div>`;
  hud.appendChild(box);
  for (const e of box.querySelectorAll('[id]')) el[e.id] = /** @type {HTMLElement} */ (e);
  /** @type {HTMLElement} */ (box.querySelector('.zu')).addEventListener('click', lagerUmschalten);
  box.addEventListener('click', (ev) => klick(spielHolen(), /** @type {MouseEvent} */ (ev)));
}

/**
 * Eine Zeile: Farbpunkt, Name, Menge, Knöpfe.
 * @param {number} lager @param {string} ware
 * @returns {string}
 */
function zeile(lager, ware) {
  const w = WAREN.find((x) => x.ware === ware);
  const umlagern = ware === 'holz'
    ? `<button data-um="${1 - lager}" data-lager="${lager}" tabindex="-1" title="1 t Holz ins ${LAGER[1 - lager].name} (Umschalt: alles)">⇄</button>` : '';
  return `<div class="warezeile" id="l-zeile-${lager}-${ware}"><i style="background:${w?.farbe}"></i><span class="name">${w?.name ?? ware}</span>
    <b id="l-${lager}-${ware}"></b>
    <button data-wurf="${ware}" data-lager="${lager}" tabindex="-1" title="1 t abwerfen (Umschalt: alles) — bleibt als Haufen liegen">⇣</button>${umlagern}</div>`;
}

/**
 * Klicks im Popup → Befehle.
 * @param {Spiel} spiel @param {MouseEvent} ev
 */
function klick(spiel, ev) {
  const knopf = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (ev.target).closest('button'));
  if (!knopf) return;
  knopf.blur();
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  const lager = Number(knopf.dataset.lager);
  if (knopf.dataset.wurf) {
    const da = lagerMenge(k, lager, knopf.dataset.wurf);
    const kg = ev.shiftKey ? da : Math.min(ABWERFEN_KG, da);
    if (kg > 0) v.senden({ art: 'ABWERFEN', spieler: v.spieler, lager, ware: knopf.dataset.wurf, kg });
  } else if (knopf.dataset.um) {
    const nach = Number(knopf.dataset.um);
    const moeglich = Math.min(lagerMenge(k, lager, 'holz'), lagerFrei(k, nach));
    const kg = ev.shiftKey ? moeglich : Math.min(ABWERFEN_KG, moeglich);
    if (kg > 0) v.senden({ art: 'UMLAGERN', spieler: v.spieler, nach, kg });
  } else if (knopf.dataset.ziel) {
    v.senden({ art: 'HOLZZIEL', spieler: v.spieler, lager: Number(knopf.dataset.ziel) });
  }
}

/**
 * Jedes Bild: Zahlen setzen und das Popup neben den Koloss schieben.
 * @param {Spiel} spiel
 */
export function lagerAktualisieren(spiel) {
  if (!offen || !box) return;
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  for (const lager of [BRENNSTOFFLAGER, WARENLAGER]) {
    const kg = lagerKg(k, lager);
    setzen(`l-zahl-${lager}`, `${tonnen(kg)} / ${LAGER[lager].kg / 1000} t`);
    el[`l-fuell-${lager}`].style.width = `${(100 * kg) / LAGER[lager].kg}%`;
    for (const w of LAGER[lager].waren) {
      const menge = lagerMenge(k, lager, w);
      setzen(`l-${lager}-${w}`, tonnen(menge));
      el[`l-zeile-${lager}-${w}`].classList.toggle('leer', menge === 0);
    }
  }
  for (const b of box.querySelectorAll('.holzziel button')) {
    b.classList.toggle('an', Number(/** @type {HTMLElement} */ (b).dataset.ziel) === k.holzZiel);
  }
  // Rechts neben den Koloss, ins Fenster geklemmt.
  const r = rumpfLage(lageZumZeichnen(spiel, k));
  const [bx, by] = weltZuBild(r.x, r.y);
  const halb = Math.min((KOLOSS_LAENGE_M / 2) * kamera.zoom, 260);
  const x = Math.min(kamera.breite - box.offsetWidth - 8, Math.max(8, bx + halb + ABSTAND_PX));
  const y = Math.min(kamera.hoehe - box.offsetHeight - 8, Math.max(8, by - box.offsetHeight / 2));
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(y)}px`;
}

/** @param {string} id @param {string} text */
function setzen(id, text) {
  if (el[id].textContent !== text) el[id].textContent = text;
}
