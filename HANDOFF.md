# HANDOFF — Stand und nächster Schritt

## ▶ Einstieg nach einem Neustart (nach /clear)

**Satz zum Weitermachen** (in die neue Sitzung kopieren):
> Lies Eiskoloss/CLAUDE.md und Eiskoloss/HANDOFF.md und mach mit dem nächsten Schritt weiter.

1. **Lesen:** `CLAUDE.md` (Regeln, Gelernte Regeln) → dieses Dokument → `PROJEKT.md` (Überblick)
   → bei Bedarf `KONZEPT.md` (Spielidee, Bauplan §10, Entscheidungen §11),
   `docs/ENTSCHEIDUNGEN.md` (E-001…E-016), `docs/specs/` (M2, M3, M4a).
2. **Prüfen:** `powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1` → muss „ALLES GRUEN“
   melden (78 Tests). In frischen Fenstern fehlt evtl. Node im PATH (siehe Kronwege/CLAUDE.md).
3. **Spielen:** Vorschau „eiskoloss“ starten (`.claude/launch.json`, Port 5176) →
   http://localhost:5176/. Steuerung hinter dem „?“. Konsole (F12): `ek.…`, z. B. `ek.neu(0)`
   = Testgelände, `ek.step(n)`, `ek.untergrund()`, `ek.kacheln()`, `ek.nacht(0.85)` (Dunkelheit vorgeben,
   `ek.nacht(null)` = wieder Tageszeit), `ek.funde()`, `ek.ladung()`, `ek.optik()`. F3 = Messwerte (inkl. Bilder/s).
4. **git:** Branch `main`, Remote `origin` = https://github.com/MP-E3N/Winterworld-Konzept
   (Repository „Winterworld Konzept“ des Nutzers). Commits: `2ae5d9c` M0+M1 · `2924611` M2 Welt ·
   `7792e31` HANDOFF · `f3aeea3` Spieltest M2b · `7e5c53e` M3 Fundstellen & Bergen · danach **M4a + Spieltest M4a** (siehe `git log`).

## Stand 2026-11-11 nachts: M4b Crew + Lager-Draufsicht gebaut und committet (85 Tests grün)

Spec: `docs/specs/M4b-crew.md`, Entscheidung E-018, **Zustand v9, Replay neu aufgenommen** (absichtlich:
die Crew isst Vorräte, neue Felder). Nutzerentscheidungen: Gruppen mit Werten; Arbeiter = Bergetempo;
Kälte + Hunger machen krank; Leute können sterben; Moral nur Anzeige; Lager als Draufsicht ohne Dach.
- **Crew** `sim/koloss/crew.js` (Tick nach dem Kessel, vor dem Bergen), Werte `data/crew.js`:
  4 Heizer + 6 Arbeiter, 300 kg Vorräte. Essen 10 kg/Kopf/Spieltag; ohne Vorräte sinkt `satt` in einem
  Spieltag auf 0. Gesundheit: unter 0 °C an Bord −1 je Zehntel °C je Tick (−10 °C: ~8 min bis 0),
  Hunger unter 30 % satt, Erholung ab +10 °C und halb satt (~20 min). Kranke = Anzahl × (1 − Gesundheit),
  gerundet; `trupp.leute` = gesunde Arbeiter (Bergen langsamer; ohne Gesunde lehnt BERGEN_START ab).
  Unter 25 % Gesundheit Todesfälle über Sammler (bei 0 % einer je Minute), zuerst Arbeiter, −10 % Moral.
  Moral strebt träge zu „voll minus Kälte/Hunger/Krankheit“, ohne Wirkung.
- **HUD:** Zeile „Crew“ (4 Heizer · 6 Arbeiter · x krank · y †) + drei Mini-Balken Satt/Gesund/Moral.
  F3 zeigt eine Crew-Zeile.
- **Lager-Popup** (`ui/lager-blick.js`): Blick von oben in den offenen Rumpf (Bug rechts), Räume
  Brennstoff und Waren; Kohle als Brockenhaufen, Holz als Stämme, Öl als Fässer (je 200 kg eins),
  Vorräte als Kisten und Säcke; leerer Rest = Bodenbretter. Malt nur bei Mengenänderung neu.
  Die Füllbalken im Popup sind dafür weg (Zahlen stehen weiter daneben).
- Im Browser geprüft (Popup, Crew-Zeile, keine Konsolenfehler). Spielgefühl der Raten noch ungetestet.
- **Lager-Blick Runde 2 (Nutzer-Bild):** jetzt LÄNGS (Bug oben, 176 × 300 px), Steampunk (dunkles
  Eisen, mattes Messing, gedeckte Farben), getrennte Fächer: Warenlager vorn (Holz, Vorräte),
  Brennstoffbunker hinten (Kohle, Holz, Öl). Füllung von unten nach oben = Anteil am Lager, in ganzen
  Reihen (Stamm 8 px, Fass 13 px, Kiste 12 px) — schon wenig Holz ist ein erkennbarer Stamm mit
  Jahresringen. Popup 186 px breit, „Neues Holz ins“ bricht um.
- **Leistung:** Der alte Blick malte bei jedem verbrannten kg alles neu (beim Fahren fast jedes Bild).
  Jetzt Rumpf + Muster einmal vorgemalt, neu zusammengesetzt nur bei ≥ 100 kg Änderung (ein paar
  drawImage). Popup-Größe einmal gemessen statt jedes Bild offsetWidth (erzwang Layout), CSS-Schatten-
  filter am Canvas entfernt. Echte Bilder/s konnte ich in der versteckten Vorschau nicht messen.

### Nächster Schritt
1. **Spieltest M4b** durch den Nutzer: Reichen 300 kg Vorräte? Wird es nachts zu schnell gefährlich?
   Gefällt der Blick ins Lager?
2. Committet nach Nutzerfreigabe („Passt, committen“); Push nach GitHub noch offen.
3. Danach M4c (Eisbruch, Rumpfschaden, Liegenbleiben) — Spec zuerst.

