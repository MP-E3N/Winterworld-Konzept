# Spec M5a — Schneestürme mit Vorwarnung

Stand 2026-11-11 · Grundlage: KONZEPT.md §1 (Frostpunk: Stürme angekündigt), §5 (Wetter), §10 (M5) · Entscheidung E-021

## Teile von M5 (Nutzerentscheidung 2026-11-11)
M5a Stürme → M5b Überlebende + Entscheidungen → M5c Reichweiten-Ring → M5d weitere Siedlungen + Aufträge.

## Nutzerentscheidungen für M5a
- **Wirkung:** schlechte Sicht und langsameres Fahren. **Nicht** kälter, Bergen bleibt erlaubt.
- **Vorwarnung:** ein Messing-**Barometer** in der Anzeige, dessen Nadel einige Minuten vorher Richtung
  „Sturm“ fällt (sichtbares Verhalten statt Warntext); dazu zieht am Bildrand auf der Windseite eine
  graue Sturmfront auf.
- **Schutz:** keiner — durchhalten. Auch in der Siedlung wirkt der Sturm.

## Zustand (v12)
`state.wetter` bekommt: `sturm` (aktuelle Stärke 0 … 1000), `sturmAb` (Tick, an dem der nächste/laufende
Sturm beginnt), `sturmBis` (Tick, an dem er endet), `sturmSpitze` (höchste Stärke dieses Sturms).
Der Sturm ist weltweit (alle Kolosse gleich, Multiplayer-tauglich), gewürfelt mit dem Zufall des Zustands.

## Regeln (`sim/wetter/sturm.js`, Tick direkt nach dem Wind)
| Wert | Vorschlag (`data/wetter.js`) |
|---|---|
| erster Sturm | nach 8–14 min Spielzeit |
| Abstand danach | 15–30 min (nach dem Ende des letzten) |
| Dauer | 3–6 min, davon je 40 s Anschwellen und Abflauen |
| Stärke | 600–1000 |
| Vorwarnung | Barometer fällt in den 4 min vor dem Beginn |
| Bremswirkung | Widerstand bis +100 % bei voller Stärke (Schneelast): bei voller Fahrt etwa halbes Tempo; langsame Stellungen hält die Maschine noch, braucht dafür aber mehr Dampf |

Der Wind im Zustand bleibt unverändert (sonst würde es über die Windkälte kälter — nicht gewünscht).
Das starke Wehen ist nur Darstellung.

`barometer(state)` (0 = Sturm … 1000 = schön): schön außerhalb, fällt in der Vorwarnzeit gleichmäßig auf
„Sturm“, bleibt dort während des Sturms und steigt beim Abflauen wieder.

## Anzeige
- **Barometer** (`ui/barometer.js`) unten rechts über der Uhr: Messinggehäuse, Skala „Sturm · Veränderlich · Schön“,
  schwarze Nadel; kein Text.
- **Sturmfront** (vor dem Sturm, Vorwarnzeit): grauer Dunst am Bildrand, aus dem der Wind kommt.
- **Sicht** (`render/sturm.js`): weiß-grauer Schleier über der Welt mit einem freien Kreis um den eigenen
  Koloss (bei voller Stärke ~70 m), darüber vom Wind getriebene Schneestreifen (ein vorgerendertes Muster,
  verschoben — keine Einzelteilchen, Leistung). Scheinwerfer schneiden den Schleier ein Stück auf.
  Halbe Auflösung wie Dunkelheit und Rauch. In der Fernansicht nur halb so dicht (Karte bleibt lesbar).
- Konsole: `ek.sturm(x)` zeigt den Schleier probehalber (0 … 1, `null` = wieder echt), `ek.wetter()` sagt,
  wann der nächste Sturm kommt. F3-Zeile „Sturm“.

## Tests (`tests/sturm.test.js`)
Erster Sturm im Fenster und deterministisch; Stärke steigt, hält, fällt, danach ist der nächste geplant;
Barometer fällt vor dem Sturm; im Sturm ist das Höchsttempo spürbar kleiner. Replay neu (v12).

## Später
Stürme häufiger/stärker in äußeren Ringen (M5c), Windschatten, Sturm-Kälte (nur auf Wunsch).
