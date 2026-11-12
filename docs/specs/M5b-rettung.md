# Spec M5b — Rettungsauftrag: Schneewehen, Signalballons, Überlebende

Stand 2026-11-11 · Grundlage: Nutzerwunsch nach Spieltest M5a, KONZEPT.md §2 (Siedlungen), §4 (Überlebende),
§5 (Sicht & Nebel) · Entscheidung E-022

## Nutzerwunsch (2026-11-11)
„Man fährt von Überlebenden-Städten aus los, um zu erkunden und Ressourcen zu beschaffen. Der Signalballon
der Städte soll auf der Karte sichtbar sein, wenn auch nur als Indikator. Die Karte soll überwiegend
verdeckt sein durch Schneewehen, man muss den Weg finden, ohne alles sehen zu können. Rohstoffe viel
weniger. Szenario: Wir starten in der Stadt, in der ein Generator noch funktioniert, und sollen Überlebende
5 km entfernt retten — wir kennen nur die grobe Region, nicht den genauen Standort.“

## Nutzerentscheidungen
- **Verdeckung:** Gesehenes **weht wieder zu** (nach einigen Minuten); die eigene Spur bleibt länger frei.
- **Sichtweite:** 300 m bei Tag ohne Sturm (nachts weniger, Scheinwerfer reichen weiter voraus).
- **Signal:** Die Region steht als Kreis auf der Karte. Kommt man auf ~1 km heran, steigt der
  Signalballon der Überlebenden auf und zeigt die genaue Stelle. Die eigene Stadt hat immer einen Ballon.
- **Rettung:** Die Überlebenden steigen ein (brauchen Kojen und Essen), man bringt sie in die Stadt.
  **Kein Zeitlimit.**

## Vorschläge (zum Abstimmen in `data/auftrag.js`, `data/fundstellen.js`)
- 8 Überlebende; Region: Kreis mit 800 m Radius, Mitte 4,8–5,2 km vom Start in zufälliger Richtung
  (aus dem Seed); das Lager liegt darin höchstens 550 m von der Mitte, auf befahrbarem Boden.
- Fundstellen: 10 % der Zellen statt 30 %, rund um den Start 30 % statt 65 %.
- Die Heimstatt wird zur „Stadt mit Generator“: der Wärmeofen in der Mitte wird ein größerer Generator.

## Zustand (v13)
`state.auftrag = {leute, gesichtet, gerettet, verloren}` — Ort und Region kommen aus dem Seed (wie
Fundstellen, nicht im Zustand). `k.crew.passagiere` = Gerettete an Bord.

## Regeln (`sim/auftrag.js`)
- **Gesichtet:** Ist irgendein Koloss ≤ 1000 m vom Lager, steigt der Ballon auf (bleibt oben).
- **Befehl `RETTEN`:** im Stand, ≤ 60 m vom Lager, dort warten noch Leute, freie Kojen → so viele steigen
  ein, wie Kojen frei sind. Sie sind geschwächt (Gesundheit 50 %, Sattheit 20 %); die gemeinsamen
  Crew-Werte werden anteilig gemischt. Passagiere essen mit, zählen bei den Kojen, arbeiten nicht.
- **Ankunft:** Hält der Koloss in einer Siedlung, steigen die Passagiere aus → `gerettet`.
- **Wrack mit Passagieren:** Sie gehen verloren (`verloren`).
- **Erfüllt**, wenn niemand mehr im Lager wartet und keiner mehr an Bord ist (und mindestens einer gerettet).

## Darstellung (nur Darstellung, kein Zustand)
- **Schneewehen** (`render/nebel.js`): Die Welt liegt unter einer weißen Wehen-Decke. Frei ist der
  Sichtkreis um den eigenen Koloss (weicher Rand) plus die Scheinwerferkegel. Gesehenes bleibt in einer
  Welt-Maske (10 m je Punkt, ±8 km) frei und weht in ~4 min wieder zu; die eigene Spur der letzten 12 min
  bleibt als 50 m breiter Streifen frei. Unter der Decke verschwinden Gelände, Fundstellen, Wracks und
  fremde Kolosse. Fundstellen lassen sich nur anklicken, wo man sie sieht.
- **Signale** (`render/signale.js`): Ballon über jeder Siedlung und (wenn gesichtet) über dem Lager —
  immer über der Decke sichtbar, außerhalb des Bildes als Messing-Marke am Rand mit Entfernung.
  Regionskreis gestrichelt mit „Notsignal“. Das Lager (Zelte, Feuer, Leute) liegt unter der Decke.
- **Anzeige:** Zeile unten rechts „✚ Überlebende · 5,1 km ↗ · 8 warten / 8 an Bord / gerettet ✓“.
  Meldungen oben: Notsignal beim Start, „Signalballon gesichtet“, „Auftrag erfüllt“. Klick aufs Lager = RETTEN.
- Testknopf „Nebel aus/an“ (nur Darstellung). Konsole `ek.auftrag()`.

## Tests (`tests/auftrag.test.js`)
Ort aus dem Seed deterministisch, ~5 km, Lager in der Region auf befahrbarem Boden; gesichtet ab 1 km;
RETTEN nur nah und im Stand, nach Kojen begrenzt; Ankunft in der Siedlung zählt gerettet; Wrack = verloren.