## Stand 2026-11-11: Spieltest M4a-2 — Heizung-Thermostat + Kessel-Anzeige (committet und auf main übernommen, 79 Tests grün)

Nutzer-Rückmeldung: Bilder/s nachts besser (Punkt 1 von unten erledigt), Brennstoff einsammeln und
umlagern geht mühelos. Gesichert: `e17b431` auf `main` + Tag **`vor-kessel-test`**; gearbeitet auf
Branch **`test-kessel`**. Zurück zum alten Stand: `git switch main` (Änderungen vorher verwerfen
oder committen). Entscheidung E-017.

1. **Heizung = Thermostat:** hält immer +23 °C (`HEIZUNG_ZIEL`, data/klima.js), verbrennt je Zehntel °C
   Lücke zu „außen + Kesselwärme“ `HEIZUNG_MG_JE_ZEHNTEL` (data/koloss.js): bei −20 °C/Mittel ≈ 44 kg/min,
   bei −45 °C/Volldampf ≈ 104 kg/min, warm genug = 0. `heizungsLuecke()` in sim/koloss/kessel.js.
   Im Browser: −26 °C draußen → an Bord 23 °C.
2. **Kessel:** Regel war schon so gewünscht (Feuerstufe = wie schnell, nicht wie hoch; im Stand wird
   jede Stufe voll — im Browser geprüft: „Schwach“ von 42 % auf 100 %). Geändert nur die Anzeige.
3. **Anzeige:** Manometer jetzt 0–100 %, darüber **Feuer-Zeiger** (Halbrund grau→rot, Messingnadel =
   Feuerstufe), Zeile „Kessel“: „Mittel · Druck 79 % ▲“ (▲ steigt, ▼ fällt). Canvas höher (H 140).

### Nächster Schritt
1. Nutzer hat die Testversion freigegeben („Passt, committen“) → committet, auf `main` übernommen,
   gepusht (`5f5d6f4`).
2. **Rauch-Versuche verworfen (2026-11-11):** Zwei Runden „mehr Rauch, stärker verweht, mehr Ruß“
   (dann dichter/schwärzer, Säule ≤ 180 m, weiche Wolkenbilder) — Bilder/s fielen beim Nutzer.
   Nutzerwunsch: zurück auf `5f5d6f4` („da war alles recht flüssig“). Die Änderungen liegen im
   **git stash** („Rauch-Runden 1+2 …“, `git stash list`) — nur auf Wunsch wieder hervorholen.
   Rauch-Werte also wie in Spieltest M2b (`render/rauch.js`, `render/schmutz.js`).
3. Danach **M4b Crew** (Hunger, Gesundheit, Moral; Wärme an Bord bekommt Wirkung) — Spec zuerst.

## Stand 2026-11-10 nachts: Spieltest M4a umgesetzt und committet (78 Tests grün)

Nutzer-Spieltest M4a (Screenshot nachts, F3: 16 Bilder/s) mit fünf Punkten — alle umgesetzt.
Spec-Nachtrag oben in `docs/specs/M4a-kessel-kaelte.md`, Entscheidung E-016, Zustand v8.

1. **Nachts weniger Bilder/s:** Konsole ohne Fehler. JS-Zeit nachts sogar kleiner → Grafikkarte:
   Dunkel-Ebene (`render/licht.js`) jetzt in halber Auflösung (`DUNKEL_AUFLOESUNG`). **Vom Nutzer
   noch zu bestätigen** (versteckte Vorschau kann keine echten Bilder/s messen).
2. **Dampfvorrat statt zitternder Nadel:** `k.dampf` ist ein Vorrat (0 … 400 000); Feuer füllt höchstens
   `ERZEUGUNG[Feuerstufe]`, Maschine entnimmt Schub × Tempo; höchster Schub ∝ Druck
   (`kesselSchub()`). Zu viel verlangt → Druck fällt, Tempo sinkt aufs Dauertempo der Feuerstufe.
   Heizer legen nur nach, was gebraucht wird (Nutzerwahl). Gemessen: 0,77 t/km langsam, 1,24 t/km
   Mittel, 2,2 t/km Volldampf. `hoechstTempo`/`kesselUeberlastet`/Zittern entfernt.
   Holz ×2, Öl ×0,5 Verbrauch (Öl heizt NICHT mehr schneller auf).
3. **Heizung** wie die Lampe: Befehl `HEIZUNG`, Taste O, Ofen-Schalter (`ui/ofen.js`) neben der Lampe;
   +60 kg/min, +15 °C an Bord, nur solange das Feuer brennt.
4. **Brennstofflager 100 t + abwerfen:** Abgeworfenes liegt als Haufen 26 m hinter dem Koloss (je Ware
   7 m seitlich versetzt), `state.abwuerfe`, kann per Klick wieder aufgenommen werden (`AUFNEHMEN`,
   halbe Arbeit). 1 t je Klick, Umschalt = alles.
5. **Warenlager 60 t** (Nutzerwahl) für Holz und Vorräte; Holz umlagern (⇄) und „Neues Holz ins
   Brennstoff/Waren“ (`HOLZZIEL`). **Lager-Popup** (`ui/lager.js`) neben dem Koloss: Klick auf den
   eigenen Koloss oder Taste I. Anzeige unten links: zwei Füllbalken statt Waren-Zeile.
- Neue Dateien: `sim/koloss/lager.js` (einzige Stelle für Lager), `sim/befehle-lager.js` (Bergen- und
  Lager-Befehle), `render/fund-marken.js` (Ladebalken/Ring/Schild), `ui/lager.js`, `ui/ofen.js`,
  `tests/lager.test.js`. Fundstellen und Abwürfe teilen sich in der Darstellung die Form „Marke“.
