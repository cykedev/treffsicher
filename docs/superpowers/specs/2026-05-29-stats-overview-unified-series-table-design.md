# Übersicht-Tabelle: einheitliches Serien-Raster bei gemischten Serien-Größen

**Datum:** 2026-05-29
**Status:** Design abgenommen
**Bereich:** Statistiken → Tab „Übersicht" (`statistics-charts/tabs/overview`)

## Problem

Pro Disziplin werden die Einheiten nach tatsächlicher Serienzahl gruppiert (z. B. 4, 5, 6
Serien bei Luftpistole). Heute rendert jede Gruppe eine **eigene Tabelle** mit eigenem Kopf
und eigener Ø-Zeile. Bei gemischten Serien-Größen entsteht dadurch:

- mehrere gestapelte Mini-Tabellen, jede mit wiederholtem Spaltenkopf,
- die „Gesamt"-Spalte landet je Tabelle an einer anderen horizontalen Position,
- „Σ alle" (Gesamtsumme aller Serien) erscheint mal da, mal nicht.

Das wirkt visuell unruhig und erschwert den Spaltenvergleich.

## Ziel

Eine **ruhige, einheitlich ausgerichtete Darstellung** pro Disziplin: ein Tabellenkopf, ein
festes Spaltenraster über alle Serien-Größen hinweg, konsistente Position der Summenspalten.
Keine Daten verstecken, statistisch korrekte Gruppen-Durchschnitte beibehalten.

## Gewählter Ansatz (Variante B)

**Eine Tabelle pro Disziplin** mit gemeinsamem Kopf und festem Spaltenraster. Die Einheiten
bleiben nach Serienzahl gruppiert, aber alle Gruppen teilen sich dasselbe Raster.

### Spaltenraster (pro Disziplin)

```
Einheiten | S1 … S_typisch | Gesamt | S_(typisch+1) … S_max | Σ alle
```

- **Führende Serienspalten:** Positionen `1 … typicalSeriesCount` (Disziplin-Eigenschaft,
  z. B. 4 bei Luftpistole, 3 bei Luftpistole Auflage). Immer genau so viele Spalten.
- **„Gesamt":** direkt nach der typischen Serienzahl. Wert = Summe der vorhandenen
  Serien innerhalb der typischen Reihe (`typicalRangeTotal`, siehe unten).
- **Zusatz-Serienspalten:** Positionen `typicalSeriesCount+1 … disciplineMaxSeriesCount`.
  Nur vorhanden, wenn überhaupt eine Gruppe der Disziplin mehr als die typische Serienzahl hat.
- **„Σ alle":** ganz hinten. Wert = Summe **aller** gewerteten Serien (`grandTotal`).
  Spalte nur vorhanden, wenn Zusatz-Serienspalten existieren.

Weil `typicalSeriesCount` zur Disziplin gehört, sitzt „Gesamt" bei **allen** Gruppen an
derselben Stelle — das ursprüngliche „Springen" der Gesamt-Spalte ist damit gelöst.

### Werte-Semantik

