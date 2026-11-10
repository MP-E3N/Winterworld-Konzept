# Eiskoloss — Konzept & Bauplan (Arbeitstitel)

Stand: 2026-11-10 · Status: **M0–M2 gebaut** (Fahren, Welt aus dem Seed), siehe HANDOFF.md

> Ein gepanzerter Dampfkoloss zieht durch eine erfrorene Welt. Jede Schaufel Kohle
> ist Wärme, Tempo und Zeit. Jeder Überlebende, den du aufnimmst, ist eine Hand
> mehr und ein Mund mehr.

---

## 1. Was wir von Frostpunk lernen (Recherche)

**Frostpunk 1 (2018)** ist ein Stadtbau-Survival um einen zentralen Wärmegenerator.
Kern: Kohle → Wärme → Menschen überleben. Die Temperatur fällt im Lauf des Spiels
in Stufen, Stürme kommen angekündigt. Gesetze zwingen zu harten Entscheidungen
(Kinderarbeit, Rationen), Hoffnung und Unzufriedenheit sind die beiden Balken, an
denen man scheitert. Außerhalb der Stadt schickt man Kundschafter ins „Frostland“:
Wracks, Lager, Überlebende — aber nur als abstrakte Expeditionen auf einer Karte.
Der „Dreadnought“ ist in der Lore ein riesiger Dampfzug, mit dem Flüchtlinge
nach Norden fuhren; viele Züge blieben im Schnee liegen.

**Frostpunk 2 (2024)** spielt 30 Jahre später, Öl kommt dazu. Die Erkundung läuft über
„Frostland-Teams“: Teams sind knapp, sind während einer Expedition gebunden,
gefährliche Expeditionen kosten Verletzte und Tote, Außenposten brauchen eine Route
zur Stadt. Seltene Kerne gibt es fast nur draußen.

**Was das Genre „hardcore“ macht** — und was wir übernehmen:

| Frostpunk-Prinzip | Übersetzung für unseren Koloss |
|---|---|
| Ein Wärmezentrum, alles hängt daran | Der **Kessel** des Kolosses: Wärme für die Crew *und* Antrieb aus derselben Kohle |
| Temperatur fällt stufenweise, Stürme angekündigt | Kältestufen über die Zeit, Sturmwarnung X Minuten vorher → Unterschlupf suchen |
| Knappheit statt Überfluss | Laderaum begrenzt, Gewicht macht langsam und bricht dünnes Eis |
| Menschen sind Ressource *und* Last | Überlebende = Arbeitskraft fürs Bergen, aber essen und frieren |
| Moralische Entscheidungen | Ereignisse: Überlebende zurücklassen? Wrack plündern, in dem noch jemand lebt? |
| Expeditionen kosten Zeit und Leben | Bergungstrupps aussteigen lassen: der Koloss steht, der Kessel frisst trotzdem |

**Ergänzende Vorbilder** für das „Wasteland-Explorer“-Gefühl:
- *HighFleet* — Treibstoff begrenzt die Reichweite; ein **Reichweiten-Ring** auf der Karte
  zeigt, wie weit man noch kommt. Nachtanken braucht Zeit. Das übernehmen wir direkt.
- *FTL / Overland* — kurze Läufe, jede Entscheidung zählt, Scheitern ist Teil des Spiels.
- *The Long Dark* — Kälte als ständiger Gegner, Wetter verändert die Sicht.

**Eigene Welt, nicht Frostpunks:** Stimmung, Genre und Mechanik-Ideen ja — Namen,
Lore, Orte, Figuren und Grafik machen wir selbst (kein „New London“, kein
„Generator“, keine „Steam Cores“, kein Frostpunk-Artwork im Spiel). Das Konzeptbild
dient nur als Stil-Anregung (grüner Rumpf, schwarze Kessel, rote Räder, Kupferrohre).
So bleibt das Spiel veröffentlichbar.

---

## 2. Spielidee in einem Satz

Top-down-2D-Erkundung: Du steuerst einen Dampfkoloss mit **WASD** durch eine
vereiste Welt, klickst Fundstellen an, um **Kohle, Holz, Öl, Nahrung, Ersatzteile und
Überlebende** zu bergen, und hältst Kessel, Crew und Rumpf am Leben — allein oder
später mit anderen Kolossen in derselben Welt.

