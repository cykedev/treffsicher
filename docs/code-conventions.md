# Code Conventions & Testing — Verbindliche Regeln

Ausgelagert aus `docs/technical-constraints.md`. Gilt gleichrangig als verbindlich.

## Index

- **Benennungsregeln** — Dateinamen, Komponenten, Funktionen, Routen
- **TypeScript-Regeln** — kein `any`, explizite Rückgabetypen, Prisma-Typen
- **Zod v4** — breaking changes gegenüber v3 (`message` statt `invalid_type_error`)
- **React 19 `useActionState`** — Signatur mit `prevState` als erstem Parameter
- **Dateistruktur einer Komponente** — Imports → Typen → Komponente
- **Server Actions** — Aufbau: Auth → Validierung → DB mit `userId`
- **Datenbankzugriffe** — immer `userId` filtern, kein Prisma in Komponenten
- **Kommentare** — Warum nicht Was; Pflicht-Stellen; JSDoc für lib-Funktionen
- **Fehlerbehandlung** — strukturierte Rückgaben, kein `throw` aus Server Actions
- **Testing** — Vitest, Testpflicht-Kategorien, Arrange-Act-Assert, Abdeckungsziel

---

## Benennungsregeln

| Was                    | Konvention                          | Beispiel                 |
| ---------------------- | ----------------------------------- | ------------------------ |
| Dateien (Komponenten)  | PascalCase, englische Begriffe      | `SessionForm.tsx`        |
| Dateien (Logik/Utils)  | camelCase                           | `calculateScore.ts`      |
| React-Komponenten      | PascalCase, englische Begriffe      | `function SessionForm()` |
| Funktionen & Variablen | camelCase                           | `const totalScore`       |
| Konstanten (global)    | SCREAMING_SNAKE_CASE                | `const MAX_SHOTS = 10`   |
| Prisma-Modelle         | PascalCase                          | `model TrainingSession`  |
| Enum-Werte             | SCREAMING_SNAKE_CASE                | `TRAINING`, `WETTKAMPF`  |
| TypeScript-Interfaces  | PascalCase mit `I`-Präfix vermeiden | `interface SessionData`  |
| Routen/URL-Segmente    | lowercase-kebab-case, englisch      | `/sessions/new`          |

---

## TypeScript-Regeln

- **Kein `any`**: Niemals `any` als Typ verwenden — lieber `unknown` mit expliziter Prüfung
- **Keine komplexen Generics**: Keine Conditional Types (`T extends X ? A : B`), keine Mapped Types
- **Einfache Interfaces**: Flache Strukturen bevorzugen, keine tief verschachtelten Typen
- **Explizite Rückgabetypen** bei allen Funktionen ausserhalb von Komponenten:

  ```typescript
  // RICHTIG
  async function getSession(id: string): Promise<Session | null> { ... }

  // FALSCH — Rückgabetyp unklar
  async function getSession(id: string) { ... }
  ```

- **Prisma-Typen nutzen**: Typen aus `@/generated/prisma/client` direkt verwenden, nicht neu definieren (Prisma 7 generiert den Client in `src/generated/prisma/`, nicht mehr in `node_modules/@prisma/client`)

---

## Zod v4 (aktuell installiert)

Zod v4 hat breaking changes gegenüber v3:

- `invalid_type_error` entfernt — stattdessen `message` verwenden:

  ```typescript
  // RICHTIG (v4)
  z.number({ message: "Muss eine Zahl sein" })

  // FALSCH (v3-Syntax, funktioniert nicht mehr)
  z.number({ invalid_type_error: "Muss eine Zahl sein" })
  ```

- `z.enum()` erwartet `as const` für korrekte Typisierung:
  ```typescript
  z.enum(["WHOLE", "TENTH"] as const)
  ```

---

## React 19 `useActionState`

Server Actions, die mit `useActionState` verwendet werden, brauchen zwingend die Signatur
`(prevState: State, formData: FormData)` — der `prevState`-Parameter muss als erstes stehen:

