// @ts-check
/**
 * untergrund.js — Geländearten und wie sie das Fahren beeinflussen.
 *
 * ZWECK:    Eine Zeile pro Untergrund. Index = Untergrund-ID (wird von sim/welt/untergrund.js
 *           zurückgegeben und im Chunk-Speicher abgelegt).
 * REGEL:    KONZEPT.md §5 Gelände-Tabelle
 *
 * FELDER:
 *   befahrbar  false = Hindernis (Fels, Schlucht): Kollision, die übrigen Werte gelten nicht
 *   zug        Prozent des Kesselschubs, der auf den Boden kommt (Eis: Räder drehen durch)
 *   widerstand /4096 pro Tick; bestimmt mit `zug` das Höchsttempo (Höchsttempo ∝ zug / widerstand)
 *   haftung    /4096 pro Tick; wie schnell seitliches Rutschen abgebaut wird (Eis: kaum)
 *   bremsen    Prozent der Bremswirkung
 *   lenken     Prozent der Lenkwirkung
 *   farbe      Grundfarbe in der Darstellung
 *
 * Höchsttempo relativ zu Packschnee = (zug/100) × (32 / widerstand):
 *   Pulverschnee 0,80 × 32/51 ≈ 50 %, Dickes Eis 0,60 × 32/16 = 120 %, Dünnes Eis ≈ 110 %.
 */

/** @typedef {{name: string, befahrbar: boolean, zug: number, widerstand: number, haftung: number, bremsen: number, lenken: number, farbe: [number, number, number]}} Untergrund */

export const PACKSCHNEE = 0;
export const PULVERSCHNEE = 1;
export const EIS_DICK = 2;
export const EIS_DUENN = 3;
export const FELS = 4;
export const SCHLUCHT = 5;

/** @type {readonly Untergrund[]} */
export const UNTERGRUND = [
  // Haftung 1200/4096 ≈ 29 % pro Tick: Bei voller Kurve rutscht der Koloss auf Schnee nur
  // ~0,5 m/s seitlich — man spürt das Gewicht, aber er fährt, wohin man lenkt.
  { name: 'Packschnee', befahrbar: true, zug: 100, widerstand: 32, haftung: 1200, bremsen: 100, lenken: 100, farbe: [233, 238, 242] },
  { name: 'Pulverschnee', befahrbar: true, zug: 80, widerstand: 51, haftung: 1600, bremsen: 130, lenken: 70, farbe: [248, 250, 252] },
  // Dickes Eis: zäh beim Anfahren (60 % Zug), dann schnell und rutschig, schlechte Bremsen.
  // Haftung 60/4096 ≈ 1,5 % pro Tick: Rutschen klingt erst nach ~2–3 s ab.
  { name: 'Dickes Eis', befahrbar: true, zug: 60, widerstand: 16, haftung: 60, bremsen: 30, lenken: 60, farbe: [172, 202, 220] },
  // Dünnes Eis: noch glatter. Brechen unter Gewicht kommt in M4.
  { name: 'Dünnes Eis', befahrbar: true, zug: 55, widerstand: 16, haftung: 45, bremsen: 25, lenken: 55, farbe: [205, 226, 236] },
  { name: 'Fels', befahrbar: false, zug: 0, widerstand: 4096, haftung: 4096, bremsen: 100, lenken: 0, farbe: [116, 124, 134] },
  { name: 'Schlucht', befahrbar: false, zug: 0, widerstand: 4096, haftung: 4096, bremsen: 100, lenken: 0, farbe: [52, 66, 82] },
];
