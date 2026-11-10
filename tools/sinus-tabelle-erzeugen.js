// @ts-check
/**
 * sinus-tabelle-erzeugen.js — Schreibt sim/lib/sinus-tabelle.js (einmalig, Ergebnis wird committet).
 * Aufruf: `node tools/sinus-tabelle-erzeugen.js`
 *
 * ZWECK:    Die Simulation darf Math.sin nicht benutzen (kann je nach Browser im letzten Bit
 *           anders rechnen → Multiplayer läuft auseinander). Deshalb liegt eine feste Tabelle
 *           als Zahlen im Code. Dieses Werkzeug rechnet sie EINMAL mit Math.sin aus.
 * LIEST:    —
 * SCHREIBT: sim/lib/sinus-tabelle.js
 * REGEL:    CLAUDE.md Regel 2 (kein Math.sin in sim/)
 * DEBUG:    tests/trig.test.js prüft die Tabelle gegen Math.sin (±1).
 *
 * Format: Viertelwelle mit 1025 Werten (Index 0 … 1024 = 0° … 90°), Festkomma ×16384.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHRITTE = 1024; // Schritte pro Viertelkreis
const EINS = 16384;    // Festkomma-Eins (Q14)

/** @type {number[]} */
const werte = [];
for (let i = 0; i <= SCHRITTE; i++) werte.push(Math.round(Math.sin((i / SCHRITTE) * (Math.PI / 2)) * EINS));

// 16 Zahlen pro Zeile, damit die Datei unter der Zeilengrenze bleibt.
const zeilen = [];
for (let i = 0; i < werte.length; i += 16) zeilen.push('  ' + werte.slice(i, i + 16).join(', ') + ',');

const text = `// @ts-check
/**
 * sinus-tabelle.js — ERZEUGT von tools/sinus-tabelle-erzeugen.js. Nicht von Hand ändern.
 *
 * ZWECK:    Feste Sinus-Viertelwelle für sim/lib/winkel.js (Index 0…1024 = 0°…90°, Wert ×16384).
 * REGEL:    CLAUDE.md Regel 2 (kein Math.sin in sim/)
 */

/** @type {readonly number[]} */
export const SINUS_VIERTEL = [
${zeilen.join('\n')}
];
`;
writeFileSync(path.join(WURZEL, 'sim', 'lib', 'sinus-tabelle.js'), text);
console.log(`sinus-tabelle.js geschrieben (${werte.length} Werte).`);
