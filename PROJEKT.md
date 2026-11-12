# Eiskoloss (Arbeitstitel, evtl. „Winterworld“)

> Ein gepanzerter Dampfkoloss zieht durch eine erfrorene Welt. Jede Schaufel Kohle ist Wärme,
> Tempo und Zeit. Jeder Überlebende, den du aufnimmst, ist eine Hand mehr und ein Mund mehr.

2D-Frost-Survival im Browser, von oben gesehen. Du **bist** der Koloss: ein 40 m langes,
400 Tonnen schweres Dampffahrzeug mit Allradlenkung, das du mit **WASD** durch eine unbegrenzte, vereiste Welt
steuerst. Du birgst Kohle, Holz, Öl, Nahrung, Ersatzteile und Überlebende und hältst Kessel,
Crew und Rumpf am Leben — allein oder später mit 2–4 anderen Kolossen in derselben Welt
(Koop + Konkurrenz, kein Kampf). Eigene Welt im Stil des Frostpunk-Genres, aber ohne dessen
Namen, Lore oder Grafik.

**Stand 2026-11-11:** M0 Gerüst, M1 Fahren, M2 Welt, M3 Fundstellen & Bergen und M4a–c (Kessel,
Tag/Nacht, Kälte, Crew, Liegenbleiben) und M4d Heimstatt (Depot, Crew, Speichern) sind spielbar.
**M5a Schneestürme** (Barometer, schlechte Sicht, Schneelast) und **M5b Rettungsauftrag** (Szenario: von der
Stadt mit Generator aus Überlebende ~5 km entfernt finden; Karte unter Schneewehen, Signalballons als Wegweiser,
knappe Rohstoffe) sind gebaut und warten auf den Spieltest.

---

## Schnellstart

| Was | Wie |
|---|---|
| Spielen | Vorschau „eiskoloss“ (`.claude/launch.json`) bzw. `..\serve.ps1 -Port 5176 -Root Eiskoloss` → http://localhost:5176/ |
| Testen | `powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1` → muss „ALLES GRUEN“ melden |
| Welt ansehen | `node tools/welt-ansehen.js <seed> [meter]` (Text-Karte) |
| Konsole (F12) | `ek.neu(0)` Testgelände · `ek.step(n)` · `ek.untergrund()` · `ek.kacheln()` · `ek.nacht(0.85)` · `ek.funde()` · `ek.ladung()` · `ek.replay()` |

Nicht über `file://` öffnen (ES-Module brauchen einen Server). Kein Build, keine Installation
nötig — Node wird nur für Tests gebraucht (später auch für den Server).

## Steuerung

| Taste | Wirkung |
|---|---|
| W / S (↑ / ↓) | Maschinentelegraf eine Stellung voraus / zurück — die Maschine hält das Tempo selbst |
| A / D (← / →) | Lenken (Allradlenkung; dreht nur beim Rollen, Wendekreis 32 m) |
| Q / E | Feuer runter / rauf (5 Stufen) — füllt den Dampfvorrat; wer mehr verlangt, sieht den Druck fallen |
| B, Klick auf den Wahlschalter | Brennstoff: Kohle, Holz (brennt doppelt so schnell), Öl (halb so schnell) |
| O, Klick auf den Ofen | Heizung an Bord an/aus (wärmt, kostet Brennstoff) |
| I, Klick auf den Koloss | Lager-Popup: Brennstofflager 100 t, Warenlager 60 t, abwerfen, Holz umlagern |
| Klick auf den Telegrafen | Hebel direkt auf eine Stellung stellen |
| L, Klick auf die Öllampe | Scheinwerfer an/aus |
| Linksklick auf eine Fundstelle / einen Haufen | Trupp bergen lassen (nur im Stand, in 60 m Reichweite); nochmal: zurückholen |
| Mausrad, + / − | Zoom (0,05 … 40 Bildpunkte je Meter) |
| rechte/mittlere Maustaste ziehen | Karte verschieben |
| Leertaste | Kamera zurück zum Koloss |
| P / T | Pause / Spieltempo |
| H, „?“ | Hilfe · F3 = Messwerte |

## Was schon da ist

- **Fahren (M1):** Schwer und träge — ~6 s Anfahren, langer Bremsweg, auf Eis rutscht der
  Koloss. **Maschinentelegraf** wie auf alten Dampfschiffen (Voll/Halb/Langsam zurück · Stopp ·
  Ganz langsam/Langsam/Halb/Voll voraus · Äußerste Kraft), Kesseldruck-Stufen, Wind (noch ohne
  Wirkung aufs Fahren).
- **Welt (M2):** Aus dem Seed berechnet, unbegrenzt: Berge, Schluchten mit Furten, gefrorene
  Seen (Rand dünnes, Mitte dickes Eis), Pulverschnee-Wehen, weite Ebenen. Nach außen mehr Fels
  und Eis. Jeder Untergrund fährt sich anders; Fels und Schluchten halten den Koloss auf.
