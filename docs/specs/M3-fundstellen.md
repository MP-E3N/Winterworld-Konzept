# Spec M3 — Fundstellen & Bergen

Stand 2026-11-10 · Grundlage: KONZEPT.md §4, §7, §8 (R7), §10 · Entscheidung E-014

## Nutzerentscheidungen (2026-11-10)
- **Vier Fundarten:** Kohlehalde, Holz (Ruine), Ölfässer, Vorratslager. Überlebende und
  Ersatzteile kommen erst mit der Crew (M4/M5).
- **Bergen nur im Stand:** Telegraf auf „Stopp“ und der Koloss steht. Wer losfährt, bricht ab.
- **Nebel später** — in M3 ist die ganze Karte sichtbar.
- Laderaum erst nur in der Anzeige; ob/wo die Ladung am Koloss zu sehen ist, fragt der Nutzer später.

## Fundstellen aus dem Seed (`sim/welt/fundstellen.js`)
- Die Welt ist in **Fundzellen** zu 200 m geteilt. Jede Zelle hat höchstens eine Fundstelle.
  Ein Hash aus Seed und Zellnummer entscheidet: ob es eine gibt, welche Art, wo in der Zelle
  (mit Rand, damit sich Fundstellen nicht berühren) und wie viel darin liegt.
- **Nicht im Zustand** — wie das Gelände jederzeit neu berechenbar. Die **ID** ist die
  gepackte Zellnummer `(zx + 32768) * 65536 + (zy + 32768)` (sichere Ganzzahl).
- Nur auf Pack- oder Pulverschnee (nicht auf Eis, Fels, Schlucht), nicht näher als 45 m am
  Startpunkt (dort steht der Koloss). Rund um den Start (bis 450 m) ist die Chance höher.
- **Öl** erst ab 1,5 km vom Start, nach außen häufiger (Ring wie beim Gelände).
- **Seed 0 (Testgelände):** feste Fundstellen aus `data/testgelaende.js` (je eine pro Art in
  Startnähe), damit Tests nicht vom Zufall abhängen.
- Werte in `data/fundstellen.js` (Mengen, Stückgröße, Arbeitszeit, Häufigkeit, Größe, Farbe).

## Zustand v6
- `state.geborgen[]` — **Änderungsliste**: `{fund, rest}` je angebrochener Fundstelle
  (rest in kg, 0 = leer). Wer nicht drinsteht, ist unberührt.
- `state.trupps[]` — je Koloss ein Bergungstrupp (Entscheidung F4), Index = ID:
  `{id, koloss, fund, leute, fortschritt}`; `fund = -1` = wartet. Noch ohne Position.
- `koloss.ladung` — `{kohle, holz, oel, nahrung}` in kg; `koloss.trupp` = ID des Trupps.

## Befehle
- `BERGEN_START {fund}`: erlaubt, wenn die Fundstelle existiert und nicht leer ist, der Koloss
  steht (Telegraf Stopp, Tempo fast 0), die Fundstelle in Reichweite ist (60 m von der Rumpfmitte)
  und im Laderaum noch Platz ist. Ein laufendes Bergen wird ersetzt.
- `BERGEN_ABBRECHEN {}`: Trupp kehrt zurück (wartet).

## Tick-System `sim/bergen.js` (nach dem Fahren)
Je Trupp mit Auftrag: Steht der Koloss nicht mehr oder ist die Fundstelle außer Reichweite →
abbrechen. Sonst `fortschritt += leute`. Ist die Arbeit für ein **Stück** geschafft (z. B.
500 kg Kohle), wandert es in den Laderaum und von der Fundstelle ab. Leer oder Laderaum voll →
Trupp wartet.

## Laderaum und Gewicht
Laderaum 60 t (Summe aller Waren). **Gewicht bremst:** Der Schub sinkt linear bis −25 % bei
vollem Laderaum (`schubMitLadung()` in `sim/abfragen.js`) — Höchsttempo und Anfahren werden
schwächer; verlangt der Telegraf zu viel, zittert die Manometer-Nadel wie bisher. Bremsen und
Lenken bleiben (Eisbruch durch Gewicht kommt in M4).

## Darstellung und Bedienung
- `render/fundstellen.js`: Fundstellen als vorgerenderte Bildchen je Art (mehrere Varianten),
  die mit dem Rest schrumpfen; leere bleiben blass liegen. Weit weg nur ein kleines Zeichen.
  Darüber beim Bergen ein **Messing-Ladebalken** (Anteil geborgen) mit dünner Stück-Leiste.
- **Mauszeiger über einer Fundstelle:** Ring (Messing = Bergen möglich, grau gestrichelt =
  zu weit weg / Koloss fährt / Laderaum voll), kleines Messingschild mit Name und Menge,
  Reichweitenkreis um den Koloss. Keine Warntexte.
- `eingabe/maus.js`: **Linksklick** auf eine Fundstelle → `BERGEN_START`; Klick auf die
  Fundstelle, an der gerade gearbeitet wird → `BERGEN_ABBRECHEN`.
- Anzeige unten links: Zeile „Laderaum“ (Messingbalken + t von 60 t) und eine Zeile mit den vier
  Waren. Keine neuen Fenster.
- Konsole: `ek.funde()` (Fundstellen in der Nähe mit Abstand), `ek.ladung()`.

## Tests (`tests/bergen.test.js`)
- Gleicher Seed → gleiche Fundstellen; ID ↔ Fundstelle; keine auf Eis/Fels/Schlucht, keine am
  Startpunkt; über 20 Seeds liegen Fundstellen in Startnähe; Öl nie näher als 1,5 km.
- `BERGEN_START` abgelehnt: fährt, Telegraf nicht Stopp, zu weit weg, unbekannte/leere Fundstelle,
  Laderaum voll.
- Bergen füllt den Laderaum Stück für Stück, die Fundstelle wird leer, der Trupp wartet danach.
- Telegraf weg von Stopp → Abbruch. Laderaum voll → Ende.
- Gewicht: voller Laderaum → niedrigeres Höchsttempo; leer unverändert.
- Testfahrt (Determinismus/Replay) enthält ein Bergen.

## Nicht in M3
Nebel/Sicht (später, Nutzerwunsch) · Verbrauch, Kälte, Crew, Eisbruch (M4) · sichtbare Trupps (M7+).
