# Spec M4a — Kessel frisst Brennstoff, Tag/Nacht, Kälte

Stand 2026-11-10 · Grundlage: KONZEPT.md §2, §3, §10 (M4) · Entscheidung E-015

M4 wird in Teilen gebaut (Nutzerentscheidung): **M4a** Kessel/Brennstoff/Tag/Kälte → M4b Crew
(Hunger, Gesundheit, Moral) → M4c Eisbruch, Rumpfschaden, Liegenbleiben (F6: Wrack + Neustart in
Siedlung) → M4d erste Siedlung.

## Nachtrag Spieltest M4a (2026-11-10, gilt vor den Abschnitten unten)
- **Dampfvorrat statt träger Druckstufe** (E-016): `k.dampf` 0 … 400 000 (eine Manometer-Stufe =
  100 000). Das Feuer füllt höchstens `ERZEUGUNG[Feuerstufe]` je Tick nach, die Maschine entnimmt
  Schub × Tempo / `DAMPF_TEILER`. Höchster Schub ∝ Druck. Wer mehr verlangt, als das Feuer liefert,
  sieht den Druck fallen, bis Tempo und Feuer zusammenpassen — **keine zitternde Nadel mehr**.
  Jede Feuerstufe hält ihr Tempo aus DRUCKSTUFEN auf Packschnee auf Dauer (+5 % Reserve).
- **Verbrauch folgt dem Dampf** (Nutzerentscheidung „Heizer legen weniger nach“): Glut 20 kg/min +
  640 mg je Dampf-Einheit. Gemessen: langsam (Feuer 1, 10 km/h) 128 kg/min = 0,77 t/km, Mittel
  (18 km/h) 372 kg/min = 1,24 t/km, Volldampf (33 km/h) 1,2 t/min = 2,2 t/km. Öl heizt NICHT mehr
  schneller auf (nur halber Verbrauch). Ohne Feuer oder bei „ruht“ sinkt der Druck in ~3 min auf 0.
- **Heizung** (Befehl `HEIZUNG`, Taste O, Ofen-Schalter neben der Lampe): +60 kg/min, +15 °C an Bord.
  **Ab Spieltest M4a-2 (E-017):** Thermostat auf +23 °C, Verbrauch nach Lücke zu „außen + Kesselwärme“.
- **Zwei Lager** (Nutzerwunsch): Brennstofflager 100 t (Kohle, Holz, Öl — daraus heizt der Kessel),
  Warenlager 60 t (Holz, Vorräte). `k.holzZiel` wählt, wohin neues Holz kommt. Gewicht: −20 % Schub
  je 100 t. Befehle `ABWERFEN {lager, ware, kg}` (1 t je Klick, Umschalt = alles), `UMLAGERN`
  (Holz), `HOLZZIEL`. Abgeworfenes liegt als Haufen 26 m hinter dem Koloss (`state.abwuerfe`) und
  kann mit `AUFNEHMEN` wieder geborgen werden (halbe Arbeit), auch von anderen.
- **Lager-Popup** neben dem Koloss (`ui/lager.js`): Klick auf den eigenen Koloss oder Taste I.
- Nachts nur 16 Bilder/s → Dunkel-Ebene in halber Auflösung.
- Zustand v8.

## Nutzerentscheidungen (2026-11-10)
- **Ein Spieltag = 20 min** echte Zeit (1 Spielstunde = 50 s = 1000 Ticks).
- **Verbrauch „mittel“:** Eine mittlere Kohlehalde (~11 t) reicht für ~30–35 min Fahrt bei „Mittel“.
- **Brennstoff selbst wählen:** Messing-Wahlschalter Kohle / Holz / Öl in der Anzeige (Taste B).
  Ist der gewählte Brennstoff alle, geht das Feuer aus — kein automatischer Wechsel.
- **Druck ist träge:** Q/E stellen das Feuer ein; der Dampfdruck läuft langsam hinterher.
- Ladung bleibt nur in der Anzeige sichtbar.