- **Darstellung:** Alles per Code gezeichnet (Steampunk: grüner Rumpf, schwarze Kessel, Kupfer,
  rote Räder, langer Hauptkessel mit Rauchkammer, großer Schornstein mit Feuerschein und Funkenflug,
  kleiner Schornstein dahinter, Scheinwerfer mit Lichtkegeln). Viel dunkler Rauch im Radtakt, glühende Funken, schwarze Rußflocken, Schlacke und Ruß im
  Schnee, breite Spuren, Schatten bei fester Sonne. Gelände in Kacheln mit 9 Detailstufen:
  eine grobe Grundschicht ist sofort da, die scharfe blendet weich darüber ein.
- **Anzeige:** laufende Dampfmaschine mit Manometer, Maschinentelegraf mit Hebel und Antwortzeiger
  (echtes Tempo), Messingschild mit dem Befehl, Öllampe als Lichtschalter, Wind, Boden — schlicht,
  unten links.

## Was kommt (Bauplan, Einzelheiten in KONZEPT.md §10)

| | Meilenstein | Inhalt |
|---|---|---|
| ✔ M0 | Gerüst | Takt 20 Hz, Kamera, Tests, Regel-Prüfer |
| ✔ M1 | Fahren | Fahrphysik, Lenkung, Rutschen, Zoom |
| ✔ M2 | Welt | Generator, Kollision, Kachel-Darstellung |
| ✔ M3 | Fundstellen & Bergen | Fundstellen aus dem Seed, Klick → Bergen mit Ladebalken, Laderaum + Gewicht (Nebel später) |
| ▶ M4 | Überleben | ✔ M4a Kessel/Brennstoff/Tag/Kälte · ✔ M4b Crew · ✔ M4c Liegenbleiben (Wrack) · ✔ M4d Heimstatt |
| ▶ M5 | Ereignisse | M5a Stürme · M5b Rettungsauftrag (Schneewehen, Signalballons, Überlebende) — beide gebaut, Spieltest offen · M5c Reichweiten-Ring · M5d Siedlungen + Aufträge |
| M6 | Multiplayer | Node-Server, WebSocket, 2–4 Spieler, Vorhersage + Korrektur |
| M7+ | Ausbau | Module, sichtbare Bergungstrupps, Abschleppen, echte Grafik, Ton |

## Technik in Kürze

- JavaScript-ES-Module mit `// @ts-check` + JSDoc, Canvas2D, keine Fremdbibliotheken.
- **Simulation streng getrennt** (`sim/`): nur Ganzzahlen (µm, µm/Tick, 65536 = Vollkreis),
  Sinus aus Tabelle, Zufall aus dem Seed → auf jedem Rechner gleich, Replays möglich.
- Jede Eingabe — auch Lenken und Gas — ist ein **Befehl**. Das ist die Multiplayer-Schnittstelle:
  heute läuft die Simulation im Browser (`netz/lokal.js`), ab M6 auf einem Server.
- **Welt = Seed + Änderungsliste:** Gelände wird nie gespeichert, nur was sich ändert.
- Tests: Fahrgefühl, Determinismus, Speichern/Laden, Replay, Welt-Erreichbarkeit,
  Kollision und ein Regel-Prüfer, der die Schichtgrenzen erzwingt.

```
sim/      Simulation (Zustand, Befehle, Tick, Fahren, Kollision, Welt, Wetter)
netz/     Verbindung (lokal, später WebSocket)
game/     Takt-Schleife, Überblendung zwischen Ticks
eingabe/  Tastatur → Befehle
render/   Kamera, Gelände-Kacheln, Koloss, Rauch, Spuren, Wind
ui/       Anzeige, Dampfmaschine
debug/    F3-Messwerte, ek-Konsole
data/     alle Spiel- und Optik-Werte
tests/, tools/, docs/
```

## Wo steht was

| Datei | Inhalt |
|---|---|
| `PROJEKT.md` | dieser Überblick |
| `KONZEPT.md` | Spielidee, Koloss, Ressourcen, Gelände, Multiplayer, Bauplan, offene Fragen |
| `HANDOFF.md` | aktueller Stand, nächster Schritt, Spieltest-Verlauf, Nutzerwünsche |
| `CLAUDE.md` | verbindliche Arbeitsregeln (Schichten, harte Regeln, Kommentar-Standard) |
| `docs/ENTSCHEIDUNGEN.md` | Begründungen E-001 … E-009 |
| `docs/specs/` | Spezifikation je Meilenstein (z. B. `M2-welt.md`) |

Schwesterprojekt mit gleichem Unterbau: `..\Kronwege`.