- Gewicht: −20 % Schub je 100 t (`GEWICHT_BREMST_PROMILLE`/`GEWICHT_BEZUG_KG`).
- **Replay neu** (Zustand v8). Im Browser geprüft: Popup, Abwerfen, Haufen anklicken → Aufnehmen,
  Ofen glüht, keine Konsolenfehler.

### Nächster Schritt
1. **Spieltest** durch den Nutzer (Bilder/s nachts? Dampfvorrat-Gefühl, Verbrauch, Popup).
2. Committet (05d20af) und gepusht.
3. Danach **M4b Crew** (Hunger, Gesundheit, Moral; Wärme an Bord bekommt Wirkung, Vorräte werden
   gegessen) — Spec zuerst.

## Stand 2026-11-10 abends: M3 Fundstellen & Bergen gebaut, getestet und committet (68 Tests grün)

Spieltest M2b hat der Nutzer bestätigt („läuft flüssig, passt“). Seine M3-Entscheidungen: vier
Fundarten (Kohlehalde, Ruine/Holz, Ölfässer, Vorratslager), **Bergen nur im Stand**, **Nebel später**.
Spec: `docs/specs/M3-fundstellen.md`, Entscheidung E-014.

- **Fundstellen aus dem Seed** (`sim/welt/fundstellen.js`, Werte `data/fundstellen.js`): eine je
  200-m-Zelle (30 %, am Start 65 %), nur auf Schnee, nie am Startpunkt, Öl erst ab 1,5 km.
  ID = gepackte Zellnummer. Seed 0: feste Funde in `data/testgelaende.js` (Kohlehalde 40 m rechts
  vom Start in Reichweite, Ruine knapp außer Reichweite, Vorratslager SO, Ölfässer NW).
- **Zustand v6:** `koloss.ladung {kohle, holz, oel, nahrung}` (kg), `koloss.trupp`, `state.trupps[]`
  (je Koloss einer, `fund -1` = an Bord), `state.geborgen[] {fund, rest}` (Änderungsliste).
- **Befehle** `BERGEN_START {fund}` (Stopp + steht, ≤ 60 m ab Rumpfmitte, nicht leer, Platz) und
  `BERGEN_ABBRECHEN`. **Tick** `sim/bergen.js` nach dem Fahren: Stück für Stück in den Laderaum
  (Kohle 500 kg je 2 s, Holz 250 kg/2 s, Öl 200 kg/3 s, Vorräte 100 kg/1,5 s); Losfahren bricht ab.
- **Gewicht:** `schubMitLadung()` — bis −25 % Schub bei vollen 60 t; leer exakt wie vorher.
- **Darstellung** `render/fundstellen.js` + `render/fundstellen-bilder.js` (vorgerenderte Bildchen,
  4 Varianten je Art, schrumpfen mit dem Rest, leer = blasse Reste; fern farbige Punkte).
  Maus darüber: Ring (Messing = geht, grau gestrichelt = geht nicht, kurz rot = abgelehnt),
  Messingschild „Kohlehalde · 6,5 t“, Reichweitenkreis. Beim Bergen Messing-Ladebalken
  (Bernstein = geborgen, Kupferleiste = aktuelles Stück). `eingabe/maus.js`: Linksklick.
- **Anzeige** unten links: Ladung (Messingbalken, x / 60 t), vier Waren, Trupp („an Bord“/„birgt …“).
  Konsole `ek.funde()`, `ek.ladung()`; F3 zeigt den Trupp; Hilfe ergänzt.
- **Replay neu aufgenommen** (absichtlich: Zustand v6 + Testfahrt birgt zuerst 200 Ticks Kohle).
- Im Browser geprüft (Seed 0 und 4711): Klick → Bergen → 1,5 t nach 130 Ticks, keine Konsolenfehler,
  Fundstellen zeichnen ≤ 0,5 ms.
- Pflege: Grundformen der Bildchen nach `render/fundstellen-formen.js` ausgelagert (alle Dateien < 300).
- **Nutzer hat M3 getestet** (Screenshot: Bergen an der Kohlehalde, 27,8 t geladen) und Commit +
  Push freigegeben.

### Nutzerentscheidungen nach M3 (2026-11-10)
- **Ladung nur in der Anzeige**, nicht am Koloss sichtbar.
- **F6 Liegenbleiben bestätigt:** Wrack bleibt mit Ladung in der Welt (Fundstelle für andere),
  Neustart mit einfachem Koloss in der zuletzt besuchten Siedlung.
- **M4 in Teilen**, zuerst **M4a: Kessel frisst Kohle + Kälte + Tag/Nacht** (Wärme an Bord).
  Danach M4b Crew (Hunger, Gesundheit, Moral), M4c Eisbruch/Rumpfschaden/Liegenbleiben,
  M4d erste Siedlung.

## Stand 2026-11-10 spät: M4a Kessel, Brennstoff, Tag/Nacht, Kälte gebaut (NICHT committet, 75 Tests grün)

M3 ist committet und gepusht (`7e5c53e`). Nutzerentscheidungen für M4a: **Tag = 20 min**,
**Verbrauch „mittel“**, **Brennstoff selbst wählen** (kein automatischer Wechsel), **Druck träge**.
Spec: `docs/specs/M4a-kessel-kaelte.md`, Entscheidung E-015.

- **Zustand v7:** `k.dampf` (echter Druck, 0 … 4000 Tausendstel-Stufen; `k.druck` = eingestellte
  Feuerstufe), `k.brennstoff` (0 Kohle, 1 Holz, 2 Öl), `k.feuerG` (Gramm-Sammler), `k.waerme`
  (Zehntel °C). Start: warmer Kessel, 4 t Kohle + 1 t Holz an Bord.
- **Kessel** `sim/koloss/kessel.js` (Tick vor dem Fahren): verfeuert den gewählten Brennstoff aus dem
  Laderaum (`VERBRAUCH_KG_MIN` 20/200/360/540/760 bei Volllast, ohne Last 20 %; Holz ×2, Öl ×0,5),
  Dampf steigt ~15 s je Stufe (Öl doppelt so schnell), fällt ~10 s, ohne Feuer ~25 s bis 0.
  Schub gleitend aus dem Dampf (`kesselSchub()`, `nachDampf()` in sim/abfragen.js).
