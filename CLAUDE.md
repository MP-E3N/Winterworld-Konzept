# Eiskoloss — Arbeitsregeln für KI-Agenten

Kurz und verbindlich. Das Konzept steht in `KONZEPT.md`, der aktuelle Stand in `HANDOFF.md`,
die Begründungen in `docs/ENTSCHEIDUNGEN.md`.
**Zu Beginn jeder Sitzung:** `HANDOFF.md` lesen. **Am Ende:** `HANDOFF.md` aktualisieren.

Vorbild ist das Schwesterprojekt `..\Kronwege` (gleicher Unterbau, gleiche Kommentar-Regeln).
Dessen „Gelernte Regeln“ gelten hier sinngemäß mit.

## Technik
- JavaScript mit ES-Modulen, `// @ts-check` + JSDoc in jeder Datei, Typen in `sim/types.js`.
- Kein Build, kein Framework, keine Fremdbibliothek ohne Eintrag in `docs/ENTSCHEIDUNGEN.md`
  und Zustimmung des Nutzers. Node nur für Tests und (ab M6) den Server.
- Imports relativ mit `.js`-Endung. Lokal testen über `Projekte\serve.ps1` (Vorschau „eiskoloss“,
  Port 5176), nicht über `file://`.

## Schichten
| Ordner | darf | darf nicht |
|---|---|---|
| `sim/` | Zustand ändern (nur `befehle.js` und Systeme aus `tick.js`) | Browser, echte Zeit, Fließkomma-Mathe, äußere Schichten importieren |
| `netz/` | Verbindung: Befehle annehmen, `schritt()` ausführen, Pause/Tempo | Spielregeln |
| `game/` | Takt (Akkumulator), Überblendung | Zustand schreiben |
| `eingabe/` | Tasten/Maus → Befehle über `verbindung.senden()` | Zustand schreiben |
| `render/`, `ui/`, `debug/` | lesen und zeichnen | Zustand schreiben |
| `data/` | Spielwerte und Optik-Werte | Logik |

## Harte Regeln (der Regel-Prüfer `tests/regeln.test.js` erzwingt die meisten)
1. Der Zustand ändert sich **nur** über Befehle (`sim/befehle.js`) und Tick-Systeme (`sim/tick.js`).
   Auch Lenken und Gas sind Befehle (`STEUERN`) — das ist die Multiplayer-Schnittstelle.
2. In `sim/` verboten: `document`, `window`, `Math.random`, `Date`, `performance`, Timer, `fetch`,
   `Math.sin/cos/atan2/sqrt/pow…`, `**`, `new Map/Set`, `class`, `localeCompare`.
   Winkel über `sim/lib/winkel.js` (Tabelle), Zufall über `sim/lib/rng.js`.
3. Nur Ganzzahlen im Zustand. Einheiten: Strecke µm, Tempo µm/Tick, Winkel 65536 = Vollkreis
   (siehe `data/koloss.js`). Teilen mit `teile()` (schneidet Richtung 0 ab).
4. Zustand = reines JSON, Verweise nur über IDs, Listen mit Index = ID.
5. Systeme laufen in fester Reihenfolge, Kolosse in ID-Reihenfolge.
6. Spielwerte stehen in `data/`, nie als Zahl mitten im Code.
7. Nie feste Spielernummer 0 außerhalb von `sim/`: immer `verbindung.spieler`.
8. Pause und Tempo gehören der Verbindung, nicht der Simulation.

## Kommentar-Standard (Pflicht — der Nutzer will den Code selbst verstehen)
Kommentare auf **Deutsch**. Dateikopf mit ZWECK / LIEST / SCHREIBT / REGEL / DEBUG.
Funktionen mit deutschem JSDoc; nicht offensichtliches Verhalten mit einer Zeile **WARUM**.
Festkomma-Werte immer mit Einheit kommentieren. Lange Dateien mit `// ── Abschnitt ──` gliedern.

## Größe
Datei < 300 Zeilen (harte Grenze 400), Funktion < 50 Zeilen. Erst suchen, dann schreiben.

## Tests und Abschluss
- Vor jedem Commit: `powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1` → „ALLES GRUEN“
  (Typprüfung, Fahrphysik, Determinismus, Speichern/Laden, Replay, Regel-Prüfer).
- Neue Testdatei → in `tests/alle.js` eintragen.
- Replay (`tests/replays/m1-fahren.json`) nur bei **absichtlicher** Regeländerung neu aufnehmen:
  `node tools/replay-aufnehmen.js` — und das im Chat und in der Commit-Nachricht sagen.
- Fahrwerte geändert? Erst `tests/fahren.test.js` laufen lassen; die Tests beschreiben das
  gewollte Fahrgefühl (Höchsttempi, Bremsweg, Kurvenradius, Rutschen auf Eis).
- Commits nur nach Freigabe des Nutzers. Commit-Nachricht auf Deutsch, Präsens.
- Neue Erkenntnis oder wiederholter Fehler → eine Regel unter „Gelernte Regeln“ ergänzen.

## Gelernte Regeln
- **Versteckte Vorschau:** Ist das Browser-Fenster versteckt, läuft `requestAnimationFrame` kaum
  oder gar nicht. Dann `ek.step(n)` nutzen, Tasten-Befehle mit
  `(await import('/eingabe/tastatur.js')).steuerungSenden(ek.spiel)` auslösen und
  `(await import('/render/zeichnen.js')).bildZeichnen(ctx, ek.spiel, 16)` direkt aufrufen.
  Screenshots hängen dann ein Bild hinterher — zweimal aufnehmen (M1, 2026-11-10).
- **„Annähern um x %“ mit Ganzzahlen bleibt kurz vor dem Ziel hängen:** 20 % von 4 = 0,8 →
  abgeschnitten 0. So drehte sich der Koloss ewig mit Drehung −4 (Spieltest 1). Bei jeder
  prozentualen Annäherung mindestens ±1 Schritt gehen (`drehSchritt()` in `sim/koloss/fahren.js`).
- **Das Tempo dreht nicht mit dem Bug mit** (`sim/koloss/fahren.js` Schritt 5). Wer das „repariert“,
  macht Eis so griffig wie Schnee. Der Test „auf Eis folgt die Bewegung der Lenkung kaum“ fängt das.