### Kernschleife (1–3 Minuten)
1. **Fahren** — Gelände lesen: Packschnee, Pulverschnee, Eis, Hänge, Spalten.
2. **Entdecken** — der Nebel lichtet sich im Sichtradius, Fundstellen tauchen auf.
3. **Bergen** — Fundstelle anklicken → in Reichweite halten → Trupp/Kran arbeitet (Zeit).
4. **Abwägen** — Laderaum, Gewicht, Kohle für die Rückfahrt, Kälte steigt.
5. **Überleben** — Kessel heizen, Crew versorgen, vor dem Sturm Schutz finden.

### Langer Bogen: eine durchgehende Welt (Entscheidung F1)
Es gibt **keine Läufe mit Neustart**, sondern eine große Welt, in der man immer weiterfährt.
Der Spielstand läuft dauerhaft — im Multiplayer später auf einem Server.

- **Je weiter weg vom Start, desto kälter und reicher:** Ringe um den Startpunkt. Außen
  gibt es mehr Öl, Glutkerne und Überlebende, aber härtere Kälte, mehr dünnes Eis, mehr Stürme.
  Das ersetzt die „Schwierigkeitsstufen“ einer Expedition.
- **Siedlungen als Ankerpunkte:** verstreute Siedlungen in der Welt. Dort: Überlebende
  abgeben (Belohnung), Waren tauschen, reparieren, Module einbauen, Spielstand-Punkt.
  Gefundene Siedlungen sind Ziele auf der Weltkarte.
- **Ziele ohne Ende:** Aufträge der Siedlungen („bringt Kohle nach X“, „Notsignal im Norden“),
  Orte entdecken, den Koloss ausbauen, immer tiefer ins Eis vordringen.
- **Die Welt wird über die Zeit härter:** globale Kältestufen fallen langsam (wie in Frostpunk),
  abgeerntete Fundstellen füllen sich nur teilweise wieder (Holz wächst nach, Wracks nicht).
- **Liegengeblieben** (kein Brennstoff, Rumpf zerstört, Crew erfroren): *Vorschlag* — der
  Koloss bleibt als **Wrack in der Welt** (mit Ladung, als Fundstelle für andere), man
  beginnt in der zuletzt besuchten Siedlung mit einem einfachen Koloss neu. Hart, aber
  kein Verlust der ganzen Welt. *(Noch zu bestätigen.)*

---

## 3. Der Koloss

Ein Fahrzeug, kein Trupp: Der Spieler **ist** der Koloss.

| Wert | Bedeutung |
|---|---|
| **Kesseldruck** (Hauptregler, 4 Stufen) | mehr Druck = schneller + wärmer, frisst mehr Kohle; Stufe 4 = Überdruck-Risiko (Schaden) |
| Brennstoff | Kohle (Standard), Holz (brennt schnell, wenig Wärme), Öl (stark, selten, eigener Tank) |
| Wärme an Bord | folgt Kesseldruck minus Außenkälte; zu kalt → Crew wird krank/stirbt |
| Rumpf | Schaden durch Kollision, Eisbruch, Überdruck; Reparatur kostet Ersatzteile |
| Laderaum / Gewicht | jede Ware wiegt; Gewicht senkt Tempo, erhöht Verbrauch, bricht dünnes Eis |
| Crew | Arbeiter (bergen), Heizer (Kessel), Ingenieure (reparieren); Überlebende werden Crew |
| Moral | sinkt bei Kälte, Hunger, Toten, harten Entscheidungen; zu tief → Meuterei-Ereignisse |

**Fahrgefühl:** schwer und träge. Hohe Masse, langsames Beschleunigen, langer Bremsweg,
auf Eis rutscht das Heck. Das ist gewollt — der Koloss soll sich wie 400 Tonnen anfühlen.

**Module (später):** Kran (größere Bergungsreichweite), Eisbrecher-Bug (dünnes Eis sicherer),
Suchscheinwerfer (Sicht nachts/im Sturm), Lazarett, zweiter Kessel, Schneepflug
(Pulverschnee weniger bremsend), Brückenleger (kurze Spalten überqueren).

---

## 4. Ressourcen