- **Befehl** `BRENNSTOFF {wahl}`; Taste **B** schaltet weiter, Messing-Wahlschalter in der Zeile
  „Kessel“ (gewählter glüht, leerer matt).
- **Tag/Nacht** `sim/wetter/tag.js` aus `state.tick` (kein Feld): Start 08:00, hell 06:00–19:12,
  Nacht 21:36–03:36, `dunkelheit()` 0 … 1000 → Darstellung (`NACHT_MAX` 0,85). `ek.nacht(x)` ist
  jetzt eine Vorgabe, `ek.nacht(null)` = wieder Tageszeit. Uhr unten rechts („☀ Tag 1 · 08:00“).
- **Kälte:** `aussenTemperatur()` −20 °C am Start, bis −45 °C ab 5 km, nachts −10, Wind −0,5 °C je m/s.
  Wärme an Bord nähert sich „außen + Kesselwärme“ (data/klima.js). Zeile „Kälte“ in der Anzeige.
  Noch ohne Wirkung — die kommt mit der Crew (M4b).
- **Überlast-Nadel** mit 0,5 km/h Spielraum (`UEBERLAST_SPIEL`), sonst zitterte sie schon wegen der
  Startladung bei „Halb voraus“.
- Tests: `tests/kessel.test.js` (7 neu); Fahrtests nutzen einen warmen Kessel (`fahre()` setzt den
  Dampf), Bergen-Tests eine eigene Welt mit Holzfeuer. **Replay neu** (Zustand v7, träger Druck).
- Im Browser geprüft: Uhr, Kälte, Wahlschalter; Nacht um 23:09 mit Scheinwerfern (−31 °C, an Bord
  1 °C bei „Mittel“ im Stand), Wahl „Öl“ ohne Öl → Feuer aus, Dampf sinkt. Keine Konsolenfehler.

### Nächster Schritt (damals — Spieltest kam, siehe oben)
1. **Spieltest M4a** durch den Nutzer (Verbrauch, Trägheit des Drucks, Nacht, Kälte-Anzeige).
2. Committet (05d20af) und gepusht.
3. Danach **M4b Crew** (Hunger, Gesundheit, Moral; Wärme an Bord bekommt Wirkung) — Spec zuerst.

## Stand 2026-11-10 (nach Spieltest M2b, 9 Runden)

**Spielbar:** Fahren (M1) und Welt (M2) sind fertig und nach neun Spieltest-Runden stark überarbeitet.
Noch keine Spielinhalte (Fundstellen, Bergen, Kälte) — das ist M3/M4.

| Bereich | Stand (Einzelheiten in den Teil-Protokollen unten) |
|---|---|
| **Steuerung** | W/S = **Maschinentelegraf** (9 Stellungen Voll zurück … Äußerste Kraft, hält das Tempo selbst, E-010), A/D lenken, Q/E Kessel, L Licht, Klick auf Telegraf/Öllampe |
| **Lenken** | über Kurvenradius (32 m bei vollem Einschlag, max. 7°/s, dreht nur beim Rollen, E-012); Drehpunkt = Mitte der zwei Traktionsräder (E-011) |
| **Koloss** | 40 m, 2 große Traktionsräder + 6 Lenkräder, verbreiterter Mittelteil, langer Hauptkessel mit Rauchkammer, großer Schornstein (Feuerschein nach Last) + kleiner mittig dahinter, Scheinwerfer |
| **Effekte** | viel dunkler Rauch (halbe Auflösung), Rauchstöße im Radtakt, runde Glut-Funken und schwarze Rußflocken als Atlas-Animationen, **keine weißen Dampfeffekte in der Welt** |
| **Dreck/Spuren** | gepflügte breite Bahn + Radabdrücke + Ruß/Schlacke/Asche, eingebrannt in Welt-Kacheln (E-013), verblassen nach einigen Minuten |
| **Licht** | Befehl `LICHT`, Lichtkegel, Dunkelheit vorbereitet (`ek.nacht`), Schalter = Öllampe |
| **Karte** | 9 Detailstufen, gleich scharf in jedem Zoom, grobe Grundschicht + Einblenden (kein Puzzle) |
| **Leistung** | gemessen (versteckte Vorschau): ~1–3 ms je Bild nah, ~5 ms fern. Nutzer hatte vorher 16 Bilder/s im Rußfeld → behoben (Kacheln, halbe Auflösung). **Vom Nutzer noch nicht bestätigt.** |
| **Zustand** | Version 5 (`telegraf`, `licht`, Position = Drehpunkt) |

### Nächster Schritt (damals — ERLEDIGT, M3 ist gebaut, siehe oben)
1. **Spieltest durch den Nutzer** abwarten (vor allem: Bildrate im Rußfeld jetzt ok? Funken/Flocken?).
2. Dann **M3 Fundstellen & Bergen** (KONZEPT.md §4, §7, §10). Spec zuerst
   (`docs/specs/M3-fundstellen.md`), dann bauen. Vorschlag für den Umfang:
   - **Fundstellen aus dem Seed** (wie das Gelände, nicht im Zustand): Kohlehalden, Holz
     (Ruinen/Wald), Ölfässer, Vorratslager, Überlebende; Häufigkeit nach Gelände/Ring (Öl selten
     und weit draußen). Was geborgen ist, kommt als **Änderungsliste** in den Zustand (KONZEPT §8 R7).
   - **Klick → Bergen** (Linksklick ist frei, `render/kamera.js` nutzt nur rechts/mitte; Klicks auf
     Telegraf/Öllampe gehen an die Anzeige): Befehl `BERGEN_START {fundstelle}` /
     `BERGEN_ABBRECHEN`; nur in Reichweite und bei Telegraf „Stopp“/Schritttempo; Ladebalken über der
     Fundstelle; Trupp als eigenes Objekt im Zustand (Entscheidung F4).
   - **Laderaum + Gewicht** (Gewicht bremst; dünnes Eis bricht erst in M4). Hinweis: Den sichtbaren
     Laderaum vorn gibt es nicht mehr (Nutzer fand ihn lächerlich) — Ladung erst einmal nur in der
     Anzeige zeigen und den Nutzer fragen, ob/wo man sie am Koloss sehen soll.
   - **Sicht/Nebel:** Sichtradius um den Koloss, Entdecktes bleibt als Erinnerung (die Dunkel-Ebene
     in `render/licht.js` ist eine mögliche Grundlage).
   - Anzeige schlicht im vorhandenen Feld unten links (keine neuen Fenster).
   - Vor dem Bauen den Nutzer kurz fragen: Fundstellen-Arten/Anzahl, Bergen nur im Stand?, Nebel
     jetzt oder später?

