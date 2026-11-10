# Spec M2 — Welt aus dem Seed

Stand 2026-11-10 · Grundlage: KONZEPT.md §5, E-001…E-008

## Ziel
Eine unbegrenzte, rudimentäre, aber abwechslungsreiche Eiswelt aus dem Seed: Packschnee,
Pulverschnee-Wehen, Seen mit dickem Eis in der Mitte und dünnem am Rand, Felsmassive (Berge)
und gewundene Schluchten mit Übergängen. Fels und Schlucht sind unpassierbar (Kollision).

## Aufbau
- **Nachtrag Spieltest M2:** Der Generator rechnet in Feinpunkten zu 25 cm statt in 4-m-Zellen,
  der Chunk-Speicher ist entfallen, Darstellung in 7 Stufen (0,25–64 m/Bildpunkt) mit
  Kantenglättung, dazu „Ebenen“ für große freie Flächen. Die Punkte unten gelten sinngemäß.
- **Zelle** = 4 × 4 m. **Chunk** = 64 × 64 Zellen (256 m). Welt unbegrenzt in alle Richtungen.
- `sim/welt/rauschen.js`: Ganzzahl-Wertrauschen (Hash → Gitterwerte → geglättet interpoliert),
  mehrere Oktaven. Nur Ganzzahlen → auf jedem Rechner gleich (Kollision ist Spielregel!).
- `sim/welt/generator.js`: `zelleBerechnen(seed, gx, gy)` → Typ + Höhe, gepackt in eine Zahl.
  Schichten: Höhe → Fels · Schluchtband mit Furten → Spalte · Seen (Rand dünn, Mitte dick) ·
  Wehen → Pulverschnee · sonst Packschnee. Startbereich: 160 m reiner Packschnee, bis 400 m kein
  Fels/keine Spalte.
- **Ringe:** Mit der Entfernung vom Start (bis 4 km) mehr Fels und mehr Eis.
- `sim/welt/chunks.js`: Zwischenspeicher fertig berechneter Chunks (kein Spielzustand, E-009 aus
  Kronwege: Welt = Seed, nicht im Zustand).
- `sim/welt/untergrund.js`: `untergrundAn(seed, x, y)` bleibt die einzige Abfrage der Physik.
  **Seed 0 = Testgelände** (die festen Kreise aus M1 + ein Felsblock) — für Tests und zum Fühlen.

## Kollision (`sim/koloss/kollision.js`)
Prüfpunkte rund um den Rumpf (alle 4 m an beiden Seiten, Bug, Heck). Nach dem Bewegen:
1. frei → übernehmen; 2. sonst ohne Drehung versuchen; 3. sonst nur x oder nur y (an der Wand
entlangrutschen); 4. sonst stehen bleiben, Tempo 0. Schaden kommt in M4.

## Darstellung (`render/welt.js`)
Kacheln mit 64 × 64 Bildpunkten in drei Detailstufen: 1 Zelle/Bildpunkt (ab 0,5 px/m),
4 Zellen (ab 0,12 px/m), 16 Zellen (darunter). Weich hochskaliert, Fels mit Hangschattierung.
Berechnung mit Zeitbudget pro Bild, fehlende Kacheln erscheinen nach und nach.

## Tests
- Rauschen: gleich bei gleichem Seed, Werte im Bereich, verschiedene Seeds verschieden.
- Generator über 20 Seeds: Anteile der Typen in plausiblen Grenzen, Start frei,
  **Erreichbarkeit**: ≥ 90 % der befahrbaren Fläche im Umkreis von 600 m vom Start erreichbar
  (für einen 12 m breiten Koloss).
- Kollision (Testgelände): Fahrt gegen den Felsblock hält an, ohne einzudringen; rückwärts kommt
  man wieder frei; entlang der Wand wird gerutscht.

## Nicht in M2
Fundstellen, Sicht/Nebel (M3) · Eisbruch, Schaden (M4) · Hänge mit Tempowirkung (später).
