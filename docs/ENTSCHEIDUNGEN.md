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

## E-010 Maschinentelegraf statt Gas und „Tempo halten“ (2026-11-10, Spieltest M2b, Nutzerwunsch)
W/S geben kein Gas mehr, sondern stellen einen Maschinentelegrafen wie auf alten Dampfschiffen
eine Stellung weiter (9 Stellungen von „Voll zurück“ bis „Äußerste Kraft voraus“, `TELEGRAF` in
data/koloss.js). Die Maschine regelt das Tempo selbst (Vorsteuerung + Korrektur, bremst beim
Herunterschalten sanft). Befehl `TELEGRAF {stufe}`, Zustand v4 (`telegraf` statt `tempomat`).
Der Befehl `TEMPOMAT` ist entfallen. `STEUERN.gas` bleibt als Handgas (Tests, später Gamepad) und
übersteuert den Telegrafen, solange es ≠ 0 ist. Die Vorwärts-Tempi Langsam/Halb/Voll/Äußerste
entsprechen den Kesselstufen 1–4 auf Packschnee; schafft der Kessel die Stellung nicht, zittert die
Manometer-Nadel (`kesselUeberlastet()`). Replay deshalb neu aufgenommen.

## E-011 Drehpunkt an den Traktionsrädern; Scheinwerfer im Spielzustand (2026-11-10, Spieltest M2b)
Die Position eines Kolosses im Zustand ist der Drehpunkt in der Mitte der drei ungelenkten
Traktionsräder, nicht die Rumpfmitte (`RUMPF_VOR_DREHPUNKT_M` = 4,8 m). Ein allradgelenktes
Fahrzeug dreht sich um seine starre Achse; seit der Verlängerung nach vorn sah die Drehung um die
Rumpfmitte falsch aus. Die Fahrphysik bleibt unverändert (sie rechnete schon „am Bezugspunkt“),
nur Kollision und Darstellung rechnen den Versatz ein.
Scheinwerfer (`licht` 0/1, Befehl `LICHT`) gehören in den Zustand, nicht nur in die Darstellung:
Später hängen Sicht (Nacht, Sturm) und das, was Mitspieler sehen, davon ab. Wie dunkel es ist, ist
bis M4 nur Darstellung (`ek.nacht()`); ab M4 kommt die Tageszeit in den Zustand. Zustand v5.

## E-012 Lenken über einen Kurvenradius statt fester Drehrate (2026-11-10, Spieltest M2b)
Bisher drehte der Koloss ab 8 km/h immer mit 10°/s — egal wie schnell; darunter anteilig. Das sah
aus, als drehe er sich um einen Punkt. Jetzt gilt: Drehung je Tick = gefahrener Weg / Kurvenradius
(`WENDE_RADIUS` 20 m, seit Teil 5 32 m, bei vollem Einschlag, Winkel über `WINKEL_JE_RAD`, nur Ganzzahlen). Ein Rad-
fahrzeug dreht sich nur, während es rollt. `DREH_MAX` bleibt als Obergrenze für schnelle Fahrt
(400 Tonnen, dann wird der Bogen weiter). Replay deshalb neu aufgenommen.

## E-013 Dreck und Radabdrücke als vorgerenderte Sprites (2026-11-10, Spieltest M2b, Nutzerwunsch)
Statt jeden Rußfleck und jedes Schlackekorn als einzelnen Kreis zu malen, erzeugt
`render/sprites.js` beim ersten Gebrauch je Sorte 16–32 unterschiedliche Bildchen. Ein Fleck ist
ein Bild (zufällig gewählt, gedreht, skaliert) — so wiederholt sich kein Muster, und es sind weit
weniger Zeichenbefehle. Flecken bleiben einzelne Objekte mit eigenem Alter (verblassen einzeln).
Leistung: Je Sorte liegen alle Varianten auf EINEM Atlas-Bild. Seit Teil 8 (Nutzer: 16 Bilder/s
in dichten Rußfeldern) werden Flecken und Radabdrücke beim Ablegen einmal in Welt-Kacheln
(32 m, 8 px/m) eingebrannt; pro Bild werden nur die sichtbaren Kacheln gezeichnet. Kacheln
verblassen gemeinsam (alle 20 s ein Stück) statt jeder Fleck einzeln — Preis: Aus großer Nähe sind
die Flecken leicht weicher (8 px/m). Rauch wird in halber Auflösung gemalt.

