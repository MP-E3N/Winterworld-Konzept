// @ts-check
/**
 * regeln.test.js — Regel-Prüfer: erzwingt die Architektur-Regeln mechanisch.
 *
 * ZWECK:    Liest den Quelltext und schlägt Alarm bei verbotenen Wörtern in sim/, bei
 *           Schreibzugriffen der Oberfläche auf den Zustand und bei zu großen Dateien.
 *           WARUM: KI-Agenten (und Menschen) vergessen Regeln. Ein Test vergisst nie.
 * REGEL:    CLAUDE.md „Harte Architektur-Regeln“
 * NEUES VERBOT: unten in VERBOTEN_IN_SIM ergänzen (und eine Zeile im Selbsttest).
 * Läuft nur unter Node (braucht Dateizugriff); im Browser wird er übersprungen.
 */

import { test, pruefe, gleich, ueberspringen } from './harness.js';

/** Verbotene Muster in sim/ mit Begründung. */
const VERBOTEN_IN_SIM = [
  { muster: /\bMath\.random\b/, warum: 'R4: Zufall nur über sim/lib/rng.js' },
  { muster: /\bDate\b/, warum: 'R4: keine echte Uhrzeit in der Simulation' },
  { muster: /\bperformance\b/, warum: 'R4: keine echte Zeit' },
  { muster: /\b(document|window|localStorage|requestAnimationFrame)\b/, warum: 'R2: kein Browser in sim/' },
  { muster: /\b(setTimeout|setInterval|fetch)\b/, warum: 'R2: keine Timer/Netz in sim/' },
  { muster: /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|pow|exp|log|log2|log10|sqrt|cbrt|hypot)\b/,
    warum: 'R5: rechnet je nach Browser minimal anders → Desync' },
  { muster: /\*\*/, warum: 'R5: Potenz-Operator ist Fließkomma' },
  { muster: /\bnew (Map|Set|WeakMap|WeakSet)\b/, warum: 'R6: kein reines JSON' },
  { muster: /\bclass\s+\w/, warum: 'R6: Zustand ohne Klassen' },
  // Kronwege-Pflege nach M3: Sortieren und Formatieren nach Sprache hängt vom Browser und vom
  // Betriebssystem ab. In sim/ würde das zwei Rechner auseinanderlaufen lassen.
  { muster: /\b(localeCompare|toLocale\w*|Intl)\b/, warum: 'R4: Ergebnis hängt von Sprache/Browser ab → Desync' },
  { muster: /from\s+['"]\.\.\/(\.\.\/)?(ui|render|game|debug|netz|eingabe)\//, warum: 'R2: sim/ darf keine äußeren Schichten importieren' },
];

/**
 * Schreibzugriffe auf den Zustand, z. B. `state.tempo = 2` oder `spiel.state.tick++`.
 * Erlaubt bleiben Vergleiche (===) und reines Lesen.
 */
const ZUSTAND_SCHREIBEN = /\b(?:state|zustand\(\))(\.\w+|\[[^\]]+\])+\s*(=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/;
// Eiskoloss: Außerhalb von sim/ kommt der Zustand über `verbindung.zustand()` — deshalb zählt
// `zustand()` überall genauso wie `state`.

/**
 * Verändernde Array-Methoden direkt am Zustand, z. B. `spiel.state.karawanen.push(…)`.
 * Lücke in Kronwege bis zur Pflege nach M3: Nur Zuweisungen wurden erkannt, nicht diese Aufrufe.
 */
const ZUSTAND_VERAENDERN = /\b(?:state|zustand\(\))(\.\w+|\[[^\]]+\])*\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\(/;

/**
 * Findet Kurznamen für (Teile des) Zustands, z. B. `const s = spiel.state;` oder
 * `const p = spiel.state.provinzen[id];`. Über so einen Namen könnte man unbemerkt schreiben
 * (`s.tempo = 2`), deshalb werden auch diese Namen geprüft (Pflege 2026-11-05).
 * @param {string} text  Quelltext ohne Kommentare
 * @returns {string[]} die gefundenen Kurznamen
 */
function zustandsKurznamen(text) {
  /** @type {string[]} */
  const namen = [];
  // Nur reine Pfade in den Zustand zählen (`= spiel.state;`, `= spiel.state.provinzen[id];`),
  // nicht Texte oder Funktionsaufrufe, in denen „state“ nur vorkommt (Fehlalarme in M3).
  // GRENZE: Kurznamen gelten für die ganze Datei (keine Gültigkeitsbereiche). Heißt der
  // Zustand in einer Funktion `s`, darf `s` in derselben Datei nicht für etwas anderes stehen.
  for (const m of text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*[\w.]*\b(?:state\b|zustand\(\))(?:\.\w+|\[[^\]\n]+\])*\s*;/g)) namen.push(m[1]);
  // Schleifenvariablen über Zustandslisten, z. B. `for (const k of spiel.state.karawanen)`.
  // Über `k.bewacht = true` könnte man sonst unbemerkt schreiben (Kronwege, Pflege nach M3).
  for (const m of text.matchAll(/for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+[\w.]*\b(?:state\b|zustand\(\))(?:\.\w+|\[[^\]\n]+\])*\s*\)/g)) namen.push(m[1]);
  // Rückgabe von kolossVon(…) ist ein Stück Zustand: `const k = kolossVon(s, 0);` → k.x = … verboten.
  for (const m of text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*kolossVon\(/g)) namen.push(m[1]);
  return namen;
}