```typescript
// RICHTIG — prevState als erster Parameter
export async function createDiscipline(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult>

// FALSCH — würde mit useActionState nicht funktionieren
export async function createDiscipline(formData: FormData): Promise<ActionResult>
```

---

## Dateistruktur einer Komponente

Jede nicht-triviale Komponente folgt dieser Reihenfolge:

```typescript
// 1. Imports (externe Pakete zuerst, dann interne)
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { saveSession } from "@/lib/sessions/actions"

// 2. Typdefinitionen (nur was diese Datei braucht)
interface Props {
  disciplineId: string
}

// 3. Komponente
export function SessionForm({ disciplineId }: Props) {
  // 3a. Hooks
  // 3b. Event-Handler / lokale Funktionen
  // 3c. JSX
}
```

---

## Server Actions

Jede Server Action liegt in einer Datei `actions.ts` im zugehörigen Feature-Ordner:

```typescript
// src/lib/sessions/actions.ts

"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"

const CreateSessionSchema = z.object({
  disciplineId: z.string().min(1, "Disziplin ist erforderlich"),
  date: z.string().datetime(),
})

export async function createSession(formData: FormData) {
  // Schritt 1: Nutzer authentifizieren — ohne gültige Session kein Datenbankzugriff
  const session = await getAuthSession()
  if (!session) {
    return { error: "Nicht angemeldet" }
  }

  // Schritt 2: Eingaben validieren
  const parsed = CreateSessionSchema.safeParse({
    disciplineId: formData.get("disciplineId"),
    date: formData.get("date"),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Schritt 3: Datenbankoperation — immer mit userId filtern
  const result = await db.trainingSession.create({
    data: {
      ...parsed.data,
      userId: session.user.id, // Pflicht: Datensatz gehört dem angemeldeten Nutzer
    },
  })

  return { data: result }
}
```

---

## Datenbankzugriffe (Prisma)

- **Immer `userId` filtern**: Jede `findMany`, `findFirst`, `update`, `delete` Operation enthält `where: { userId: session.user.id }`
- **Kein direkter Prisma-Aufruf in Komponenten**: Datenbankzugriffe nur in `lib/*/` Dateien oder Server Actions
- **Keine rohen SQL-Queries** ausser für komplexe Statistiken, dann mit Kommentar

```typescript
// RICHTIG
const sessions = await db.trainingSession.findMany({
  where: {
    // Wir filtern nach userId, damit nur eigene Einheiten zurückgegeben werden
    userId: session.user.id,
    disciplineId: disciplineId,
  },
  orderBy: { date: "desc" },
})

// FALSCH — kein userId-Filter
const sessions = await db.trainingSession.findMany()
```

---

## Kommentare

Kommentare erklären **Warum**, nicht Was. Das Was ergibt sich aus dem Code selbst.
Kommentare sind **sparsam und zielgerichtet**: kein Kommentar-Selbstzweck, keine offensichtlichen Sätze.

```typescript
// RICHTIG: erklärt die Absicht und den Grund
// Wir runden auf eine Dezimalstelle, weil die ISSF-Wertung nur eine Stelle erlaubt
const score = Math.round(rawScore * 10) / 10

// FALSCH: beschreibt nur was der Code ohnehin zeigt
// Rundet auf eine Dezimalstelle
const score = Math.round(rawScore * 10) / 10

// RICHTIG: erklärt einen nicht-offensichtlichen Sonderfall
// Probeschüsse fliessen nicht in die Wertung ein, werden aber gespeichert
// damit der Schütze seine Einstimmung nachvollziehen kann
if (series.isPractice) {
  return null
}
```

Kommentare sind **Pflicht** bei:

- Sicherheitsrelevanten Stellen (Auth-Checks, userId-Filter)
- Nicht-offensichtlicher Geschäftslogik (Berechnungen, Sonderfälle)
- Workarounds oder bewussten Vereinfachungen (`// TODO: ...` mit Begründung)
- Nicht-trivialer UI-Logik in `.tsx` (abgeleitete Zustände, Guard-Branches, Form-/Domain-Mapping)
- Jeder Funktion in `lib/` die nicht trivial ist (JSDoc-Stil):