| Ressource | Quelle (Fundstelle) | Wofür |
|---|---|---|
| **Kohle** | Kohlehalden, verlassene Zechen, Wrack-Tender | Kessel (Hauptbrennstoff) |
| **Holz** | Ruinen, eingeschneite Wälder (Fällen dauert) | Notbrennstoff, Reparatur |
| **Öl** | Fässer in Depots, seltene Ölquellen | starker Brennstoff / Überdruck ohne Schaden |
| **Nahrung** | Vorratslager, Jagdgründe | Crew füttern; Hunger → Moral/Gesundheit |
| **Ersatzteile** | Wracks, Maschinenruinen | Rumpf reparieren, Module bauen |
| **Überlebende** | Lager, Wracks, Notsignale | Crew-Zuwachs (Arbeit) — kosten Nahrung + Wärme |
| *Glutkern* (selten) | tief im Eis, gefährliche Orte | Modul-Ausbau, Endziel-Belohnung |

Alle Werte ganzzahlig; Verbrauch pro Tick klein, Anzeige pro Minute.

---

## 5. Karte & Gelände

**Erzeugung aus Seed** (wie in Kronwege): Die Welt wird aus einer Zahl berechnet und
muss nicht gespeichert oder übers Netz geschickt werden — nur **Änderungen**
(geborgene Fundstellen, gebrochenes Eis) liegen im Spielzustand.

**Aufbau:** Rasterzellen à 4 m, gruppiert in **Chunks** (64 × 64 Zellen = 256 m).
Die Welt ist **unbegrenzt**: Chunks werden erst erzeugt, wenn sie gebraucht werden. Zum
Testen ist der Bereich ±32 Chunks um den Start (≈ 16 × 16 km) die „Kernwelt“.
**Ringe um den Start** steuern Kälte, Eisanteil, Sturmhäufigkeit und Fundstellen-Reichtum.

**Geländearten (erste Version):**

| Gelände | Tempo | Verbrauch | Besonderheit |
|---|---|---|---|
| Packschnee | 100 % | 100 % | Normalfall |
| Pulverschnee (locker) | 50 % | 160 % | bei sehr langsamer Fahrt: festgefahren (Ausgraben kostet Zeit) |
| Dickes Eis | 120 % | 80 % | wenig Haftung: Rutschen, langer Bremsweg |
| Dünnes Eis | 120 % | 80 % | **bricht** bei zu viel Gewicht / zu langem Stehen → schwerer Schaden; Risse als Warnung |
| Hang | 60 % bergauf | 150 % | bergab schneller, schlechter zu bremsen |
| Fels / Berg | — | — | unpassierbar |
| Schlucht / Spalte | — | — | unpassierbar; nur an Furten/Brücken oder mit Brückenleger |
| Ruinen / Wald | 40 % | 130 % | Kollisionsschaden bei Tempo, oft Fundstellen |

**Generator in Schichten** (jede für sich testbar): Höhen-Rauschen → Berge/Pässe ·
Schluchten als gewundene Linien mit garantierten Übergängen · gefrorene Seen (Eis, Rand
dünn, Mitte dick) · Schneedecke aus zweitem Rauschen · Fundstellen nach Regeln
(Kohle häufiger bei Felsen, Öl selten und weit draußen, Überlebende an Ruinen).
**Garantie per Test:** vom Start ist jedes Ziel ohne Spezialmodul erreichbar.

**Sicht & Nebel:** Sichtradius um den Koloss (nachts/im Sturm kleiner). Unentdecktes bleibt
weiß-grau, Entdecktes bleibt als „Erinnerung“ sichtbar.

**Wetter:** Kältestufen fallen über die Zeit, Tag/Nacht, angekündigte Schneestürme
(Sicht runter, Kälte runter, Pulverschnee wächst).

---

## 6. Zoom & Darstellung

Stufenlos von **ganz nah** (Koloss bildschirmfüllend, ~40 px pro Meter) bis **ganz weit**
(die ganze 16-km-Welt auf dem Bildschirm, ~0,05 px/m) — Faktor ~800.

Damit das in Canvas2D flüssig bleibt:
- **Chunk-Bilder in Detailstufen (LOD):** jeder Chunk wird einmal in mehreren Auflösungen
  vorgezeichnet und zwischengespeichert; je nach Zoom wird die passende Stufe gemalt.
- **Nah:** Detail-Überlagerung (Schneekörnung, Spuren, Eisrisse), Koloss als
  detaillierte Zeichnung mit drehenden Rädern und Rauch.