/**
 * Baut die Prüfmuster für einen Kurznamen: Zuweisung an ein Feld (`s.x = …`, `s[i]++`) und
 * verändernde Array-Methoden (`s.liste.push(…)`). Das bloße Neuzuweisen des Namens selbst
 * (`s = …`) ist erlaubt, es ändert den Zustand nicht.
 * @param {string} name
 * @returns {RegExp[]}
 */
function schreibMuster(name) {
  const feld = String.raw`(\.\w+|\[[^\]]+\])`;
  return [
    // (?<![.\w]) = der Kurzname steht vorne, nicht als Feldname hinter einem Punkt (z.text …).
    new RegExp(String.raw`(?<![.\w])` + name + feld + String.raw`+\s*(=(?!=|>)|\+=|-=|\*=|\/=|\+\+|--)`),
    new RegExp(String.raw`(?<![.\w])` + name + feld + String.raw`*\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\(`),
  ];
}

/** Ordner, die den Zustand nur LESEN dürfen (Regel R1). */
const NUR_LESEN = ['ui', 'render', 'debug', 'eingabe', 'game'];

/** Harte Dateigrenze aus CLAUDE.md. */
const MAX_ZEILEN = 400;

/**
 * Entfernt Kommentare, damit erklärende Texte („kein Math.random hier“) nicht anschlagen.
 * Einfaches Verfahren: Es genügt, solange keine Zeichenkette in sim/ „//“ oder „/*“ enthält.
 * @param {string} text
 * @returns {string}
 */
function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

test('Regel-Prüfer erkennt Verstöße wirklich (Selbsttest)', () => {
  // WARUM: Ein Prüfer, der nie anschlägt, sieht genauso aus wie einer, der kaputt ist.
  const boese = 'const x = Math.random();\nstate.tick = 5;';
  pruefe(VERBOTEN_IN_SIM.some((v) => v.muster.test(ohneKommentare(boese))), 'Math.random nicht erkannt');
  pruefe(ZUSTAND_SCHREIBEN.test('state.tick = 5;'), 'Schreibzugriff nicht erkannt');
  pruefe(!ZUSTAND_SCHREIBEN.test('if (state.tick === 5)'), 'Vergleich fälschlich als Schreiben erkannt');
  pruefe(!VERBOTEN_IN_SIM.some((v) => v.muster.test(ohneKommentare('// kein Math.random hier'))),
    'Kommentar fälschlich erkannt');
  // Kurznamen: Schreiben über `s` muss auffallen, Lesen und Vergleichen nicht.
  const kurz = zustandsKurznamen('const s = spiel.state;\nconst p = spiel.state.provinzen[3];');
  pruefe(kurz.includes('s') && kurz.includes('p'), `Kurznamen nicht gefunden: ${kurz}`);
  const [zuweisung, methode] = schreibMuster('s');
  pruefe(zuweisung.test('s.tempo = 2;') && zuweisung.test('s.provinzen[3].besitzer = 1;'), 'Schreiben über Kurznamen nicht erkannt');
  pruefe(methode.test('s.ereignisse.push(x);'), 'push über Kurznamen nicht erkannt');
  pruefe(!zuweisung.test('if (s.tempo === 0)') && !zuweisung.test('const t = s.tempo;'), 'Lesen fälschlich als Schreiben erkannt');
  pruefe(!methode.test('s.ereignisse.slice(-6).map(f)'), 'slice fälschlich als Verändern erkannt');
  // Fehlalarme aus Kronwege M3 dürfen nicht wiederkommen:
  gleich(zustandsKurznamen('const text = `${sp.state.provinzen[0].name}`;').length, 0, 'Text mit state ist kein Kurzname');
  gleich(zustandsKurznamen('const nach = auswahl(spiel.state.provinzen);').length, 0, 'Funktionsaufruf ist kein Kurzname');
  pruefe(!schreibMuster('text')[0].test('z.text.textContent = text;'), 'Feldname hinter Punkt fälschlich erkannt');
  // Lücken aus Kronwege (Pflege nach M3):
  pruefe(ZUSTAND_VERAENDERN.test('spiel.state.karawanen.push(x);'), 'push direkt am Zustand nicht erkannt');
  pruefe(!ZUSTAND_VERAENDERN.test('const l = spiel.state.karawanen.filter(f);'), 'filter fälschlich als Verändern erkannt');
  pruefe(zustandsKurznamen('for (const k of spiel.state.karawanen) {').includes('k'), 'Schleifenvariable nicht als Kurzname erkannt');
  pruefe(VERBOTEN_IN_SIM.some((v) => v.muster.test('a.name.localeCompare(b.name)')), 'localeCompare in sim/ nicht erkannt');
  // Eiskoloss: Zustand kommt außerhalb von sim/ über verbindung.zustand().
  pruefe(ZUSTAND_SCHREIBEN.test('v.zustand().tick = 3;'), 'Schreiben über zustand() nicht erkannt');
  pruefe(zustandsKurznamen('const s = verbindung.zustand();').includes('s'), 'Kurzname über zustand() nicht erkannt');
  pruefe(zustandsKurznamen('const k = kolossVon(s, v.spieler);').includes('k'), 'Kurzname über kolossVon nicht erkannt');
  pruefe(zustandsKurznamen('for (const k of v.zustand().kolosse) {').includes('k'), 'Schleife über zustand() nicht erkannt');
  pruefe(VERBOTEN_IN_SIM.some((v) => v.muster.test("import { x } from '../netz/lokal.js';")), 'Import aus netz/ in sim/ nicht erkannt');
});