```typescript
/**
 * Berechnet die Gesamtpunktzahl einer Einheit aus allen Serienwertungen.
 * Probeschuss-Serien werden nicht mitgezählt.
 */
function calculateTotalScore(series: Series[]): number { ... }
```

---

## Fehlerbehandlung

- **Keine leeren catch-Blöcke** — immer loggen und/oder weitergeben
- **Server Actions geben strukturierte Fehler zurück** (nie `throw` aus Server Actions)
- **Nutzer-Feedback** bei jeder Aktion (Erfolg oder konkreter Fehler)

```typescript
// RICHTIG: strukturierter Rückgabewert
export async function deleteSession(id: string) {
  try {
    await db.trainingSession.delete({ where: { id, userId: session.user.id } })
    return { success: true }
  } catch (error) {
    // Fehler loggen für Debugging, aber keinen Stack-Trace an den Nutzer geben
    console.error("Fehler beim Löschen der Einheit:", error)
    return { error: "Die Einheit konnte nicht gelöscht werden." }
  }
}

// FALSCH: leerer catch oder throw
try { ... } catch (e) {}
```

---

## Testing

### Framework & Konfiguration

- **Vitest** als Test-Framework (schneller als Jest, native TypeScript-Unterstützung)
- Testdateien liegen **neben dem zu testenden Code**: `calculateScore.test.ts` neben `calculateScore.ts`
- Alternativ in `__tests__/` Unterordner des jeweiligen Feature-Ordners

### Was wird getestet (Pflicht)

1. **Berechnungslogik**: Jede Funktion, die Werte ausrechnet
   - Gesamtringe aus Seriensummen, Durchschnittswerte, Trends
   - Validierung von Serienwerten (min/max je nach Disziplin)

2. **Geschäftsregeln mit Sonderfällen**:
   - Probeschüsse nicht in Gesamtwertung
   - Archivierte Disziplin nicht in Auswahllisten
   - Leere Serien-Wertung (0 oder null)

3. **Zugangskontrolle in lib-Funktionen** (wo sinnvoll testbar):
   - Funktion gibt `null` zurück wenn userId nicht übereinstimmt

4. **Server-Action-Orchestrierung mit klarer Entscheidungslogik**:
   - Auth-/Ownership-Guards, Delegation in Shared-Logik/Fassaden
   - Fehlerpfade mit erwarteten Fehlermeldungen
   - Revalidate-/Redirect-Reihenfolge bei Mutationen

5. **Import-/Mapping-Pfade mit hoher Wirkung**:
   - Disziplinabhängige Wert-Konvertierung
   - Harte Abbruchpfade bei invaliden Inputs

### Was wird nicht getestet

- React-Komponenten auf reiner Presentational-Ebene
- Next.js Routing und Middleware
- Volle Prisma-Integrationspfade ohne dedizierte Test-DB

### UI- und Flow-Tests

UI-/Flow-Tests sind **gewünscht**, aber derzeit **nicht Merge-blockend**. Priorität liegt auf stabilen Tests der Business-Logik.

### Teststruktur (Arrange–Act–Assert)

```typescript
describe("calculateTotalScore", () => {
  it("addiert alle Serienwerte korrekt", () => {
    // Arrange
    const series = [
      { score: 94, isPractice: false },
      { score: 91, isPractice: false },
    ]
    // Act
    const result = calculateTotalScore(series)
    // Assert
    expect(result).toBe(185)
  })

  it("ignoriert Probeschuss-Serien bei der Gesamtwertung", () => {
    const series = [
      { score: 50, isPractice: true }, // zählt nicht
      { score: 94, isPractice: false },
    ]
    expect(calculateTotalScore(series)).toBe(94)
  })
})
```

### Testabdeckung

- Kein Abdeckungsziel in Prozent — Tests sollen sinnvoll sein, nicht vollständig
- Faustregel: jede Funktion in `lib/` mit Berechnung oder Entscheidungslogik bekommt Tests
- Tests müssen **vor dem Commit grün sein**
