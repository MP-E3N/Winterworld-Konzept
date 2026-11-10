// @ts-check
/**
 * tastatur.js — Übersetzt Tasten in Befehle.
 *
 * ZWECK:    W/S (↑/↓) → TELEGRAF eine Stellung vor/zurück (Maschinentelegraf, Spieltest M2b),
 *           A/D (←/→) → STEUERN (nur wenn sich etwas ändert), Q/E → DRUCK, L → LICHT, B → BRENNSTOFF, O → HEIZUNG, I → Lager-Popup,
 *           dazu Pause,
 *           Spieltempo, Zoom und Kamera. Die Tastatur schreibt NIE in den Zustand, sie schickt nur Befehle
 *           an die Verbindung — genau wie später übers Netz.
 * LIEST:    Tastaturereignisse, Zustand (eigener Koloss) über die Verbindung
 * SCHREIBT: Befehle über verbindung.senden(), Kamera
 * REGEL:    KONZEPT.md §7 Steuerung, §8 Regel 4
 * DEBUG:    Abgelehnte Befehle stehen in der Konsole. `ek.verbindung.protokoll()` zeigt gesendete.
 *
 * WARUM e.code statt e.key: e.code meint die Taste an ihrer Stelle, egal ob QWERTZ oder AZERTY.
 */

import { kolossVon } from '../sim/abfragen.js';
import { DRUCKSTUFEN, EINGABE_MAX, TELEGRAF, BRENNSTOFFE } from '../data/koloss.js';
import { TEMPI } from '../data/takt.js';
import { kamera, zoomen } from '../render/kamera.js';
import { ZOOM_SCHRITT } from '../data/ansicht.js';
import { lagerUmschalten } from '../ui/lager.js';

/** @typedef {import('../game/spiel.js').Spiel} Spiel */

/** Gerade gedrückte Tasten (e.code). */
const gedrueckt = new Set();
/** Zuletzt gesendete Steuerung — nur bei Änderung neu senden (spart später Netzverkehr). */
let gesendet = { gas: 0, lenkung: 0 };
/** Gewünschte Druckstufe, die noch nicht im Zustand angekommen ist (oder null). */
/** @type {number | null} */
let druckUnterwegs = null;
/** Gewünschte Telegrafen-Stellung, die noch nicht im Zustand angekommen ist (oder null). */
/** @type {number | null} */
let telegrafUnterwegs = null;

/**
 * Richtet die Tastatur ein. NUR EINMAL aufrufen.
 * @param {() => Spiel} spielHolen  liefert das aktuelle Spiel (ändert sich bei ek.neu())
 * @param {(an?: boolean) => void} hilfeUmschalten
 */
export function tastaturEinrichten(spielHolen, hilfeUmschalten) {
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    gedrueckt.add(ev.code);
    const spiel = spielHolen();
    if (ev.repeat) return;
    switch (ev.code) {
      case 'KeyQ': druckAendern(spiel, -1); break;
      case 'KeyL': lichtUmschalten(spiel); break;
      case 'KeyB': brennstoffWaehlen(spiel, null); break;
      case 'KeyO': heizungUmschalten(spiel); break;
      case 'KeyI': lagerUmschalten(); break;
      case 'KeyE': druckAendern(spiel, +1); break;
      case 'KeyW': case 'ArrowUp': telegrafSchalten(spiel, +1); break;
      case 'KeyS': case 'ArrowDown': telegrafSchalten(spiel, -1); break;
      case 'KeyP': spiel.verbindung.pauseSetzen(!spiel.verbindung.pausiert()); break;
      case 'KeyT': tempoWeiter(spiel); break;
      case 'Space': kamera.folgen = true; ev.preventDefault(); break;
      case 'Equal': case 'NumpadAdd': case 'BracketRight': zoomen(ZOOM_SCHRITT * ZOOM_SCHRITT); break;
      case 'Minus': case 'NumpadSubtract': case 'Slash': zoomen(1 / (ZOOM_SCHRITT * ZOOM_SCHRITT)); break;
      case 'KeyH': hilfeUmschalten(); break;
      case 'Escape': hilfeUmschalten(false); break;
      default: return;
    }
  });
  window.addEventListener('keyup', (ev) => { gedrueckt.delete(ev.code); });
  // Fenster verliert den Fokus → alle Tasten gelten als losgelassen (sonst fährt er ewig weiter).
  window.addEventListener('blur', () => gedrueckt.clear());
}

/**
 * Einmal pro Bild: Steuerung aus den gedrückten Tasten bilden und bei Änderung senden.
 * @param {Spiel} spiel
 */
