# Backlog — Treffsicher (Stand 2026-03-31)

Priorisierter Themenkatalog nach vollständiger Code-Review (2026-03-31).

---

## Priorität 1 — Sicherheit / Robustheit

### T-01: String-Längen-Limits in Freitextfeldern

**Problem:** Keine `.max()`-Grenzen auf Freitextfeldern → beliebig große Strings speicherbar.
**Betroffen:**

- `location` (kurz), `trainingGoal` (mittel) in `CreateSessionSchema` (`shared.ts:12-18`)
- `reflection.observations`, `.insight`, `.learningQuestion`, `.routineDeviation` (Langtext)
- `feedback.explanation`, `.wentWell`, `.insights`, `.progress`, `.fiveBestShots`, `.goalAchievedNote` (Langtext)
- `prognosis.expectedScore`, `.performanceGoal` (kurz)

**Fix:**

- Kurze Felder (`location`, `expectedScore`, `performanceGoal`): `.max(200)`
- Mittlere Felder (`trainingGoal`): `.max(500)`
- Langtext-Felder (alle Reflexions-/Feedback-Freitexte): `.max(3000)`

**Aufwand:** Klein (~30 min)
**Dateien:** `src/lib/sessions/actions/shared.ts`, `src/lib/sessions/actions/mentalActions.ts`
**Spec:** @docs/technical-constraints.md#daten--und-aktionsarchitektur

---

## Priorität 2 — Robustheit / Architektur

### T-05: React Error Boundaries

**Problem:** Kein `error.tsx` in `/(app)/`. Ungefangene Fehler in Server Components crashen die gesamte App-Shell.
**Fix:** `src/app/error.tsx` (Root) + `src/app/(app)/error.tsx` + `src/app/(app)/sessions/[id]/error.tsx`
**Aufwand:** Klein (~30 min)
**Spec:** @docs/requirements.md#nicht-funktionale-qualitätsziele (Wartbarkeit)

### T-08: `ActionResult` — Einheitlicher generischer Typ statt 3 lokaler Definitionen

**Problem:** `ActionResult` ist an 3+ Stellen leicht unterschiedlich definiert (sessions, disciplines, shot-routines). Ringwerk-Muster: einzelner generischer discriminated-union-Typ in `src/lib/types.ts`.
**Fix:**

```typescript
// src/lib/types.ts
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { error: string | Record<string, string[] | undefined> }
```

Alle lokalen Definitionen entfernen, Imports umbiegen.
**Aufwand:** Mittel (~1–2 h, alle Importstellen anpassen)
**Dateien:** `src/lib/sessions/actions/types.ts`, `src/lib/disciplines/types.ts`, `src/lib/shot-routines/actions.ts`, `src/lib/goals/types.ts` + alle Komponenten-Imports

---

## Priorität 3 — Pflicht-Splits (>220 Zeilen)

### T-02: `mentalActions.ts` — Duplikation reduzieren (273 Zeilen → <200)

**Problem:** `savePrognosisAction` und `saveFeedbackAction` parsen identische 7 Dimensionen (fitness, nutrition, technique, tactics, mentalStrength, environment, equipment).
**Fix:** `parseDimensionsFromFormData()` + `DimensionSchema` extrahieren; beide Actions nutzen diese Funktion.
**Aufwand:** Klein (~45 min)
**Datei:** `src/lib/sessions/actions/mentalActions.ts`
**Spec:** @docs/technical-constraints.md#modularität--wartbarkeit-verbindlich (Duplikationsregel §5)

### T-03: `shared.ts` splitten (261 Zeilen → <180 je Datei)

**Problem:** Schemas, Typen, Konstanten, Hilfsfunktionen und Parsing-Logik gemischt.
**Fix:** Schema-Definitionen und Typen → `sessionSchemas.ts`; `shared.ts` behält nur Parse-Helfer.
**Aufwand:** Mittel (~1 h, viele Import-Stellen anpassen)
**Datei:** `src/lib/sessions/actions/shared.ts`
**Spec:** @docs/technical-constraints.md#modularität--wartbarkeit-verbindlich (Dateigrössen-/Split-Regel §2)

### T-04: `StatisticsCharts.tsx` splitten (265 Zeilen → <200)

**Problem:** Rendert alle Tabs, verwaltet Tab-State und Data-Fetching-Trigger gleichzeitig.
**Fix:** Tab-State in eigenen Hook (`useStatisticsChartsState`), Komponente wird dünner Orchestrator.
**Aufwand:** Mittel (~1 h)
**Datei:** `src/components/app/statistics-charts/StatisticsCharts.tsx`
**Spec:** @docs/technical-constraints.md#modularität--wartbarkeit-verbindlich (Dateigrössen-/Split-Regel §2)

---

## Priorität 4 — Optional / Später

### T-06: PWA / Offline-Unterstützung (Phase 5.2)

**Problem:** Kein Service Worker, kein Manifest.
**Scope:** `next-pwa`, App-Manifest, Offline-Fallback-Seite, IndexedDB-Sync
**Aufwand:** Groß (~1 Tag)
**Spec:** @docs/requirements.md#offene-punkte-spätere-phasen

### T-07: `trainingGoal`-Textarea — `maxLength`-Attribut im UI

**Problem:** Textarea hat kein `maxLength`, Limit wird nur serverseitig enforced (nach T-01).
**Fix:** `maxLength={500}` + optionaler Zeichen-Zähler
**Aufwand:** Sehr klein (~15 min)
**Abhängigkeit:** T-01
**Spec:** @docs/requirements.md#die-einheit--herzstück-des-systems

### T-09: `GoalAssignmentsForm` — Props auf ≤6 reduzieren

**Problem:** 8 Top-Level-Props (Limit: 6). Callbacks könnten als `handlers`-Objekt gruppiert werden.
**Aufwand:** Sehr klein (~15 min)
**Datei:** `src/components/app/goals/goal-card-section/GoalAssignmentsForm.tsx`

### T-10: Tippfehler in UI-Texten beheben

**Problem:** `"fuer"` statt `"für"`, `"temporaerem"` statt `"temporärem"` in beschreibenden Seiten-Texten.
**Dateien:**

- `src/app/(app)/disciplines/new/page.tsx`
- `src/app/(app)/admin/users/new/page.tsx`
  **Aufwand:** Minimal (~5 min)

---

## Nicht empfohlen

| Thema                             | Grund                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| CSV-Export                        | Feature gestrichen (2026-03-31)                              |
| Vollständiges Accessibility-Audit | Internes Tool, kein öffentlicher Dienst                      |
| Strukturiertes Logging            | `console.warn/-error` ausreichend für Container-Logs         |
| E2E-Tests                         | Kein CI/CD-Setup vorhanden                                   |
| `hasRun` Race-Condition fix       | Kein echtes Problem: Node.js single-threaded, Guard synchron |
