# HANDOFF — Stand und nächster Schritt

## ▶ Einstieg nach einem Neustart
1. Lesen: `CLAUDE.md` (Regeln) → dieses Dokument → bei Bedarf `KONZEPT.md`, `docs/ENTSCHEIDUNGEN.md`.
2. Tests: `powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1` (muss „ALLES GRUEN“ melden).
3. Spielen: Vorschau „eiskoloss“ (Port 5176) bzw. `Projekte\serve.ps1 -Port 5176 -Root Eiskoloss`.
   Steuerung hinter dem „?“ oben rechts. Konsole: `ek.…` (siehe `debug/konsole.js`).

## Stand 2026-11-10: M0 + M1 gebaut (noch NICHT committet)
- **M0 Gerüst:** Ordner nach KONZEPT.md §9, git (main), TypeScript-Prüfung, Test-Rahmen und
  Regel-Prüfer aus Kronwege übernommen und angepasst, Vorschau-Eintrag, F3-Overlay, `ek`-Konsole.
- **Simulation:** Zustand v1 (`spieler[]`, `kolosse[]`), Befehle `BEITRETEN`/`STEUERN`/`DRUCK`,
  Fahrphysik (`sim/koloss/fahren.js`), Testgelände (Eissee im Norden, Wehen, Teich).
- **Multiplayer-Schnittstelle:** `netz/verbindung.js` (Typ), `netz/lokal.js` (Einzelspiel).
  Spielernummer kommt immer aus `verbindung.spieler`.
- **Darstellung:** Kamera mit weichem Zoom 0,05–40 px/m (Mausrad, +/−), Folgen/Freies Verschieben,
  Schneekörnung + Raster, Koloss detailliert nah / Symbol fern, Radspuren, Rauch, Überblendung
  zwischen Ticks. Anzeige: Tempo, Kessel-Stufen, Boden, Maßstab, Pause/Tempo.
- **Tests:** 42 grün (Stand nach Spieltest 2; davor 41) (Winkel, Befehle, 13 Fahrtests, Wind, Determinismus, Speichern/Laden,
  Replay `m1-fahren.json`, Regel-Prüfer).

### Spieltest 1 (2026-11-10) umgesetzt
- **Fehler behoben:** Koloss drehte sich ohne Lenkung langsam gegen den Uhrzeigersinn, auch im
  Stand (Drehung blieb bei −4 hängen, Abschneiden von 0,8 → 0). Jetzt mindestens 1 Schritt zum
  Ziel und keine Drehung im Stand. Test dazu. Replay deshalb neu aufgenommen.
- **Wind** (`sim/wetter/wind.js`, Zustand v2): dreht weich, neues Ziel alle 30–120 s, 15 %
  Chance auf großen Umschwung, 1–16 m/s. Noch **ohne Spielwirkung** (kommt mit Kälte/Verbrauch).
  Sichtbar: Rauch treibt mit, Schneetreiben, Anzeige „Gegen-/Rücken-/Seitenwind“.
- **Mehr Dampf:** Rauchmenge, -größe und -dunkelheit steigen mit Druck × Gas; weiße Dampfstöße
  aus den Zylindern im Radtakt (4 pro Umdrehung); Sicherheitsventil bläst bei Volldampf ab.
- **Dreck:** Rauch lässt Ruß auf den Schnee fallen (windabwärts), Schlacke fällt hinten aus dem
  Feuerraum. Verblasst nach ~4 min Spielzeit. Spuren breiter (1,6 m, zweilagig).
- **Schatten** bei fester Sonne (Nordwest): fällt immer nach Südosten; Schornstein/Dom länger.
- **Anzeige:** laufende Dampfmaschine statt Kessel-Kacheln (Glut, Manometer mit rotem Bereich,
  Kolben/Schwungrad im Radtakt, Abdampf), Windzeile mit Pfeil.

### Spieltest 2 (2026-11-10) umgesetzt
- **Keine schwarze Rauchwolke mehr:** Rauch ist hellgrauer Dampfrauch (nie schwarz), dafür schon
  auf Stufe 1–2 kräftig (Grundmenge hängt am Druck, Gas legt etwas drauf). Kaum noch Ruß aus der Wolke.
- **Mehr Dreck hinten:** Schlacke, Asche und Rußschleier fallen über die ganze Breite hinter dem
  Feuerraum (bis ~35 Flecken/s bei Volldampf). Bis 7000 Flecken, verblassen nach ~4 min.