- **Mittel:** Koloss als Sprite, Fundstellen als Symbole.
- **Weit:** Kartenansicht — Symbole statt Gelände-Details, **Reichweiten-Ring**
  (wie weit reicht die Kohle?), Wegmarken.
- Mausrad = Zoom zum Mauszeiger; Kamera folgt dem Koloss, Mittelklick/Leertaste zum Lösen.

**Grafik am Anfang:** alles per Code gezeichnet (Formen, Farbverläufe) im Stil des
Konzeptbilds — grüner Rumpf, schwarze Kessel, Kupfer, rote Räder. Echte Sprites später.

---

## 7. Steuerung

| Eingabe | Wirkung |
|---|---|
| **W / S** | Maschinentelegraf eine Stellung voraus / zurück; die Maschine hält das Tempo (Spieltest M2b) |
| **A / D** | lenken |
| **1–4** oder **Q / E** | Kesseldruck runter/rauf |
| **Linksklick** auf Fundstelle | Bergen starten (wenn in Reichweite), sonst Wegmarke setzen |
| **Linksklick** auf eigene Crew/Modul | Info |
| **Rechtsklick** | Wegmarke / Kontextmenü |
| **Mausrad** | Zoom |
| **Leertaste** | Kamera zurück zum Koloss |
| **L** | Scheinwerfer an/aus (auch Lichtschalter in der Anzeige; nachts/im Sturm später nötig) |
| **F3** | Debug-Anzeige |

Bergen läuft **im Stand oder Schritttempo**: Fährt man weg, bricht der Trupp ab.

**Bergen in zwei Stufen (Entscheidung F4):**
- **M3:** Klick → Trupp arbeitet unsichtbar, **Ladebalken** über der Fundstelle. Dauer hängt von
  Fundstelle, Anzahl Arbeiter und Kälte ab. Ware landet Stück für Stück im Laderaum.
- **Später (M7+):** Arbeiter steigen sichtbar aus, laufen hin, frieren draußen und können
  zurückgelassen werden. Damit das ohne Umbau geht, ist der Trupp schon in M3 im Zustand
  ein eigenes Objekt (`trupp {id, koloss, fundstelle, leute, fortschritt}`) — nur eben ohne
  Position und Darstellung.

**Pause & Tempo (Entscheidung F3):** Im Einzelspiel Pause (P) und Tempo 1×/2×/4×.
Im Multiplayer läuft die Zeit immer durch; Pause nur, wenn alle zustimmen. Technisch: Die
Takt-Schleife fragt die `Verbindung`, ob pausiert ist — die Simulation selbst kennt keine Pause.

---

## 8. Multiplayer von Anfang an mitgedacht

Ziel: 2–4 Kolosse in **einer** dauerhaften Welt, **Koop + Konkurrenz, kein PvP-Kampf**
(Entscheidung F2): Man kann sich helfen, aber auch um Fundstellen und Überlebende wetteifern.
Kolosse schießen nicht aufeinander.

**Konkurrenz-Regeln (Vorschlag):**
- Fundstellen gehören niemandem. Bergen zwei Kolosse dieselbe, teilen sie sich den Rest
  nach Arbeitstempo — wer mehr Leute schickt, bekommt mehr.
- Überlebende gehen zu dem, der sie zuerst erreicht (Klick in Reichweite).
- Siedlungs-Aufträge: wer zuerst liefert, kassiert; andere bekommen einen Trostpreis.
- Wracks liegengebliebener Kolosse kann jeder plündern — oder retten (abschleppen
  zur Siedlung → Belohnung + Dank des Besitzers).
- Rammen/Abdrängen: Kolosse kollidieren physisch, aber Kollisionsschaden ist bei beiden
  gleich — Rempeln lohnt sich nicht.

Damit der Umbau später kein Neubau wird, gelten ab Tag 1 diese Regeln:

1. **Simulation getrennt von Darstellung.** `sim/` kennt kein Canvas, keine Tastatur,
   kein `Date.now()`. Läuft identisch im Browser und unter Node (= späterer Server).
