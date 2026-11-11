# Spec M4b — Crew: Hunger, Gesundheit, Moral

Stand 2026-11-11 · Grundlage: KONZEPT.md §3 (Crew, Moral), §4 (Nahrung), §10 (M4) · Entscheidung E-018

## Nutzerentscheidungen (2026-11-11)
- **Gruppen mit Werten**, keine einzelnen Leute: Anzahl Heizer und Arbeiter, gemeinsame Werte für
  Sattheit, Gesundheit und Moral.
- **Arbeiter = Bergetempo:** Der Bergungstrupp sind die gesunden Arbeiter.
- **Kälte und Hunger machen krank**, Kranke arbeiten nicht.
- **Leute können sterben** (bei sehr schlechter Gesundheit, nach und nach).
- **Moral wird erst nur angezeigt** (Wirkung, z. B. Meuterei, später).
- Heizer begrenzen das Feuer **nicht** (bewusst nicht gewählt) — sie zählen nur als Mitesser.
- **Lager-Ansicht:** Draufsicht ohne Dach — das Popup zeigt den Laderaum von oben, mit Kohle,
  Holzstapeln, Fässern und Kisten, die den Füllstand sichtbar machen.

## Zustand (v9)
`k.crew` je Koloss (alles Ganzzahlen):

| Feld | Bedeutung |
|---|---|
| `heizer`, `arbeiter` | Anzahl Leute je Aufgabe (Start 4 + 6) |
| `satt` | 0 … 1 000 000 (Millionstel; 1 000 000 = satt) |
| `gesundheit` | 0 … 1 000 000 |
| `moral` | 0 … 1 000 000 (nur Anzeige) |
| `essenMg` | angefangenes kg Vorräte (Milligramm) |
| `sterben` | Sammler bis zum nächsten Todesfall |
| `tote` | Zahl der Toten bisher |

Start mit 300 kg Vorräten im Warenlager. `trupp.leute` wird jeden Tick aus der Crew gesetzt
(gesunde Arbeiter).

## Regeln (`sim/koloss/crew.js`, Tick-System nach dem Kessel)
1. **Essen:** Jeder isst `ESSEN_KG_TAG` (10 kg) je Spieltag aus dem Warenlager (Vorräte).
   Gibt es Vorräte, steigt `satt` schnell auf voll; sonst sinkt es in einem Spieltag (20 min) auf 0.
2. **Kälte:** Unter 0 °C an Bord verliert die Crew Gesundheit — je kälter, desto schneller
   (bei −10 °C in ~8 min von voll auf 0).
3. **Hunger:** Unter 30 % Sattheit verliert sie Gesundheit (bei 0 % in ~14 min von voll auf 0).
4. **Erholung:** Ab +10 °C an Bord und mindestens halb satt erholt sich die Gesundheit (~20 min von 0 auf voll).
5. **Krank:** Je Gruppe sind `Anzahl × (1 − Gesundheit)` Leute krank (gerundet). Kranke Arbeiter
   bergen nicht → der Trupp ist kleiner, Bergen dauert länger. Ohne gesunde Arbeiter kein Bergen.
6. **Sterben:** Unter 25 % Gesundheit stirbt nach und nach jemand (bei 0 % etwa einer je Minute),
   zuerst aus der größeren Gruppe. Jeder Tod senkt die Moral um 10 %.
7. **Moral** strebt träge zu „100 % minus Kälte, Hunger, Krankheit“; Todesfälle drücken sie sofort.
   Keine Wirkung in M4b.

## Anzeige
- HUD: Zeile „Crew“ (4 Heizer · 6 Arbeiter · 1 krank) und Zeile mit drei kleinen Balken
  Satt / Gesund / Moral; Zeile „Trupp“ zeigt den gesunden Trupp.
- F3: Crew-Werte. Lager-Popup: Draufsicht ins Fahrzeug (`ui/lager-blick.js`).

## Tests (`tests/crew.test.js`)
Essen verbraucht Vorräte / Hunger ohne Vorräte; Kälte macht krank, Wärme + Essen heilt; kranke
Arbeiter bergen langsamer, ohne gesunde kein Bergen; Todesfälle bei schlechter Gesundheit senken die
Moral. Replay neu aufgenommen (Zustand v9).

## Später
Heizer/Ingenieure mit Wirkung, Moral-Ereignisse (Meuterei), Überlebende als Fundstelle, Lazarett.
