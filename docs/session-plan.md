# Session-Plan — Code-Quality-Sprint (ab 2026-03-31)

Ergebnis der vollständigen Code-Review vom 2026-03-31.
Tickets: @docs/backlog.md · Status: @docs/implementation-plan.md

Jede Session ist in sich abgeschlossen und commitbar.
Reihenfolge ist verbindlich (spätere Sessions bauen teilweise auf früheren auf).

---

## Session 1 — Sicherheit + Error Boundaries (~1 h)

**Tickets:** T-01, T-05, T-10

### T-01: String-Längen-Limits

Dateien: `src/lib/sessions/actions/shared.ts`, `src/lib/sessions/actions/mentalActions.ts`

Grenzen:
| Feld | Limit |
|------|-------|
| `location` | `.max(200)` |
| `expectedScore`, `performanceGoal` | `.max(200)` |
| `trainingGoal` | `.max(500)` |
| Alle Reflexions-/Feedback-Freitexte | `.max(3000)` |

Vorgehen: In den Zod-Schemas je `.max(N, { message: "..." })` ergänzen. Tests laufen lassen.

### T-05: React Error Boundaries

3 neue Dateien mit `"use client"` + Standard-Next.js-Error-Boundary-Signatur:

- `src/app/error.tsx` (Root-Fallback)
- `src/app/(app)/error.tsx` (App-Shell-Fallback)
- `src/app/(app)/sessions/[id]/error.tsx` (Session-Detail-Fallback)

Inhalt: Fehlermeldung auf Deutsch, `reset`-Button, Link zurück zur Übersicht.

### T-10: UI-Tippfehler

- `src/app/(app)/disciplines/new/page.tsx`: `"fuer"` → `"für"`
- `src/app/(app)/admin/users/new/page.tsx`: `"temporaerem"` → `"temporärem"`

**Commit-Scope:** `fix: add string length limits, error boundaries, and typo fixes`

---

## Session 2 — Einheitlicher ActionResult-Typ (~1.5 h)

**Ticket:** T-08

### Vorgehen

1. **Neuen Typ anlegen:** `src/lib/types.ts` erstellen:

   ```typescript
   // Einzige erlaubte Rückgabestruktur für alle Server Actions.
   export type ActionResult<T = void> =
     | { success: true; data?: T }
     | { error: string | Record<string, string[] | undefined> }
   ```

2. **Lokale Definitionen entfernen:**
   - `src/lib/sessions/actions/types.ts` — `ActionResult` entfernen (Datei ggf. ganz löschen falls leer)
   - `src/lib/disciplines/types.ts` — `ActionResult` entfernen
   - `src/lib/shot-routines/actions.ts` — lokale `ActionResult`-Definition entfernen
   - `src/lib/goals/types.ts` — `GoalActionResult` entfernen, durch `ActionResult` ersetzen

3. **Imports anpassen** (alle Komponenten und Actions, die `ActionResult` importieren):
   - `src/components/app/disciplines/DisciplineForm.tsx`
   - `src/components/app/sessions/WellbeingForm.tsx`
   - `src/components/app/sessions/FeedbackForm.tsx`
   - `src/components/app/sessions/ReflectionForm.tsx`
   - `src/components/app/sessions/PrognosisForm.tsx`
   - `src/components/app/shot-routines/ShotRoutineEditor.tsx`
   - alle weiteren (via `tsc --noEmit` finden)

4. **TypeScript-Check:** `tsc --noEmit` muss grün sein, bevor committed wird.

**Hinweis:** Da der neue Typ eine discriminated union ist (`success: true` vs. `error`), könnten Stellen, die bisher `result.success` ohne `result.error` prüfen, TypeScript-Fehler bekommen. Alle Prüfstellen auf `if ("error" in result)` oder `if (result.success)` umstellen.

**Commit-Scope:** `refactor: unify ActionResult as shared generic discriminated union`

---