2. **Fester Takt:** 20 Ticks/Sekunde. Darstellung interpoliert dazwischen.
3. **Deterministisch:** nur Ganzzahlen/Festkomma (Position in mm, Winkel in 1/65536
   Umdrehung, Sinus aus Tabelle), Zufall nur aus dem RNG im Zustand.
   → Replays, Tests und spätere Client-Vorhersage ohne Ruckeln.
4. **Zwei Eingabewege, beide mit `spielerId` + `tick`:**
   - *Steuereingabe* (pro Tick): `{gas, lenkung, druck}`
   - *Befehle* (Ereignisse): `BERGEN_START {fundstelle}`, `BERGEN_ABBRECHEN`,
     `WEGMARKE_SETZEN`, `ÜBERLEBENDE_AUFNEHMEN {entscheidung}` …
   Der Zustand wird **nur** über diese Wege verändert.
5. **Verbindungs-Schnittstelle** `Verbindung` mit `senden()` / `empfangen()`:
   - jetzt: `LokaleVerbindung` (Server-Sim läuft im selben Browser)
   - später: `WebSocketVerbindung` zu einem Node-Server
   Spiel-Code merkt den Unterschied nicht.
6. **Server ist die Wahrheit** (autoritativ): Clients schicken Eingaben, Server schickt
   Zustandsänderungen; eigener Koloss wird lokal vorhergesagt und bei Abweichung korrigiert,
   fremde Kolosse werden interpoliert. (Lockstep wie in Kronwege passt hier schlechter:
   Echtzeit-Fahren verträgt keine Eingabeverzögerung.)
7. **Welt = Seed + Änderungsliste.** Nur Änderungen gehen übers Netz.
8. **Sichtbarkeit pro Spieler** wird im Server berechnet (Chunks im Sichtradius) — so kann
   später niemand den Nebel wegschummeln.
9. **Jede Einheit hat `id` und `besitzer`.** Fundstellen kennen „wer birgt gerade“ (Konflikt
   bei zwei Spielern: wer zuerst klickt).
10. **Spielstand = serialisierbarer Zustand mit Versionsnummer** (JSON), wie in Kronwege.
11. **Dauerhafte Welt:** Spielerdaten (Koloss, Crew, Laderaum) und Weltdaten (Änderungen
    je Chunk, Siedlungen, Wracks) liegen getrennt. Ein Spieler kann gehen und wiederkommen;
    nur Chunks mit Änderungen werden gespeichert. Koordinaten sind unbegrenzt (Chunks
    werden bei Bedarf aus dem Seed erzeugt).
12. **Pause gehört der Verbindung, nicht der Simulation** (siehe §7).

**Spätere Mehrspieler-Ideen:** Abschleppen eines liegengebliebenen Kolosses, Ware/Kohle
übergeben, gemeinsamer Konvoi (Windschatten im Sturm), getrennte Expeditionen mit
gemeinsamer Heimatsiedlung.

---

## 9. Technik

Gleicher Unterbau wie **Kronwege** — bekannt, erprobt, Node 26 ist installiert:

- JavaScript-ES-Module + JSDoc/`@ts-check`, **kein Build, keine Engine**
- Canvas2D (WebGL erst, falls Zoom/Chunks zu langsam werden)
- Node nur für Tests und später den Server (`ws`-Paket für WebSockets)
- Code ausführlich deutsch kommentiert, Dateikopf ZWECK / LIEST / SCHREIBT / REGEL / DEBUG
- Tests unter Node + im Browser, Replay-Test (gleicher Seed + gleiche Eingaben = gleicher Hash)

```
Eiskoloss/
  index.html, main.js, style.css
  sim/          ← reine Simulation (läuft auch auf dem Server)
    welt/       ← Seed-Generator, Chunks, Gelände
    koloss/     ← Fahrphysik, Kessel, Laderaum, Crew
    fundstellen/, wetter/, ereignisse/
    befehle/    ← einziger Schreibweg
  netz/         ← Verbindung (lokal / WebSocket), Nachrichten
  game/         ← Takt-Schleife, Vorhersage, Interpolation
  render/       ← Kamera, Chunk-LOD, Koloss-Zeichnung, Nebel
  ui/           ← Anzeigen (Kessel, Laderaum, Crew), Klick-Logik
  eingabe/      ← Tastatur/Maus → Steuereingabe/Befehle
  server/       ← (M6) Node-Server
  tests/, tools/, docs/
```

---

## 10. Bauplan (Meilensteine)

