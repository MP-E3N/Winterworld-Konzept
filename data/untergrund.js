// @ts-check
/**
 * untergrund.js — Geländearten und wie sie das Fahren beeinflussen.
 *
 * ZWECK:    Eine Zeile pro Untergrund. Index = Untergrund-ID (wird von sim/welt/untergrund.js
 *           zurückgegeben).
 * REGEL:    KONZEPT.md §5 Gelände-Tabelle
 *
 * FELDER:
 *   zug        Prozent des Kesselschubs, der auf den Boden kommt (Eis: Räder drehen durch)
 *   widerstand /4096 pro Tick; bestimmt mit `zug` das Höchsttempo (Höchsttempo ∝ zug / widerstand)
 *   haftung    /4096 pro Tick; wie schnell seitliches Rutschen abgebaut wird (Eis: kaum)
 *   bremsen    Prozent der Bremswirkung
 *   lenken     Prozent der Lenkwirkung
 *
 * Höchsttempo relativ zu Packschnee = (zug/100) × (32 / widerstand):
 *   Pulverschnee 0,80 × 32/51 ≈ 50 %, Dickes Eis 0,60 × 32/16 = 120 %.
 */

/** @typedef {{name: string, zug: number, widerstand: number, haftung: number, bremsen: number, lenken: number, farbe: string}} Untergrund */

export const PACKSCHNEE = 0;
export const PULVERSCHNEE = 1;
export const EIS_DICK = 2;

/** @type {readonly Untergrund[]} */
export const UNTERGRUND = [
  // Haftung 1200/4096 ≈ 29 % pro Tick: Bei voller Kurve rutscht der Koloss auf Schnee nur
  // ~0,5 m/s seitlich — man spürt das Gewicht, aber er fährt, wohin man lenkt.
  { name: 'Packschnee', zug: 100, widerstand: 32, haftung: 1200, bremsen: 100, lenken: 100, farbe: '#e9eef2' },
  { name: 'Pulverschnee', zug: 80, widerstand: 51, haftung: 1600, bremsen: 130, lenken: 70, farbe: '#f7f9fb' },
  // Dickes Eis: zäh beim Anfahren (60 % Zug), dann schnell und rutschig, schlechte Bremsen.
  // Haftung 60/4096 ≈ 1,5 % pro Tick: Rutschen klingt erst nach ~2–3 s ab.
  { name: 'Dickes Eis', zug: 60, widerstand: 16, haftung: 60, bremsen: 30, lenken: 60, farbe: '#bcd6e4' },
];