## Session 3 — Pflicht-Split: `shared.ts` + `mentalActions.ts` (~1.5 h)

**Tickets:** T-02, T-03

### T-03: `shared.ts` splitten

Ziel: Schemas und Typen → `sessionSchemas.ts`, Parse-Helfer bleiben in `shared.ts`.

Neue Datei `src/lib/sessions/actions/sessionSchemas.ts`:

- `CreateSessionSchema` + abgeleitete Typen
- `MeytonImportSchema`
- `SeriesInputSchema`
- Konstanten (`MAX_MEYTON_PDF_SIZE_BYTES`, `MAX_SERIES_PER_SESSION`, etc.)
- `ParsedHitLocationInput`-Typ

`shared.ts` danach: nur Parse-Helfer (`parseGoalIdsFromFormData`, `parseHitLocationFromFormData`, `parseSeriesFromFormData`, `calculateSeriesTotal`).

Imports in allen Actions anpassen, die bisher aus `shared.ts` die Schemas importieren.

### T-02: `mentalActions.ts` Duplikation entfernen

Neue Hilfsfunktion in `mentalActions.ts` (oder in separater `dimensionHelpers.ts`):

```typescript
function parseDimensionsFromFormData(formData: FormData): DimensionValues {
  // 7 Dimensionen parsen
}
```

`savePrognosisAction` und `saveFeedbackAction` nutzen diese Funktion.

**Commit-Scope:** `refactor: split session schemas and deduplicate dimension parsing`

---

## Session 4 — Pflicht-Split: `StatisticsCharts.tsx` (~1 h)

**Ticket:** T-04

### Vorgehen

1. Neuer Hook `useStatisticsChartsState.ts` im gleichen Ordner:
   - State: `showCloudTrail`, `showHitLocationTrendX`, `showHitLocationTrendY`
   - Gibt die State-Values + Setter zurück

2. `StatisticsCharts.tsx` wird dünner Orchestrator:
   - Nutzt `useStatisticsChartsState()`
   - Rendert Tab-Komponenten mit den State-Werten als Props
   - Ziel: <180 Zeilen

3. Tests laufen lassen (Statistik-Hooks haben eigene Tests).

**Commit-Scope:** `refactor: extract StatisticsCharts state into dedicated hook`

---

## Session 5 — Kleinigkeiten (~30 min)

**Tickets:** T-07, T-09

### T-07: `maxLength` im UI

- In der Einheit-Form (`trainingGoal`-Textarea): `maxLength={500}` setzen.
- Optional: kleinen Zeichen-Zähler darunter (`{value.length}/500`).

### T-09: `GoalAssignmentsForm` Props gruppieren

Callbacks zu `handlers`-Objekt zusammenfassen:

```typescript
interface Props {
  sessions: GoalSessionOption[]
  selectedSessionIds: string[]
  message: string | null
  pending: boolean
  displayTimeZone: string
  handlers: {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
    onCancel: () => void
    onToggleSession: (sessionId: string) => void
  }
}
```

Aufrufstellen entsprechend anpassen.

**Commit-Scope:** `fix: add maxLength to trainingGoal textarea, group GoalAssignmentsForm handlers`

---

## Übersicht

| Session | Tickets          | Aufwand | Risiko                        |
| ------- | ---------------- | ------- | ----------------------------- |
| 1       | T-01, T-05, T-10 | ~1 h    | Niedrig                       |
| 2       | T-08             | ~1.5 h  | Mittel (viele Import-Stellen) |
| 3       | T-02, T-03       | ~1.5 h  | Mittel (viele Import-Stellen) |
| 4       | T-04             | ~1 h    | Niedrig                       |
| 5       | T-07, T-09       | ~30 min | Niedrig                       |

**Gesamtaufwand:** ~5.5 h verteilt auf 5 Sessions

Jede Session endet mit `/check` (alle 4 Gates grün) und einem Commit.