Jeder Meilenstein ist spielbar und endet mit Tests + kurzem Spieltest.

| | Meilenstein | Ergebnis |
|---|---|---|
| **M0** | Gerüst | Ordner, git, Takt-Schleife 20 Hz, Canvas, Kamera mit Zoom, F3-Debug, Test-Werkzeug, Vorschau-Eintrag |
| **M1** | Fahren | Koloss per WASD auf leerer Schneefläche: Masse, Trägheit, Lenkung, Rutschen; Kamera folgt; Zoom nah ↔ weit |
| **M2** | Welt | Seed-Generator mit Chunks: Berge, Schluchten, Seen (dünn/dick), Pulverschnee; Gelände wirkt aufs Fahren; Kollision; LOD-Darstellung; Erreichbarkeits-Test |
| **M3** | Fundstellen & Bergen | Fundstellen je Ressource, Nebel/Sicht, Klick → Bergen in Reichweite, Laderaum + Gewicht, Anzeige-Leiste |
| **M4** | Überleben | Kessel + Druckstufen, Verbrauch, Kälte & Tag/Nacht, Crew-Wärme/Hunger/Gesundheit, Moral, Eisbruch, Liegenbleiben → Wrack; erste Siedlung (abgeben, reparieren, speichern), Pause/Tempo |
| **M5** | Ereignisse | Stürme mit Vorwarnung, Entscheidungen (Überlebende, Wracks), Reichweiten-Ring, mehrere Siedlungen + Aufträge |
| **M6** | Multiplayer | Node-Server, WebSocket-Verbindung, 2–4 Spieler Koop + Konkurrenz, Vorhersage + Korrektur, Sichtbarkeit pro Spieler, dauerhafter Server-Spielstand |
| M7+ | Ausbau | Module, sichtbare Bergungstrupps, Wrack-Abschleppen, echte Grafik, Ton |

**M0 + M1 zusammen sind der erste sinnvolle Testpunkt:** Fühlt sich das Fahren gut an?
Wenn nicht, hilft kein Ressourcensystem.

---

## 11. Entscheidungen & offene Fragen

**Entschieden am 2026-11-10:**

| | Frage | Entscheidung |
|---|---|---|
| F1 | Spielform | **Durchgehende Welt** — keine Läufe, dauerhafter Spielstand (§2) |
| F2 | Multiplayer-Art | **Koop + Konkurrenz**, kein PvP-Kampf (§8) |
| F3 | Pause | **Pause + Tempo im Einzelspiel**, im Multiplayer läuft die Zeit (§7) |
| F4 | Bergen | **Erst Ladebalken (M3), später sichtbare Leute** (§7) |

**Noch offen:**
- **F5 Name:** „Eiskoloss“ ist nur Arbeitstitel.
- **F6 Liegengeblieben:** Vorschlag in §2 (Wrack bleibt in der Welt, Neustart in Siedlung) bestätigen?
- **F7 Konkurrenz-Regeln:** Vorschläge in §8 bestätigen (spätestens vor M6).

**Folgen für den Bauplan:** M2 erzeugt Chunks unbegrenzt bei Bedarf (nicht nur 16 × 16 km)
und legt die Kälte-/Reichtums-Ringe an. M4 bekommt statt „Expeditionsziel“ die erste
Siedlung (abgeben, reparieren, speichern). M5 bringt Siedlungs-Aufträge.

---

## Quellen (Recherche 2026-11-10)

- Frostpunk 2 Frostland-Teams: https://primagames.com/tips/how-to-get-more-frostland-teams-in-frostpunk-2
- Frostpunk 2 Erkundung: https://selphie1999gaming.com/game-guides/frostpunk-2/how-frostpunk-2-frostland-exploration-works/
- Frostpunk 2 Kerne: https://primagames.com/tips/how-to-get-and-use-cores-in-frostpunk-2
- Frostpunk-Lore Zeitleiste: https://shapes.inc/fandom/frostpunk/timeline
- Frostpunk-Automaten: https://pcgamer.com/frostpunks-automatons-are-helpful-machines-that-probably-wont-kill-anyone
- HighFleet Kartenansicht (Reichweiten-Ring): https://www.magicgameworld.com/highfleet-map-view/
- HighFleet Review: https://primagames.com/reviews/highfleet-review
