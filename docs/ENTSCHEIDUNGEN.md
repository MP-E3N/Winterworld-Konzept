# Entscheidungen

Jede Entscheidung mit Datum, Begründung und was sie ausschließt. Neue unten anhängen.

## E-001 Gleicher Unterbau wie Kronwege (2026-11-10)
JS-ES-Module + JSDoc/`@ts-check`, Canvas2D, kein Build, keine Engine, Node nur für Tests/Server.
**Warum:** erprobt, der Nutzer kennt ihn, Werkzeuge (Test-Rahmen, Regel-Prüfer, Hash, RNG)
konnten übernommen werden. **Später prüfen:** WebGL, falls Chunks + Zoom in M2 zu langsam werden.

## E-002 Spielform, Multiplayer-Art, Pause, Bergen (2026-11-10, Nutzerwahl)
Durchgehende Welt statt Läufe; Koop + Konkurrenz ohne PvP-Kampf; Pause/Tempo nur im
Einzelspiel; Bergen erst mit Ladebalken, später sichtbare Leute. Details: KONZEPT.md §11.

## E-003 Server-autoritativ mit Client-Vorhersage statt Lockstep (2026-11-10)
**Warum:** Echtzeit-Fahren verträgt keine Eingabeverzögerung, wie Lockstep sie braucht.
**Trotzdem deterministisch** (Ganzzahlen, feste Sinus-Tabelle): Damit lassen sich die eigenen
Eingaben nach einer Server-Korrektur exakt neu abspielen, und Replays/Tests funktionieren.

## E-004 Alle Eingaben sind Befehle, auch Lenken (2026-11-10)
`STEUERN {gas, lenkung}` wird nur bei Änderung gesendet; Gas/Lenkung liegen im Zustand des
Kolosses. **Warum:** ein einziger Eingabeweg für Einzelspiel, Replay und Netz; wenig Netzverkehr.
Werte −100 … 100, damit später ein Gamepad feiner steuern kann.

## E-005 Einheiten: µm, µm/Tick, 65536 = Vollkreis, 20 Ticks/s (2026-11-10)
**Warum µm:** Bei 20 Ticks/s ändert sich das Tempo eines schweren Kolosses pro Tick nur um
Bruchteile eines Millimeters; mit µm bleibt das ganzzahlig genau. Positionen bis ~9 Mio. km sind
noch sichere Ganzzahlen. **Sinus aus fester Tabelle** (`sim/lib/sinus-tabelle.js`), weil
`Math.sin` je nach Browser im letzten Bit anders rechnen darf.

## E-006 Fahrmodell: Weltvektor + Haftung (2026-11-10)
Tempo als Weltvektor, zerlegt in längs/quer. Längs: Schub − Widerstand × Tempo (ergibt die
Höchsttempi je Druckstufe), Bremse, Ausrollen. Quer: Haftung je Untergrund. Lenken dreht nur den
Bug. **Warum:** einfach, ganzzahlig, und Eis-Rutschen entsteht von selbst aus der Haftung.

## E-008 Wind gehört in den Spielzustand, Rauch/Ruß/Spuren nicht (2026-11-10)
Wind (`state.wetter`, Zustand v2) wird mit dem Simulations-Zufall gewürfelt. **Warum:** Er soll
später Kälte, Verbrauch und Verwehungen beeinflussen — dann muss er auf allen Rechnern gleich sein.
Rauch, Dampf, Ruß, Schlacke, Spuren und Schneetreiben sind reine Optik in `render/` (eigener
Zufall, gehen beim Neustart verloren). Soll Ruß einmal Spielwirkung haben (z. B. Spuren lesen,
andere Kolosse verfolgen), muss er in den Zustand umziehen.

## E-009 Welt = Seed, Zellen nie im Zustand; Seed 0 = Testgelände (2026-11-10, M2)
Jede Zelle wird bei Bedarf aus Seed und Koordinaten berechnet (`sim/welt/generator.js`) und in
einem Chunk-Speicher gehalten, der kein Spielzustand ist. Nur Ganzzahl-Rauschen, weil Fels und
Schlucht Spielregeln sind (Kollision) und auf allen Rechnern gleich sein müssen. Spätere
Änderungen an der Welt (gebrochenes Eis, geplünderte Fundstellen) kommen als Änderungsliste in den
Zustand (KONZEPT.md §8 Regel 7). Seed 0 bleibt das feste Testgelände für Tests und Fahrgefühl.
Darstellung in eigenen Kacheln (3 Detailstufen) mit Zeitbudget pro Bild.

## E-007 Testgelände in M1 (2026-11-10)
Vier feste Kreise (Eis, Pulverschnee) in `data/testgelaende.js`, damit das Fahrgefühl auf
verschiedenen Böden schon vor dem Generator testbar ist. `sim/welt/untergrund.js` ist die einzige
Abfrage; M2 ersetzt nur deren Inneres.
