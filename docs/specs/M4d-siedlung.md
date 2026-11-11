# Spec M4d — Erste Siedlung: Heimstatt (Depot, Crew, Speichern, Neustart)

Stand 2026-11-11 · Grundlage: KONZEPT.md §2 (Siedlungen, F6), §10 (M4) · Entscheidung E-020

## Nutzerentscheidungen (2026-11-11)
- **Heimat am Start:** Der Startpunkt wird zur Heimatsiedlung „Heimstatt“. Man fährt von dort los,
  kommt mit Ladung zurück und startet nach einem Wrack auch dort neu. Weitere Siedlungen erst in M5.
- **Nur Depot:** Waren lassen sich einlagern und später wieder abholen. Keine Belohnung, kein Tausch.
- **Crew:** In der Siedlung werden Kranke gesund und alle satt; Tote lassen sich ersetzen, und man kann
  über die Startzahl hinaus Leute anheuern (mehr Arbeiter = schneller bergen, aber mehr Esser).
- **Speichern automatisch in der Siedlung:** beim Halt dort wird im Browser gespeichert; beim Neuladen
  der Seite geht es dort weiter.

## Lage und Gebäude (`data/siedlungen.js`)
- Eine Siedlung: Mitte 60 m südlich vom Startpunkt (hinter dem Koloss), Hütten in einem Halbrund
  südlich davon, ein Depot-Schuppen, ein Wärmeofen in der Mitte. Der Koloss parkt am Nordrand (Startpunkt).
- **In der Siedlung** = Rumpfmitte höchstens `SIEDLUNG_RADIUS_M` (75 m) von der Mitte. Handeln (Depot,
  Crew) nur im Stand (wie Bergen: Telegraf Stopp, kein Tempo).
- **Gebäude sind Hindernisse** (Kreise je Gebäude in der Kollision). Die Siedlung liegt im freien
  Startbereich (160 m); Fundstellen aus dem Seed liegen nie in der Siedlung.
- Die Siedlung selbst steht NICHT im Zustand (wie das Gelände: aus den Daten), nur ihre Änderungen.

## Zustand (v11)
- Koloss: `heimat` — ID der zuletzt besuchten Siedlung (Start: 0 = Heimstatt). Neustart dort.
- Welt: `state.depots [{id, siedlung, spieler, kohle, holz, oel, nahrung}]` (kg) — ein Eintrag je
  Spieler und Siedlung, angelegt beim ersten Einlagern. Index = ID.

## Befehle
| Befehl | Wirkung | Erlaubt |
|---|---|---|
| `EINLAGERN {lager, ware, kg}` | Koloss-Lager → Depot | in der Siedlung, im Stand, so viel da |
| `AUSLAGERN {lager, ware, kg}` | Depot → Koloss-Lager `lager` | dito, so viel im Depot, Platz im Lager |
| `CREW {gruppe, anzahl}` | `anzahl` +1 = anheuern, −1 = in der Siedlung lassen | dito; höchstens `KOJEN` (20) Leute, mindestens 1 |

Holz kann in beide Lager ausgelagert werden; Kohle/Öl nur ins Brennstofflager, Vorräte nur ins Warenlager.
Neue Leute kommen gesund und satt: Die Gruppenwerte werden anteilig gemischt.

## Regeln in der Siedlung (Tick, `sim/siedlung.js`, vor der Crew)
- Steht der Koloss in der Siedlung: `heimat` = diese Siedlung.
- **Crew in der Siedlung** (im Stand): wärmt sich in den Hütten (keine Kälteschäden), isst aus der
  Siedlung (Vorräte an Bord bleiben unberührt), wird satt, erholt sich schnell (0 → 100 % in ~4 min),
  Moral steigt. Niemand stirbt dort.
- **Neustart nach dem Wrack** (M4c): in `heimat`, am Parkplatz der Siedlung. Das Depot bleibt — wer
  vorher eingelagert hat, kann dort wieder Kohle holen.

## Speichern (`game/speichern.js`, außerhalb der Simulation)
- Steht der eigene Koloss in der Siedlung: sofort beim Eintreffen speichern, nach jedem Befehl dort
  (Depot, Crew — sonst wären sie beim Neuladen weg) und sonst alle 20 s Spielzeit.
- `localStorage` „eiskoloss.spielstand“ = `{version, zeit, zustand}`. Beim Start der Seite: Spielstand
  mit passender Zustandsversion laden, sonst neue Welt (Hinweis in der Konsole).
- Konsole: `ek.spielstand()` (wann, wo, Größe), `ek.spielstandLoeschen()`. `ek.neu(seed)` löscht nichts —
  erst der nächste Halt in der Siedlung überschreibt den Spielstand.

## Anzeige
- Welt: Siedlung als vorgerendertes Bild (Hütten mit Schneedächern, Windschutz, Depot-Schuppen,
  Wärmeofen mit Glut), nachts warm erleuchtete Fenster über der Dunkelheit. Fern: Symbol + Name.
  **Kein Rauch aus den Hütten** (Leistung).
- **Depot-Fenster** (`ui/depot.js`, Spieltest-Wunsch 2026-11-11: „Klick auf das Depot und dort
  auswählen, ob und was man ab- oder belädt“): Klick auf den Depot-Schuppen (Messingrahmen beim
  Darüberfahren) öffnet es neben dem Schuppen. Oben Richtung **⇣ Abladen / ⇡ Beladen**, je Ware
  „an Bord → im Depot“ (Pfeil dreht mit) und Knöpfe **1 t · 10 t · Alle**. Holz: Abladen erst aus dem
  Warenlager, Beladen dorthin, wo „Neues Holz ins“ zeigt. Darunter **Crew** (Heizer/Arbeiter − / +,
  Kojen x / 20). Nicht im Stand in der Siedlung: Knöpfe matt. Das Lager-Popup bleibt wie vor M4d
  (⇣ = abwerfen).
- Oben kurz „HEIMSTATT — Spielstand gespeichert“ beim Eintreffen. HUD-Zeile „⌂ Heimstatt“ mit
  Richtungspfeil und Entfernung (zum Heimfinden).
- Hilfe („?“) und F3 (Siedlung, Depot, letzter Spielstand).

## Tests (`tests/siedlung.test.js`)
Start liegt in der Siedlung; Einlagern/Auslagern nur dort und im Stand; Depot übersteht das Wrack und der
Neustart ist in der Heimat; Crew heilt dort und isst keine Bordvorräte; Anheuern bis zu den Kojen,
Absetzen nicht unter 1; Gebäude blockieren; Spielstand hin und zurück (ohne Browser). Replay neu (v11).

## Später
Mehrere Siedlungen aus dem Seed, Aufträge, Tausch (M5). Reparieren entfällt (kein Rumpf, E-019).