| Feld                                  | Definition                                                      | Sub-typisch (z. B. 3 von 4)                                                           |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `typicalRangeTotal` (Spalte „Gesamt") | Summe der gewerteten Serien mit Position ≤ `typicalSeriesCount` | partielle Summe, **nicht null** — Wert ist einfach kleiner; fehlende Position als „–" |
| `grandTotal` (Spalte „Σ alle")        | Summe **aller** gewerteten Serien                               | = `typicalRangeTotal`, daher „–" (keine Zusatzserien)                                 |

Bisher war `typicalTotal` `null`, wenn nicht alle typischen Slots gefüllt waren. **Neu:**
sub-typische Einheiten zeigen die partielle Summe an der konsistenten Spaltenposition; die
fehlende Serienspalte zeigt einen dezenten Strich („–").

### Gruppen-Darstellung & Aufklappen

Pro Disziplin gibt es zwei Render-Modi, abhängig von der Zahl der Serien-Gruppen:

**Mehrere Gruppen** (gemischte Serien-Größen → der eigentliche Fall):

- Gemeinsamer Spaltenkopf **einmal oben** (kein Chevron im Kopf).
- Jede Gruppe ist ein aufklappbarer Block mit eigenem, unabhängigem Zustand:
  - **Zugeklappt:** eine kompakte Zeile „▸ {n}er Serien Ø" mit den Ø-Werten der Gruppe.
    Das Ø-Zeichen steht **hinten** am Label.
  - **Aufgeklappt:**
    - Gruppen-Kopfzeile oben: „▾ {n}er Serien" (Chevron hier = Klick-Schalter).
    - Detailzeilen: die einzelnen Einheiten (Datum + Werte, leicht eingerückt).
    - Ø-Abschluss unten: Label „Ø", **ohne** Chevron.
  - **Visuelle Klammer:** durchgehender Akzentbalken links + leichte Hintergrund-Tönung über
    Kopf + Detailzeilen + Ø-Zeile, damit „oben & unten gehört zusammen" erkennbar ist.
- Default: alle Gruppen **zugeklappt** (ruhiger Ersteindruck, nur Ø-Zeilen sichtbar).

**Einzelne Gruppe** (alle Einheiten haben dieselbe Serienzahl → häufiger Normalfall):

- Kein Gruppen-Label/-Block. Der Chevron-Schalter sitzt auf der „Einheiten"-Kopfzeile
  (wie heute). Aufgeklappt: Detailzeilen + Ø-Footer. Hält den Normalfall so ruhig wie bisher.

### Beschriftung

- Spaltenkopf der ersten Spalte: **„Einheiten"** (vorher „Datum").
- Gruppen-Label: **„{n}er Serien"** (n ≥ 2). Für `n = 1` „1 Serie" (Randfall, selten).
- Summenspalten: „Gesamt" und „Σ alle" (Kurzform mobil: „Σ" / „Σ alle").

## Datenmodell-Änderungen (`aggregateOverview.ts`)

Layer-Reihenfolge: Calculate → Components (keine Schema-/DB-Änderung).

**`OverviewTableRow`**

- `typicalTotal: number | null` → ersetzt durch `typicalRangeTotal: number` (Summe der
  gewerteten Serien mit Position ≤ `typicalSeriesCount`; partielle Summen erlaubt, nie null
  solange ≥ 1 solche Serie existiert). `grandTotal` bleibt.

**`OverviewSeriesGroup`**

- `typicalTotalAverage: number | null` → `typicalRangeTotalAverage: number` (Mittel der
  `typicalRangeTotal` der Zeilen). `grandTotalAverage`, `seriesAverages`, `maxSeriesCount`,
  `isSubTypical`, `seriesCount` bleiben.

**`OverviewTableGroup`** (Disziplin-Ebene)

- Neu: `maxSeriesCount: number` = Maximum über `seriesGroups[].maxSeriesCount`. Daraus
  abgeleitet (in der Komponente, nicht zwingend im Modell): Anzahl Zusatzspalten und ob die
  „Σ alle"-Spalte angezeigt wird.

## Komponenten-Struktur

Bestehende Modularitätsregeln beachten: Dateien < 200 Zeilen, max. 6 Top-Level-Props,
wiederholte Logik extrahieren.

- **`overviewColumns.ts`** (neu, rein): `buildColumnModel(typicalSeriesCount, disciplineMaxSeriesCount)`
  liefert das Spaltenmodell (Reihenfolge, Labels full/short, `isTotal`-Flags, Positions-Indizes).
  Header, Detailzeilen und Ø-Zeilen iterieren **dasselbe** Modell → garantierte Ausrichtung.
- **`DisciplineOverviewTable.tsx`** (wird Client-Komponente): hält Aufklapp-Zustand pro Gruppe
  (`Set<number>` keyed by `seriesCount`), rendert Card + eine `<Table>` mit gemeinsamem Kopf,
  mappt `seriesGroups` → `SeriesGroupRows`. Wählt Einzel- vs. Mehrgruppen-Modus.
- **`SeriesGroupRows.tsx`** (neu): rendert die Zeilen **einer** Gruppe (zugeklappt: `gsum`-Zeile;
  aufgeklappt: `ghead` + Detailzeilen + `gavg`) anhand des Spaltenmodells. Props: group,
  columnModel, scoringType, expanded, onToggle.
- **`SeriesGroupTable.tsx`**: wird ersetzt/aufgelöst; Zell-Helfer (Score/Total/Dash, Ø) in eine
  kleine `cells.tsx` ziehen, von beiden Modi genutzt.
- `overviewFormatting.ts` (`formatScore`, `formatDate`, `buildSeriesLabel`) bleibt; ggf. um
  Gruppen-Label-Helfer ergänzen.

Sticky-erste-Spalte, `overflow-x-auto`, mobile Kurzlabels (S1, Datum-Kurzform) bleiben erhalten.

## Barrierefreiheit & Verhalten

- Toggle als `<button>` mit `aria-expanded`; Label „{n}er Serien ein-/ausblenden".
- Dark-Mode-only (Projektvorgabe) — Tönung/Balken über vorhandene Theme-Tokens
  (`bg-card`, `secondary`, `muted`, `border`) statt Hardcode-Farben.
- Tabular-nums / Mono für Zahlen beibehalten.

## Tests

- **`aggregateOverview.test.ts`** aktualisieren:
  - `typicalTotal`/`typicalTotalAverage` → `typicalRangeTotal`/`typicalRangeTotalAverage`.
  - Neuer Fall: sub-typische Gruppe (3 von 4 Serien) → `typicalRangeTotal` = partielle Summe
    (nicht null), `isSubTypical = true`, `grandTotal == typicalRangeTotal`.
  - Neuer Fall: super-typische Gruppe (6 Serien) → `typicalRangeTotal` = Summe S1–S4,
    `grandTotal` = Summe aller sechs.
  - Disziplin-`maxSeriesCount` über gemischte Gruppen korrekt.
- **`overviewColumns.test.ts`** (neu): Spaltenmodell für typisch=4/max=6, typisch=3/max=3
  (keine Σ-alle-Spalte), Einzelgruppe.

## Nicht-Ziele

- Keine Änderung an Datenerfassung, Schema oder Disziplin-Definition.
- Keine Änderung an anderen Statistik-Tabs (Verlauf, Trefferlage, …).
- Keine neue Aggregations-Logik für Position-Lücken über das heutige Verhalten hinaus
  (bestehende Behandlung von Lücken/Positionen bleibt; allgemeine Regeln decken Randfälle ab).

## Offene Randfälle (durch allgemeine Regeln abgedeckt)

- Einheit mit Serien jenseits der typischen Reihe trotz niedriger Gesamtzahl (z. B. Positionen
  1, 2, 5): `group.maxSeriesCount > typicalSeriesCount` → „Σ alle"-Spalte greift wie definiert.
- Singular-Label „1 Serie".