## Kessel (`sim/koloss/kessel.js`, Tick-System vor dem Fahren)
- `k.druck` = eingestellte Feuerstufe (wie bisher, Befehl `DRUCK`), **neu** `k.dampf` = tatsächlicher
  Druck in Tausendstel-Stufen (0 … 4000). Der Schub wird zwischen den Stufen gleitend aus `dampf`
  berechnet (`kesselSchub()`), rückwärts braucht mindestens eine Stufe Dampf.
- Dampf steigt eine Stufe in ~15 s (Öl doppelt so schnell), fällt eine Stufe in ~10 s; ohne Feuer
  sinkt er eine Stufe in ~25 s bis auf 0 (der Koloss rollt aus).
- **Verbrauch** je Feuerstufe bei voller Last (kg/min Kohle): ruht 20 · schwach 200 · mittel 360 ·
  stark 540 · Volldampf 760. Ohne Last nur 20 % davon. Holz ×2 (brennt schnell), Öl ×0,5.
  Gerechnet in Gramm (`k.feuerG` sammelt Bruchteile), abgezogen wird ganze kg aus `k.ladung`.
- Feuer brennt nur, solange vom gewählten Brennstoff (`k.brennstoff` 0 Kohle, 1 Holz, 2 Öl) noch
  etwas im Laderaum ist.
- **Start:** 4 t Kohle und 1 t Holz an Bord (reicht ~10 min bei „Mittel“; in Startnähe liegen Funde).
- Die Überlast-Anzeige (zitternde Nadel) rechnet weiter mit der eingestellten Stufe.

## Tag und Nacht (`sim/wetter/tag.js`, aus `state.tick` berechnet, kein eigenes Feld)
- Start 08:00. Hell 06:00–19:12, Dämmerung bis 21:36 bzw. ab 03:36, Nacht 21:36–03:36 (~5 min).
- `dunkelheit(tick)` 0 … 1000. Die Darstellung nimmt das für die Dunkelheit (bisher nur `ek.nacht()`;
  `ek.nacht(x)` bleibt als Vorgabe zum Testen, `ek.nacht(null)` = wieder Tageszeit).

## Kälte (`sim/abfragen.js`)
- **Außentemperatur** (Zehntel °C): −20 °C am Start, bis −45 °C ab 5 km (Ring wie beim Gelände),
  nachts bis −10 °C kälter, Wind kühlt (−0,5 °C je m/s). Nur berechnet, nicht gespeichert.
- **Wärme an Bord** `k.waerme` (Zehntel °C): nähert sich „außen + Kesselwärme“ (ruht +5 … Volldampf
  +52 °C, gleitend mit dem Dampf), Zeitkonstante ~30 s, mindestens 1 Schritt je Tick.
  Wirkung kommt mit der Crew (M4b); in M4a nur sichtbar.

## Befehle
- `BRENNSTOFF {wahl}` (0 … 2; Feld heißt nicht `art`, das ist schon die Befehlsart).

## Anzeige
- Zeile „Kessel“: Stufe + Messing-Wahlschalter Kohle / Holz / Öl (aktiver gedrückt und glühend).
- Zeile „Kälte“: außen … °C · an Bord … °C.
- Unten rechts über dem Maßstab: „Tag 1 · 08:40“ mit Sonne/Mond.
- HUD-Dampfmaschine, Manometer, Feuerschein und Rauch folgen dem echten Dampf (`k.dampf`).

## Tests (`tests/kessel.test.js`)
Dampf steigt/fällt träge · Verbrauch je Stufe und Last, Holz ×2, Öl ×0,5 · leerer Brennstoff →
Feuer aus, Dampf sinkt auf 0 · `BRENNSTOFF` prüft · Tageszeit und Dunkelheit · Außentemperatur
(Ring, Nacht, Wind) · Wärme an Bord nähert sich dem Ziel ohne Hängenbleiben. Fahrtests nutzen einen
warmen Kessel (`fahre()` setzt den Dampf direkt). Replay neu (Zustand v7).

## Nicht in M4a
Crew, Hunger, Moral (M4b) · Eisbruch, Schaden, Überdruck mit Öl, Liegenbleiben/Wrack (M4c) ·
Siedlung (M4d) · globale Kältestufen, Stürme (M5).