- **Spuren 3 m breit, nach innen:** Außenkante = Radaußenkante.
- **Anzeige größer** (×1,45), großes Manometer mit Ziffern 0–4 und rotem Bereich.
- **Tempo halten** (Knopf in der Anzeige + Taste R; Befehl `TEMPOMAT`, Zustand v3 mit
  `tempomat`/`antrieb`): hält das Tempo ohne W, S schaltet aus, W + Loslassen setzt ein neues Ziel,
  erst ab 2 km/h. Test dazu; Replay neu aufgenommen.
- **Nutzerentscheidung:** Wind wirkt erst später aufs Fahren (mit Kälte/Verbrauch in M4).

### Spieltest 3 (2026-11-10) umgesetzt
- **Rauch wieder dunkel** (Farbe wie nach Spieltest 1), Menge aus Spieltest 2 bleibt; dazu
  **Rauchstöße im Radtakt** (4 pro Umdrehung) → Puffen passt zum Tempo.
- **Noch mehr Dreck:** bis ~70 Flecken/s (Schlacke, Rußschleier, breite Ascheflecken), max. 12 000.
- **Spuren 4 m breit nach innen** (in der Mitte bleibt 1 m Grat).
- **Radprofil läuft 1:1 mit dem Weg** (vorher viel zu langsam). **Allradlenkung (Optik):** vordere
  zwei Radsätze schwenken in die Kurve, hintere zwei dagegen, bis ~14°, weich nachgeführt.
- **Schieberegler** unter „Tempo halten“ (nur sichtbar, wenn an): 2–34 km/h, Befehl
  `TEMPOMAT {an: true, kmh}`, geht auch aus dem Stand; Hinweis „mehr Druck nötig (E)“, wenn das
  Ziel über dem Höchsttempo der Druckstufe liegt. Test dazu (43 Tests). Replay unverändert.

### Spieltest 4 (2026-11-10) umgesetzt
- **Traktionsräder:** die drei mittleren Radsätze 1,1 m breiter nach außen (über den Rumpf hinaus),
  mit Mittelrille und Kupfernabe; Spuren reichen jetzt bis zu deren Außenkante.
- **Rauch noch dunkler und mehr** (Grundmenge +, Stöße 3–7 Wolken, höhere Deckkraft).
- **Überlast statt Warntext:** Will „Tempo halten“ schneller, als der Kessel auf diesem Boden schafft
  (`hoechstTempo()` in `sim/abfragen.js`, Test dazu), zittert die Manometer-Nadel heftig; der
  Koloss fährt dann eben langsamer.
- **Tempo-Regler im Steampunk-Stil:** Messingplatte mit Nieten, Kupferschiene mit Skala, Hebelgriff,
  graviertes Messingschild für die km/h.
- **Drehen langsamer:** `DREH_MAX` 137 → 91 (≈ 10°/s). Replay neu aufgenommen. 44 Tests.

## Fahrwerte (data/koloss.js, data/untergrund.js)
Druckstufen 0/10/18/26/34 km/h, rückwärts 6 km/h, ~6 s Anfahrzeit, Bremsweg < 10 s,
Kurvenradius ~15–80 m (Drehen max. 10°/s). Pulverschnee ≈ halbes Tempo; dickes Eis ≈ 120 %, zäh beim Anfahren,
schlechte Bremsen, rutscht stark.

## Offen / nächster Schritt
1. **Spieltest durch den Nutzer: Fühlt sich das Fahren gut an?** (KONZEPT.md §10: wichtigster
   Testpunkt). Mögliche Stellschrauben: Anfahrzeit (`WIDERSTAND_BEZUG`), Lenkung (`DREH_MAX`,
   `DREH_ANPASSUNG`), Eis-Rutschen (`haftung`).
2. Commit nach Freigabe.
2b. Wind wirkt erst später aufs Fahren (Nutzerentscheidung, nicht wieder vorschlagen).
3. Danach **M2 Welt**: Seed-Generator mit Chunks, Berge/Schluchten (Kollision), dünnes Eis,
   Chunk-Bilder in Detailstufen. Spec zuerst.
4. Offene Konzeptfragen: F5 Name, F6 Liegenbleiben, F7 Konkurrenz-Regeln (KONZEPT.md §11).