### Nutzerwünsche und Arbeitsweise (wichtig)
- Sprache Deutsch. Der Nutzer testet selbst und schickt **Screenshots mit nummerierten Punkten**
  (oft mit roten Markierungen für Stellen). Alle Punkte umsetzen, im Browser prüfen, kurz berichten.
- **Commits nur nach Freigabe**, Nachricht deutsch im Präsens.
- **Keine Warntexte** in der Oberfläche — lieber sichtbares Verhalten (zitternde Nadel bei
  Überlast, Öllampe statt Schalter-Text). Steampunk-Stil (Messing, Kupfer, Nieten).
- Optik: **dunkler, viel Rauch**, Puffen im Radtakt, **viel Dreck** (aber großflächig, nicht
  krümelig), breite Spuren, **keine weißen Dampfeffekte in der Welt** (nur HUD-Dampfmaschine),
  Funken rund (keine Striche). Welt: **glatt, keine Pixel**, große freie Flächen.
- Fahrgefühl: schwer und träge (Lenken eher noch ruhiger als zu wendig).
- **Leistung ist wichtig**: Effekte lieber als vorgerenderte (Animations-)Sprites/Atlanten.
- **Wind** wirkt erst später aufs Fahren (mit Kälte/Verbrauch in M4) — nicht wieder vorschlagen.
- Eigene Welt im Frostpunk-**Stil**, aber keine Frostpunk-Namen/Lore/Grafik (KONZEPT §1).
  „Eiskoloss“ ist Arbeitstitel; das Repository heißt „Winterworld Konzept“ (Name noch offen, F5).

### Stolperfallen (siehe auch CLAUDE.md „Gelernte Regeln“)
- **Versteckte Vorschau:** rAF läuft kaum → `ek.step(n)` + `bildZeichnen(...)` direkt aufrufen,
  Screenshots zweimal aufnehmen. Vor dem ersten Tick gibt es noch keinen Koloss (BEITRETEN wartet)
  → frühe Tastatur-Befehle verpuffen; erst `ek.step(1)`. Leistungsmessungen schwanken dort stark.
- **Nie Backticks in `node -e "…"`** in Git-Bash; für Code/Markdown Edit/Write oder ein Skript in
  den Scratchpad schreiben und ausführen.
- Replay (`tests/replays/m1-fahren.json`, Seed 0) nur bei **absichtlicher** Regeländerung neu
  aufnehmen: `node tools/replay-aufnehmen.js` (in M2b mehrfach: Telegraf, Licht, Lenkradius).
- Drehpunkt: Zustandsposition ≠ Rumpfmitte. Alles Gezeichnete läuft über `rumpfLage()` /
  `rumpfPunkt()` aus `render/koloss-mass.js`; Kollision rechnet den Versatz selbst ein.

## Dateien, die in Spieltest M2b neu dazukamen
`PROJEKT.md` · `render/koloss-mass.js` (Maße, Drehpunkt) · `render/koloss-aufbau.js` (Gestell, Rumpf,
Kessel, Schornsteine, Lampen) · `render/formen.js` · `render/weltkachel.js` · `render/licht.js` ·
`render/sprites.js` (Atlanten) · `render/schmutz.js` (eingebrannte Dreck-Kacheln) ·
`render/funken.js` (Glut + Rußflocken) · `ui/telegraf.js` · `ui/lampe.js`

## Protokolle (älteste unten, Spieltest M2b Teil 1–9 weiter unten)

### M0 + M1 committet (2ae5d9c), M2 Welt committet (2924611)

### M2 Welt (Spec: docs/specs/M2-welt.md, E-009)
- **Generator** `sim/welt/generator.js` mit Ganzzahl-Rauschen (`sim/welt/rauschen.js`): Fels (Berge),
  Schluchten mit Furten, Seen (Rand dünnes Eis, Mitte dickes Eis), Pulverschnee-Wehen und Bergfuß.
  Startbereich frei (weicher Übergang, kein Kreis), nach außen (bis 5 km) mehr Fels und Eis.
  **Ebenen** (sehr grobes Rauschen): weite Flächen ohne Schluchten und fast ohne Fels.
  Werte in `data/welt.js`. **Einheit: Feinpunkte zu 25 cm** — Bild und Kollision fragen
  dieselbe Funktion `gelaendeAn(seed, fx, fy)`, deshalb keine Treppen und kein Versatz.
- `untergrundAn(seed, x, y)` / `befahrbarAn()` (µm) sind die einzige Abfrage der Physik; kein
  Zwischenspeicher nötig (~20 Abfragen pro Tick und Koloss, je ~1 µs).
- **Kollision** `sim/koloss/kollision.js`: Prüfpunkte rund um den Rumpf; frei → übernehmen, sonst
  ohne Drehung, sonst an der Wand entlang, sonst stehen bleiben. Noch kein Schaden (M4).
- **Seed 0 = Testgelände** (Kreise aus M1 + dünner Seerand + Felsblock im Süden), Standard in Tests;
  Spiel startet mit Seed 4711 (`ek.neu(0)` fürs Testgelände).