export function steuerungSenden(spiel) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  const links = gedrueckt.has('KeyA') || gedrueckt.has('ArrowLeft');
  const rechts = gedrueckt.has('KeyD') || gedrueckt.has('ArrowRight');
  // Gas regelt die Maschine nach dem Telegrafen — die Tastatur gibt nie Handgas.
  const gas = 0;
  const lenkung = (rechts ? EINGABE_MAX : 0) - (links ? EINGABE_MAX : 0);
  if (gas !== gesendet.gas || lenkung !== gesendet.lenkung) {
    gesendet = { gas, lenkung };
    v.senden({ art: 'STEUERN', spieler: v.spieler, gas, lenkung });
  }
  if (druckUnterwegs !== null && k.druck === druckUnterwegs) druckUnterwegs = null;
  if (telegrafUnterwegs !== null && k.telegraf === telegrafUnterwegs) telegrafUnterwegs = null;
}

/**
 * Nach einem Neustart (ek.neu) die gemerkten Werte vergessen.
 */
export function tastaturZuruecksetzen() {
  gesendet = { gas: 0, lenkung: 0 };
  druckUnterwegs = null;
  telegrafUnterwegs = null;
}

/**
 * @param {Spiel} spiel
 * @param {number} richtung  −1 oder +1
 */
function druckAendern(spiel, richtung) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  // WARUM druckUnterwegs: Drückt man E zweimal schnell, ist der erste Befehl evtl. noch nicht
  // angewendet. Ohne Merker würde zweimal „Stufe 3“ statt „3, dann 4“ geschickt.
  const basis = druckUnterwegs ?? k.druck;
  const stufe = Math.max(0, Math.min(DRUCKSTUFEN.length - 1, basis + richtung));
  if (stufe === basis) return;
  druckUnterwegs = stufe;
  v.senden({ art: 'DRUCK', spieler: v.spieler, stufe });
}

/**
 * Maschinentelegraf eine Stellung weiter (W = Richtung „Äußerste Kraft voraus“, S = Richtung
 * „Voll zurück“). Ein Tastendruck = eine Stellung; Halten wiederholt nicht.
 * WARUM telegrafUnterwegs: wie beim Druck — zweimal schnell W soll zwei Stellungen weiter gehen.
 * @param {Spiel} spiel
 * @param {number} richtung  −1 oder +1
 */
function telegrafSchalten(spiel, richtung) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  telegrafSetzen(spiel, (telegrafUnterwegs ?? k.telegraf) + richtung);
}

/**
 * Stellt den Telegrafen auf eine Stellung (Tastatur oder Klick auf den Telegrafen).
 * @param {Spiel} spiel
 * @param {number} stufe  Index in TELEGRAF (wird auf den gültigen Bereich begrenzt)
 */
export function telegrafSetzen(spiel, stufe) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  const ziel = Math.max(0, Math.min(TELEGRAF.length - 1, stufe));
  if (ziel === (telegrafUnterwegs ?? k.telegraf)) return;
  telegrafUnterwegs = ziel;
  v.senden({ art: 'TELEGRAF', spieler: v.spieler, stufe: ziel });
}

/**
 * Scheinwerfer an/aus (Taste L oder Lichtschalter in der Anzeige).
 * @param {Spiel} spiel
 */
export function lichtUmschalten(spiel) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  v.senden({ art: 'LICHT', spieler: v.spieler, an: k.licht === 0 });
}

/**
 * Heizung an Bord an/aus (Taste O oder Klick auf den Ofen in der Anzeige).
 * @param {Spiel} spiel
 */
export function heizungUmschalten(spiel) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  v.senden({ art: 'HEIZUNG', spieler: v.spieler, an: k.heizung === 0 });
}

/**
 * Brennstoff wählen (Wahlschalter in der Anzeige) oder mit B zum nächsten weiterschalten (M4a).
 * @param {Spiel} spiel
 * @param {number | null} wahl  Index in BRENNSTOFFE, null = der nächste
 */
export function brennstoffWaehlen(spiel, wahl) {
  const v = spiel.verbindung;
  const k = kolossVon(v.zustand(), v.spieler);
  if (!k) return;
  const ziel = wahl ?? (k.brennstoff + 1) % BRENNSTOFFE.length;
  if (ziel !== k.brennstoff) v.senden({ art: 'BRENNSTOFF', spieler: v.spieler, wahl: ziel });
}

/** @param {Spiel} spiel */
function tempoWeiter(spiel) {
  const v = spiel.verbindung;
  const i = TEMPI.indexOf(v.tempo());
  v.tempoSetzen(TEMPI[(i + 1) % TEMPI.length]);
}