## E-014 Fundstellen aus dem Seed, geborgen als Änderungsliste, Trupp je Koloss (2026-11-10, M3)
Fundstellen werden wie das Gelände aus dem Seed berechnet (eine je 200-m-Fundzelle, ID = gepackte
Zellnummer) und stehen nie im Zustand. Im Zustand steht nur, was angebrochen ist:
`state.geborgen[] = {fund, rest}` (KONZEPT §8 R7). Jeder Koloss bekommt beim Beitritt genau einen
Trupp (`state.trupps[]`, Index = ID, `fund = -1` = an Bord) — so bleibt die Liste ohne Löcher und
der Trupp kann in M7 eine Position bekommen. **Nutzerentscheidungen:** vier Arten (Kohle, Holz, Öl,
Vorräte), Bergen nur im Stand (Telegraf Stopp, fast 0 km/h — auf Eis klingt Rutschen in Ganzzahlen
nie ganz auf 0 ab), Nebel später. **Gewicht** senkt den Schub linear bis −25 % bei vollem Laderaum
(60 t); leer ist alles exakt wie vorher. Zustand v6, Replay neu aufgenommen (Testfahrt birgt zuerst Kohle).

## E-015 Träger Dampf, Brennstoff aus dem Laderaum, Tageszeit aus dem Tick (2026-11-10, M4a)
Nutzerentscheidungen: Tag = 20 min, Verbrauch „mittel“, Brennstoff selbst wählen, Druck träge.
`k.druck` bleibt die eingestellte Feuerstufe (Befehl DRUCK), neu ist `k.dampf` (Tausendstel-Stufen),
aus dem der Schub gleitend berechnet wird. Brennstoff liegt im normalen Laderaum (wiegt also mit);
Bruchteile eines kg sammelt `k.feuerG`. Kein automatischer Wechsel: leer = Feuer aus.
Die Uhrzeit ist kein eigenes Feld, sondern folgt aus `state.tick` (weniger Zustand, gleiches Ergebnis
auf allen Rechnern). Außentemperatur wird nur berechnet; `k.waerme` ist Zustand, weil sie träge ist.
Fahrtests setzen den Dampf direkt (warmer Kessel), damit sie weiter nur die Physik prüfen.
Zustand v7, Replay neu aufgenommen.

## E-016 Dampfvorrat, Verbrauch nach Dampf, zwei Lager mit Abwerfen (2026-11-10, Spieltest M4a)
Nutzerwunsch: Wer mehr Leistung verlangt, als der Kessel hergibt, soll den Druck fallen sehen (statt
zitternder Nadel), damit man zwischen „langsam und sparsam“ und „schnell und verschwenderisch“ wählt.
Darum ist `k.dampf` ein Vorrat: Feuer füllt (begrenzt durch die Feuerstufe), Maschine entnimmt
Schub × Tempo; der höchste Schub hängt am Druck. Weil der Widerstand mit dem Tempo wächst, kostet
ein km bei Volldampf fast das Dreifache wie bei „Schwach“. Die Heizer legen nur nach, was gebraucht
wird (Nutzerentscheidung) — im Stand mit vollem Kessel brennt nur die Glut. `hoechstTempo`,
`kesselUeberlastet` und das Zittern sind entfernt.
Lager: Nutzerwunsch Brennstofflager 100 t + Warenlager (Nutzerwahl 60 t), Holz passt in beide.
`k.ladung` ist durch `k.lager` ersetzt (`sim/koloss/lager.js` als einzige Stelle). Abgeworfenes wird
ein Haufen im Zustand (`state.abwuerfe`, Index = ID, leere bleiben mit kg 0), den jeder wieder
aufnehmen kann — vorbereitet für Multiplayer. Zustand v8, Replay neu.

## E-017 Heizung als Thermostat, Feuerstufe = Tempo des Druckanstiegs (2026-11-11, Spieltest M4a-2)
Nutzerwunsch: Die Heizung hält immer +23 °C (`HEIZUNG_ZIEL`) und verbrennt dafür so viel, wie der
Kessel allein nicht schafft (`HEIZUNG_MG_JE_ZEHNTEL` je Zehntel °C Lücke) — vorher +15 °C pauschal,
dadurch je nach Außentemperatur mal +10, mal +30 °C. Ist es ohne Heizung warm genug, kostet sie nichts.
Kessel: Die Feuerstufe begrenzte schon vorher nur die Nachfüll-Geschwindigkeit, nicht das Maximum
(im Stand wird jede Stufe voll: Schwach ≈ 2¼ min, Mittel ≈ 40 s, Stark ≈ 20 s, Volldampf ≈ 12 s).
Der Eindruck „Stufe = Höchstdruck“ kam von der Manometer-Skala 0–4 (gleiche Ziffern wie die Stufen)
und vom Fahren, wo sich der Druck dort einpendelt, wo Feuer und Verbrauch gleich sind. Darum nur die
Anzeige geändert (Testversion, Branch `test-kessel`): Manometer in Prozent, eigener Feuer-Zeiger
darüber, Zeile „Kessel“ mit „Druck x % ▲/▼“. Kein neuer Zustand, Replay unverändert.

## E-007 Testgelände in M1 (2026-11-10)
Vier feste Kreise (Eis, Pulverschnee) in `data/testgelaende.js`, damit das Fahrgefühl auf
verschiedenen Böden schon vor dem Generator testbar ist. `sim/welt/untergrund.js` ist die einzige
Abfrage; M2 ersetzt nur deren Inneres.