- **Darstellung** `render/welt.js` + `render/weltkachel.js`: Kacheln 64 × 64 in 9 Stufen (0,25 m … 64 m
  je Bildpunkt, Faktor 2; seit Spieltest M2b), Kantenglättung an Geländegrenzen, weich skaliert,
  Hangschattierung auf Fels, zufällige Körnung, 6 ms Budget pro Bild.
- **Werkzeug** `node tools/welt-ansehen.js <seed> [meter]` zeigt die Welt als Text-Karte.
- **Tests:** 55 grün (neu: Rauschen, Physik-Abfrage = Generator, Start frei, Anteile und
  Erreichbarkeit ≥ 90 % in 600 m über 20 Seeds, 4 Kollisionstests). Replay auf Seed 0 neu aufgenommen.
- **Spieltest M2 umgesetzt:** Treppen/Pixel weg (25-cm-Raster + Kantenglättung), größere freie
  Flächen (größere Formen, Ebenen, weniger Schluchten).

### M0 + M1
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
- **Keine schwarze Rauchwolke mehr** (ÜBERHOLT durch Spieltest 3+4 — Rauch ist wieder dunkel): Rauch ist hellgrauer Dampfrauch (nie schwarz), dafür schon
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
  `TEMPOMAT {an: true, kmh}`, geht auch aus dem Stand. (Der Hinweistext „mehr Druck nötig“ wurde in
  Spieltest 4 wieder entfernt.) Test dazu (43 Tests). Replay unverändert.

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

### Spieltest M2b (2026-11-10) umgesetzt
- **`PROJEKT.md`** neu: Überblick (Idee, Schnellstart, Steuerung, Stand, Bauplan, Technik, Wegweiser).
- **Karte gleich scharf in jeder Zoomstufe:** 9 Stufen mit Faktor 2 statt 7 mit Sprüngen 4 → 16 → 64 m;
  Kachel-Bildpunkt höchstens 1,6 Bildschirmpunkte (vorher bei 2 km 3,7 → verwaschen).
- **Kein Puzzle-Aufbau mehr:** grobe Grundschicht zuerst (nie Löcher), fehlende Kacheln zeigen die
  gröbere/feinere vorhandene Kachel, neue blenden in 280 ms ein; Vorrat für Rand und Herauszoomen;
  Speicher LRU bis 2500 Kacheln. Kachel-Berechnung ausgelagert nach `render/weltkachel.js`.
  Spec: docs/specs/M2-welt.md „Darstellung“.
- **Koloss 32 → 40 m** (`KOLOSS_LAENGE_M`, wirkt auch auf die Kollision): vorn ein Laderaum (Holzdeck,
  zwei Luken in Kupferrahmen — dort kommt in M3 das Geborgene hin), **neun statt sieben Radpaare**.
  Alter Aufbau um `ALT_VERSATZ` −4 m nach hinten; Allradlenkung abgestuft um die drei Traktionsräder
  (`EINSCHLAG` in `render/koloss.js`). Schornstein, Dampfstöße und Schlacke mitverschoben.
  Grundformen nach `render/formen.js` ausgelagert. Tests 55 grün, Replay unverändert.

### Spieltest M2b, Teil 2 (2026-11-10) umgesetzt
- **Maschinentelegraf statt Tempo-Regler** (E-010): W/S (↑/↓) schalten eine Stellung weiter,
  Klicken/Ziehen auf dem Telegrafen stellt den Hebel direkt. 9 Stellungen: Voll/Halb/Langsam zurück
  (6/4/2 km/h) · Stopp · Ganz langsam/Langsam/Halb/Voll voraus (4/10/18/26) · Äußerste Kraft (34).
  Die Maschine hält das Tempo, bremst beim Herunterschalten sanft (`TELEGRAF_BREMSE` 20 %), beim
  Richtungswechsel voll. Befehl `TELEGRAF`, Zustand v4; `TEMPOMAT`, Taste R, Knopf und Schieberegler
  sind weg. Anzeige `ui/telegraf.js`: Messing-Fächer, Hebel mit Griff, kupferner Antwortzeiger
  = echtes Tempo, darunter Messingschild mit dem Befehl. Überlast (Nadel zittert) über
  `kesselUeberlastet()` in sim/abfragen.js. 4 neue Tests (57). **Replay neu aufgenommen.**
- **Mittelteil breiter:** über den drei Traktionsrädern je Seite +0,7 m (`MITTE_BREITER_M`), schräge
  Übergänge, Kupferleiste mit Nieten; Traktionsräder und Spuren rücken mit nach außen. Nur Optik —
  die Kollision rechnet weiter mit 9 m Breite.

### Spieltest M2b, Teil 3 (2026-11-10) umgesetzt
- **Drehpunkt = Mitte der Traktionsräder** (E-011): Die Position im Zustand ist jetzt der Drehpunkt,
  die Rumpfmitte liegt `RUMPF_VOR_DREHPUNKT_M` = 4,8 m davor. Vorher drehte er um die Rumpfmitte,
  die Traktionsräder rutschten in Kurven seitlich (sah falsch aus). Kollision rechnet die Prüfpunkte
  um; Darstellung zeichnet um `rumpfLage()`; Kamera folgt der Rumpfmitte; Spuren liegen am Drehpunkt.
  Lenkeinschlag jedes Radsatzes proportional zum Abstand vom Drehpunkt.
- **Mittelteil länger und breiter:** Lücke zwischen Traktionsgruppe und Lenkrädern 4,9 m statt 3,9 m,
  Mittelteil 13,6 m lang, je Seite +0,9 m (`MITTE_BREITER_M`).
- **Lenkräder nach innen viel breiter:** 1,7 m statt 0,9 m (`LENKRAD_BREITE_M`), Außenkante bleibt;
  der grüne Rumpf ist vorn/hinten dafür schmaler (±2,9 m), die Lenkräder liegen über dem Gestell.