test('Regeln: keine verbotenen Muster in sim/', async (u) => {
  if (!u.dateienLesen) ueberspringen('braucht Dateizugriff (nur unter Node)');
  /** @type {string[]} */
  const funde = [];
  for (const datei of await u.dateienLesen('sim')) {
    ohneKommentare(datei.text).split('\n').forEach((zeile, i) => {
      for (const v of VERBOTEN_IN_SIM) {
        if (v.muster.test(zeile)) funde.push(`${datei.pfad}:${i + 1}  ${v.warum}\n          ${zeile.trim()}`);
      }
    });
  }
  pruefe(funde.length === 0, 'Verstöße:\n        ' + funde.join('\n        '));
});

test('Regeln: ui/, render/, debug/, eingabe/, game/ schreiben nicht in den Zustand (R1)', async (u) => {
  if (!u.dateienLesen) ueberspringen('braucht Dateizugriff (nur unter Node)');
  /** @type {string[]} */
  const funde = [];
  for (const ordner of NUR_LESEN) {
    for (const datei of await u.dateienLesen(ordner)) {
      const text = ohneKommentare(datei.text);
      const muster = [ZUSTAND_SCHREIBEN, ZUSTAND_VERAENDERN, ...zustandsKurznamen(text).flatMap(schreibMuster)];
      text.split('\n').forEach((zeile, i) => {
        if (muster.some((m) => m.test(zeile))) funde.push(`${datei.pfad}:${i + 1}  ${zeile.trim()}`);
      });
    }
  }
  pruefe(funde.length === 0, 'Schreibzugriffe (nur Befehle erlaubt):\n        ' + funde.join('\n        '));
});

test('Regeln: Oberfläche nutzt verbindung.spieler statt fester Spielernummer 0 (Multiplayer)', async (u) => {
  if (!u.dateienLesen) ueberspringen('braucht Dateizugriff (nur unter Node)');
  // WARUM: Im Multiplayer hat jeder Rechner eine andere Spielernummer (Lehre aus Kronwege).
  const muster = /\bspieler\s*(===|==|!==|:)\s*0\b/;
  pruefe(muster.test('h.spieler === 0') && !muster.test('h.spieler === verbindung.spieler'), 'Selbsttest des Musters');
  /** @type {string[]} */
  const funde = [];
  for (const ordner of ['ui', 'render', 'debug', 'game', 'eingabe']) {
    for (const datei of await u.dateienLesen(ordner)) {
      ohneKommentare(datei.text).split('\n').forEach((zeile, i) => {
        if (muster.test(zeile)) funde.push(`${datei.pfad}:${i + 1}  ${zeile.trim()}`);
      });
    }
  }
  pruefe(funde.length === 0, 'feste Spielernummer:\n        ' + funde.join('\n        '));
});

test(`Regeln: keine Datei über ${MAX_ZEILEN} Zeilen`, async (u) => {
  if (!u.dateienLesen) ueberspringen('braucht Dateizugriff (nur unter Node)');
  const zuGross = (await u.dateienLesen('.'))
    .map((d) => ({ pfad: d.pfad, zeilen: d.text.split('\n').length }))
    .filter((d) => d.zeilen > MAX_ZEILEN);
  pruefe(zuGross.length === 0, 'Aufteilen: ' + zuGross.map((d) => `${d.pfad} (${d.zeilen})`).join(', '));
});

test('Regeln: jede Datei beginnt mit // @ts-check', async (u) => {
  if (!u.dateienLesen) ueberspringen('braucht Dateizugriff (nur unter Node)');
  const ohne = (await u.dateienLesen('.')).filter((d) => !d.text.startsWith('// @ts-check')).map((d) => d.pfad);
  pruefe(ohne.length === 0, 'fehlt in: ' + ohne.join(', '));
});
