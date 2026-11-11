# Spec M4c — Liegenbleiben (Wrack und Neustart)

Stand 2026-11-11 · Grundlage: KONZEPT.md §2 (F6) · Entscheidung E-019

## Nutzerentscheidung (2026-11-11, nach dem ersten Bau)
M4c war zuerst größer gebaut (Eisbruch mit Eislöchern und Rissen, Rumpfschaden durch Aufprall, Leck,
Knopf „Aufgeben“). Der Nutzer hat **alles davon wieder entfernt bis auf das Liegenbleiben**:
- Der Koloss bleibt liegen, wenn **die ganze Crew tot** ist,
- oder wenn **kein Brennstoff mehr an Bord** ist und der Kessel ohne Druck bleibt (nach einer Frist).

Dünnes Eis ist damit weiter nur glatter als dickes (wie seit M1), es bricht nicht. Kein Rumpf, keine
Reparatur nötig.

## Zustand (v10)
- Koloss: `kalt` (Ticks ohne Brennstoff an Bord und ohne Druck).
- Welt: `state.wracks [{id, koloss, name, x, y, h, tick}]` (x, y = Rumpfmitte in µm).

## Regeln (`sim/koloss/wrack.js`, Tick nach dem Fahren)
1. **Crew tot** (Heizer + Arbeiter = 0) → sofort liegen geblieben.
2. **Kein Brennstoff:** Kohle, Holz und Öl im Brennstofflager und Holz im Warenlager (das könnte man noch
   umlagern) sind alle 0 **und** der Dampf ist 0 → `kalt` zählt hoch; nach `GNADENFRIST_TICKS`
   (2 min) liegen geblieben. Kommt wieder Brennstoff an Bord (z. B. Holz geborgen), fängt `kalt` bei 0 an.
3. **Liegenbleiben:** Wrack in `state.wracks`; jede Ware wird ein Abwurf-Haufen 14 m ums Wrack (jeder
   kann sie bergen, wie Abgeworfenes). Der Koloss startet frisch über `sim/koloss/start.js`
   (gleiche Koloss- und Trupp-ID) am Startpunkt — ab M4d in der letzten Siedlung.

## Anzeige
- Welt: Wrack = Fahrgestell + Rumpf, abgedunkelt, eingeschneit, leicht verdreht (`render/wracks.js`).
- Oben 7 s „LIEGENGEBLIEBEN — das Wrack bleibt, Neustart am Startpunkt“.
- Hilfe („?“): kurzer Absatz. F3: Zeile „Wrack“ (kalt, Zahl der Wracks).

## Tests (`tests/wrack.test.js`)
Crew tot → Wrack + Haufen + Neustart (Trupp wieder voll); ohne Brennstoff erst nach der Frist;
Holz im Warenlager verhindert das Liegenbleiben. Replay neu (Zustand v10).

## Später
M4d: Neustart in der letzten Siedlung. Wracks plündern/abschleppen (M5/M7).