- **Vorderteil neu:** Laderaum weg, der grüne Hauptkessel läuft bis nach vorn (−5,5 … 16,6 m) mit
  Rauchkammer (Graphit, Kupferring, Nieten), Sanddom, roter Pufferbohle.
- **Scheinwerfer funktionieren:** Befehl `LICHT {an}`, Zustand v5 (`licht` 0/1). Taste L und
  Messing-Kippschalter „Licht“ in der Anzeige. Lampen glühen, zwei warme Lichtkegel (85 m, ±17°) auf
  dem Schnee. Dunkelheit (`render/licht.js`) schon vorbereitet: `ek.nacht(0.85)` zum Ausprobieren,
  ab M4 steuert das die Tageszeit. Kegel schneiden die Dunkelheit auf.
- `render/koloss.js` aufgeteilt: `koloss-mass.js` (Maße, Drehpunkt), `koloss-aufbau.js` (Gestell,
  Rumpf, Kessel, Aufbau, Lampen), `koloss.js` (Schatten, Räder, Ablauf). 59 Tests, Replay neu.
- Erklärung zur „verschluckten W-Taste“ aus Teil 2: In der versteckten Vorschau läuft vor dem ersten
  Takt noch kein Koloss (BEITRETEN wartet auf den Tick), frühe Befehle der Tastatur werden dann
  verworfen. Im echten Spiel kein Problem.

### Spieltest M2b, Teil 4 (2026-11-10) umgesetzt
- **Zwei große Traktionsräder statt drei:** Ø 3,8 m (`TRAKTION_DURCHMESSER_M`), 2,6 m breit
  (`TRAKTION_UEBERSTAND_M` 1,7), 4,6 m Achsabstand, Drehpunkt genau dazwischen. Dampftakt und
  HUD-Maschine laufen jetzt mit diesen großen Rädern (weniger Stöße je Meter). Mittelteil bleibt
  13,6 m um den Drehpunkt; acht Radsätze insgesamt.
- **Lenken über den Kurvenradius** (E-012): Drehung je Tick = Weg / `WENDE_RADIUS` (20 m) bei
  vollem Einschlag, begrenzt durch `DREH_MAX` (10°/s, greift ab ≈ 12,6 km/h). Langsam fahren =
  langsam drehen, im Stand gar nicht; bei schneller Fahrt wird der Bogen weiter. Vorher: ab 8 km/h
  immer 10°/s (sah aus, als drehe er sich um einen Punkt). `TEMPO_VOLLE_LENKUNG` entfällt.
  Radeinschlag-Optik bis 20° (`RAD_EINSCHLAG_MAX` 0,35). Neuer Test (60). **Replay neu.**
- **Lichtschalter = Öllampe** (`ui/lampe.js`): Sturmlaterne aus Messing; an = Flamme flackert,
  Glas glüht, Lichthof; aus = rußiges Glas, nur Docht. Klick oder L. Kein Text mehr daneben.

### Spieltest M2b, Teil 5 (2026-11-10) umgesetzt
- **Drehen träger:** `WENDE_RADIUS` 20 → 32 m, `DREH_MAX` 91 → 64 (≈ 7°/s, greift ab ≈ 14 km/h),
  Radeinschlag-Optik 20° → 11,5° (`RAD_EINSCHLAG_MAX` 0,2). Test nutzt jetzt die Konstante. **Replay neu.**
- **Schornstein betont:** dunkler Flansch mit 12 Nieten, gezackte Kupferkrone, Messing-Kupfer-Ring,
  rußige Öffnung mit Glutschein; Schatten länger (13 m) und dicker.
- **Spuren breiter ausgefüllt:** gepflügte Bahn über die ganze Spurbreite plus Schneewall
  (`BAHN_BREITE_M` ≈ 17 m, zwei Lagen), darüber die beiden Radspuren etwas kräftiger.
- **Ruß unregelmäßig** (`render/rauch.js`): jede Wolke schlingert (`WIRBEL_MS`), sinkt zu eigener
  Zeit ab (20–95 % der Lebenszeit), Böen lassen mal viel, mal fast nichts fallen, statt eines runden
  Flecks fallen 1–4 verstreute Flocken.

### Spieltest M2b, Teil 6 (2026-11-10) umgesetzt
- **Feuerschein im Schornstein** nach Last (heller, gelber, größer; flackert) — auch schwach in den
  kleinen Schornsteinen. **Funkenflug:** glühende Bröckchen fliegen ab mittlerer Last stetig und bei
  jedem kräftigen Rauchstoß heraus, glühen in 0,25–0,9 s aus (weiß-gelb → orange → rot), kein Ruß.
- **Vorgerenderte Sprites** (`render/sprites.js`, E-013): 32 Ruß-, 24 Schlacke-, 16 Asche-,
  16 Radabdruck-Bildchen, beim ersten Gebrauch erzeugt; jeder Fleck = ein Bild, zufällig gedreht und
  skaliert. Flecken jetzt in `render/schmutz.js` (max. 6000, verblassen nach 4 min). Radabdrücke
  werden ab 4 px/m an jedem Spurpunkt gestempelt (Traktions- und Lenkrad je Seite), Enden weich
  ausgeblendet, Bildnummer je Punkt fest. Ansehen: `(await import('/render/sprites.js')).spritesAnsehen()`.
- **Zwei kleine Schornsteine** auf den hinteren Druckkesseln (hinten rechts groß, weiter vorn links
  klein, `NEBEN_SCHORNSTEINE`) mit Rauch je nach Last (40 % / 28 % des großen), und ein
  **Abdampfrohr** vorn links am Hauptkessel (weiße Wölkchen je nach Last). Schatten dazu.
- Sicherheitsventil bläst jetzt am Dampfdom (vorher an einer alten Stelle).
- (Pflege erledigt in Teil 8: `render/spuren.js` wieder unter 300 Zeilen.)

### Spieltest M2b, Teil 7 (2026-11-10) umgesetzt
- **Dampf kleiner, kräftiger:** Dampfwölkchen ~40 % kleiner, fast deckend weiß (0,85 statt 0,45).
- **Feuerschein viel heller:** `feuerGlut()` — schon bei mittlerer Last fast voll; zusätzlich
  `feuerscheinZeichnen()` NACH dem Rauch (heller Kern + warmer Hof), weil der eigene Rauch den
  Schein im Schornstein sonst zudeckt.
- **Funken länger und weiter:** 0,6–1,8 s, 6–16 m/s, bremsen langsamer, verlöschen erst am Ende.
- **Rußfelder:** neue Sprite-Sorte `russfeld` (128 px, zusammenhängender Schleier + Körnchen-Nester);
  Ruß aus der Wolke fällt als großes Feld (Radius ×1,3–2,4), dafür 40 % seltener.
- **Leistung Sprites** (E-013): Je Sorte ein **Atlas** (alle Varianten auf einem Bild) plus Atlas
  mit 16-px-Fassungen für kleine Flecken; Flecken ohne Drehung; höchstens 4500 Flecken.
  Messung (versteckte Vorschau, schwankend): Extremfall 4500 Flecken alle im Bild ≈ 10–14 ms
  (vorher bis 150 ms), normale Fahrt ≈ 2 ms. Nächste Stufe, falls nötig: in Welt-Kacheln einbrennen.
- **Nur noch ein kleiner Schornstein:** Ofenrohr auf dem Führerhaus hinten rechts (Mannschaftsofen).

### Spieltest M2b, Teil 8 (2026-11-10) umgesetzt
- **Leistung (Nutzer: 16 Bilder/s im Rußfeld):**
  - Dreck und Radabdrücke werden beim Ablegen EINMAL in Welt-Kacheln (32 m, 8 px/m, max. 160)
    gestempelt (`render/schmutz.js` neu, `stempeln()`); pro Bild nur die sichtbaren Kacheln.
    Verblassen: alle 20 s Spielzeit −18 % je Kachel (max. 3 Kacheln pro Bild), weg nach 6 min.
  - Rauch und Dampf in eigener Ebene mit halber Auflösung (`RAUCH_AUFLOESUNG`).
  - Spurlinien zeichnen nur den sichtbaren Teil (`linieZeichnen`).
  - Messung (versteckte Vorschau): im Rußfeld bei 19 px/m ≈ 1 ms je Bild, am Koloss ≈ 2–3 ms,
    weit weg ≈ 5 ms (direkt nach einem Kamerasprung kurz mehr, weil Gelände nachgeladen wird).
- **Kleiner Schornstein** jetzt direkt hinter dem großen (−5,0 / −0,35 m), Rauch 60 % des großen.
- **Abdampfrohr entfernt** (Rohr und Dampf). Zylinder-Dampf und Sicherheitsventil bleiben.
- **Funken** (`render/funken.js` neu): erben die Fahrt, gleichen sich dem Wind an, als glühende
  Striche gezeichnet (Länge = Tempo × 0,12 s). **Schwarze Rußflocken** dazu (flattern, 2,5–6 s).
  **Mehr Rauch** (`RAUCH_MENGE` 1,35, Stöße größer).
- `spriteZeichnen` und der 16-px-Atlas sind entfallen (nur noch Stempeln in Kacheln).

### Spieltest M2b, Teil 9 (2026-11-10) umgesetzt
- **Funken wieder rund** (keine Striche mehr), Bewegung bleibt (Fahrt + Wind). Gezeichnet als
  vorgerenderte **Glut-Animation** (12 Abkühl-Stufen auf einem Atlas, `render/funken.js`).
- **Dreimal so viele schwarze Rußflocken** als animierte Sprites (6 Formen × 8 Taumel-Phasen auf
  einem Atlas). Je Teilchen nur ein drawImage; gemessen ≈ 0,6 ms für ~240 Funken + Flocken.
- **Alle weißen Dampfeffekte in der Welt entfernt** (Zylinder-Dampfstöße, Sicherheitsventil,
  `dampfStoss`). Die kleine Dampfmaschine in der Anzeige pufft weiter (Nutzerwunsch).
  Rauchstöße im Radtakt bleiben (`rauchImTakt`).
- **Kleiner Schornstein mittig** auf der Längsachse hinter dem großen (−5,0 / 0 m).

## Fahrwerte (data/koloss.js, data/untergrund.js)
Telegraf 9 Stellungen (siehe Spieltest M2b, Teil 2). Druckstufen 0/10/18/26/34 km/h, rückwärts 6 km/h, ~6 s Anfahrzeit, Bremsweg < 10 s,
Kurvenradius 32 m bei kleinem Tempo, darüber weiter (Drehen max. 7°/s ab ≈ 14 km/h). Pulverschnee ≈ halbes Tempo; dickes Eis ≈ 120 %, zäh beim Anfahren,
schlechte Bremsen, rutscht stark.

## Offen
1. **Spieltest M3** durch den Nutzer, Frage „Ladung am Koloss sichtbar?“, dann Commit, dann **M4** — siehe oben.
2. Repository verbunden (origin = MP-E3N/Winterworld-Konzept). `gh` ist nicht angemeldet — für PRs/Issues
   bei Bedarf `gh auth login` durch den Nutzer.
3. Fahrgefühl bei Bedarf: Anfahrzeit (`WIDERSTAND_BEZUG`), Lenkung (`WENDE_RADIUS`, `DREH_MAX`, `DREH_ANPASSUNG`),
   Eis-Rutschen (`haftung`).
4. Offene Konzeptfragen: F5 Name, F6 Liegenbleiben (vor M4), F7 Konkurrenz-Regeln (vor M6)
   (KONZEPT.md §11).
5. Später (M4): Kessel/Kohleverbrauch, Kälte, Wind mit Spielwirkung, Eisbruch auf dünnem Eis,
   Aufprallschaden, erste Siedlung.
