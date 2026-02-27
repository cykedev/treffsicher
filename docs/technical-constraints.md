# Technische Rahmenbedingungen — Verbindliche Regeln

Dieses Dokument definiert verbindliche technische Entscheidungen für das Projekt.
Diese Regeln dürfen nicht ohne explizite Überprüfung und Begründung geändert werden.

---

## Hosting & Betrieb

- **Zielplattform**: Self-hosted auf TrueNAS via Docker Compose
- **Portabilität**: Kein TrueNAS-spezifischer Code — die App muss auf jeder Docker-Compose-Umgebung lauffähig sein
- **Konfiguration**: Alle umgebungsabhängigen Werte (DB-URL, Secrets, Pfade) über Umgebungsvariablen in `.env` — niemals hart im Code verdrahtet
- **Node.js-Version**: 20 LTS (im Dockerfile: `FROM node:20-alpine`)

---

## Entwicklungsumgebung

- **Lokale Entwicklung**: Vollständig via Docker Compose (`docker-compose.dev.yml`)
  - Enthält: App (mit Hot-Reload), PostgreSQL, Volume-Mounts
  - Ziel: `docker compose -f docker-compose.dev.yml up` reicht zum Starten
- **Produktionsumgebung**: Separates `docker-compose.prod.yml`
  - Enthält: App (Build-Image), PostgreSQL, persistente Volumes
- **Kein Mischen**: Dev- und Prod-Konfigurationen sind strikt getrennt

---

## Persistenz

### Datenbank

- **System**: PostgreSQL (in Docker Container)
- **Volume**: Named Docker Volume für Datenbankdaten (`postgres_data`)
- **Kein Datenverlust** durch Container-Neustart oder Image-Updates

### Datei-Uploads

- **Speicherort**: Lokales Docker Volume, gemountet in den App-Container
- **Pfad im Container**: `/app/uploads`
- **Volume-Name**: `uploads_data`
- **Kein Cloud-Dienst** — volle Kontrolle, keine externe Abhängigkeit
- **Maximale Dateigrösse**: 10 MB pro Datei
- **Erlaubte Dateitypen**: JPEG, PNG, WebP (Bilder) und PDF
- **Dateinamen**: Werden serverseitig durch eine zufällige UUID ersetzt (kein Originalname im Filesystem)

---

## Datenbank-Migrationen

- **Tool**: Prisma Migrate
- **Strategie**: `prisma migrate deploy` wird **automatisch beim App-Start** ausgeführt
- **Regel**: Jede Schemaänderung erzeugt eine neue Migration via `prisma migrate dev` (lokal)
- **Keine destructiven Migrationen** ohne expliziten Kommentar und Backup-Hinweis
- **Migrationsdateien** werden im Repository eingecheckt (`prisma/migrations/`)
- **Garantie**: Datenverlust durch Schemaänderungen ist ein kritischer Fehler und muss verhindert werden

---

## Tech Stack (verbindlich)

| Bereich         | Technologie             | Version      |
| --------------- | ----------------------- | ------------ |
| Framework       | Next.js (App Router)    | 16.x         |
| Runtime         | React                   | 19.x         |
| Sprache         | TypeScript              | 5.x          |
| Datenbank       | PostgreSQL              | 15.x         |
| ORM             | Prisma                  | 7.x          |
| Auth            | NextAuth.js             | 4.x (stabil) |
| UI-Komponenten  | shadcn/ui               | aktuell      |
| Styling         | Tailwind CSS            | 4.x          |
| Charts          | Recharts                | 2.x          |
| Package Manager | npm                     | -            |
| Container       | Docker + Docker Compose | -            |

---

### Prisma 7 — wichtige Abweichungen von früheren Versionen

Prisma 7 hat breaking changes, die die Implementierung betreffen:

- **Client-Generierung**: In `src/generated/prisma/` (konfiguriert in `schema.prisma` via `output`), nicht in `node_modules/@prisma/client`. Import immer via `@/generated/prisma/client`.
- **Datenbankverbindung**: Kein `url`-Feld in `datasource db` von `schema.prisma`. Stattdessen `prisma.config.ts` im Projekt-Root für Migrations-CLI. Application-Code nutzt `@prisma/adapter-pg` mit `pg.Pool`.
- **Zusätzliche Pakete**: `@prisma/adapter-pg`, `pg`, `@types/pg`, `dotenv` werden benötigt.

`src/lib/db.ts` mit Prisma 7 Adapter:

```typescript
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
```

---

## Daten- und Aktionsarchitektur

- **Server Actions** statt API Routes für alle Formular-Aktionen und Datenbankoperationen
- Server Actions laufen serverseitig, werden direkt aus React-Komponenten aufgerufen
- Kein separates API-Layer nötig — weniger Boilerplate, einfacher zu verstehen
- Validierung via **Zod** (serverseitig in jeder Server Action)
- Formulare nutzen den React `useActionState` Hook für Fehler-Feedback

---

## Authentifizierung & Sicherheit

- **Methode**: Email + Passwort via NextAuth.js v4
- **Passwörter**: Gehasht mit bcrypt, niemals im Klartext gespeichert
- **Sessions**: Server-seitig via NextAuth.js Session-Tokens
- **Datenisolation**: Jeder Datenbankzugriff filtert zwingend nach `userId` — kein Nutzer sieht fremde Daten
- **Kein E-Mail-Versand** im ersten Schritt — Passwort-Reset durch Admin
- **HTTPS**: In Produktion zwingend (via Reverse Proxy, z.B. Nginx oder Traefik auf TrueNAS)
- **Secrets**: `NEXTAUTH_SECRET` und Datenbank-Credentials nur via Umgebungsvariablen

---

## Code Conventions

### Benennungsregeln

| Was                    | Konvention                          | Beispiel                 |
| ---------------------- | ----------------------------------- | ------------------------ |
| Dateien (Komponenten)  | PascalCase                          | `SessionForm.tsx`        |
| Dateien (Logik/Utils)  | camelCase                           | `calculateScore.ts`      |
| React-Komponenten      | PascalCase                          | `function SessionForm()` |
| Funktionen & Variablen | camelCase                           | `const totalScore`       |
| Konstanten (global)    | SCREAMING_SNAKE_CASE                | `const MAX_SHOTS = 10`   |
| Prisma-Modelle         | PascalCase                          | `model TrainingSession`  |
| Enum-Werte             | SCREAMING_SNAKE_CASE                | `TRAINING`, `WETTKAMPF`  |
| TypeScript-Interfaces  | PascalCase mit `I`-Präfix vermeiden | `interface SessionData`  |

### TypeScript-Regeln

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

### Zod v4 (aktuell installiert)

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

### React 19 `useActionState`

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

### Dateistruktur einer Komponente

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

### Server Actions

Jede Server Action liegt in einer Datei `actions.ts` im zugehörigen Feature-Ordner:

```typescript
// src/lib/sessions/actions.ts

"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"

// Zod-Schema beschreibt exakt was erwartet wird
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

### Datenbankzugriffe (Prisma)

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

### Kommentare

Kommentare erklären **Warum**, nicht Was. Das Was ergibt sich aus dem Code selbst.

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
- Jeder Funktion in `lib/` die nicht trivial ist (JSDoc-Stil):

```typescript
/**
 * Berechnet die Gesamtpunktzahl einer Einheit aus allen Serienwertungen.
 * Probeschuss-Serien werden nicht mitgezählt.
 */
function calculateTotalScore(series: Series[]): number { ... }
```

### Fehlerbehandlung

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

Tests sind **Pflicht** für:

1. **Berechnungslogik**: Jede Funktion, die Werte ausrechnet
   - Gesamtringe aus Seriensummen
   - Durchschnittswerte, Trends
   - Validierung von Serienwerten (min/max je nach Disziplin)

2. **Geschäftsregeln mit Sonderfällen**:
   - Probeschüsse nicht in Gesamtwertung
   - Archivierte Disziplin nicht in Auswahllisten
   - Leere Serien-Wertung (0 oder null)

3. **Zugangskontrolle in lib-Funktionen** (wo sinnvoll testbar):
   - Funktion gibt `null` zurück wenn userId nicht übereinstimmt

### Was wird nicht getestet

- React-Komponenten (UI-Details ändern sich oft, Tests wären fragil)
- Next.js Routing und Middleware
- Prisma-Datenbankoperationen (zu aufwendig ohne Test-DB)
- Server Actions direkt (Integration mit Prisma, schwer zu isolieren)

### Teststruktur

Jeder Test folgt dem **Arrange–Act–Assert**-Muster mit deutschen Beschreibungen:

```typescript
// src/lib/sessions/calculateScore.test.ts
import { describe, it, expect } from "vitest"
import { calculateTotalScore } from "./calculateScore"

describe("calculateTotalScore", () => {
  it("addiert alle Serienwerte korrekt", () => {
    // Arrange: Testdaten vorbereiten
    const series = [
      { score: 94, isPractice: false },
      { score: 91, isPractice: false },
      { score: 96, isPractice: false },
    ]

    // Act: Funktion aufrufen
    const result = calculateTotalScore(series)

    // Assert: Ergebnis prüfen
    expect(result).toBe(281)
  })

  it("ignoriert Probeschuss-Serien bei der Gesamtwertung", () => {
    const series = [
      { score: 50, isPractice: true }, // Probeschuss — zählt nicht
      { score: 94, isPractice: false },
      { score: 91, isPractice: false },
    ]

    const result = calculateTotalScore(series)

    expect(result).toBe(185) // Nur die zwei Wertungsserien
  })

  it("gibt 0 zurück wenn keine Wertungsserien vorhanden sind", () => {
    const result = calculateTotalScore([])
    expect(result).toBe(0)
  })
})
```

### Testabdeckung

- **Kein Abdeckungsziel in Prozent** — Tests sollen sinnvoll sein, nicht vollständig
- **Faustregel**: Jede Funktion in `lib/` mit Berechnung oder Entscheidungslogik bekommt Tests
- Tests müssen **vor dem Commit grün sein**: `npm run test` darf nicht rot sein

---

## Datenmodell (verbindlich)

Das Prisma-Schema implementiert dieses Modell. Abweichungen erfordern eine Migration und Begründung.

```
User
  ├── id, email, passwordHash, role (ADMIN | USER)
  ├── createdAt, isActive (Boolean — deaktiviert statt gelöscht)
  │
  ├── Sessions (Einheiten)
  │     ├── id, userId
  │     ├── type: TRAINING | WETTKAMPF | TROCKENTRAINING | MENTAL
  │     ├── date (DateTime), location? (String)
  │     ├── disciplineId? (→ Discipline, nur bei TRAINING/WETTKAMPF)
  │     │
  │     ├── Wellbeing? (1:1, optional)
  │     │     └── sleep, energy, stress, motivation (je Int 0–10)
  │     │
  │     ├── Series[] (nur bei TRAINING/WETTKAMPF)
  │     │     ├── position (Int — Reihenfolge 1,2,3...)
  │     │     ├── isPractice (Boolean — Probeschuss-Serie)
  │     │     ├── scoreTotal? (Decimal(5,1) — Seriensumme, z.B. 94.7)
  │     │     ├── shots? (Json — Einzelschuss-Werte als Strings ["9.5","10.1"])
  │     │     └── executionQuality? (Int 1–5)
  │     │
  │     ├── Attachments[]
  │     │     ├── filePath (String — relativer Pfad im Upload-Volume)
  │     │     ├── fileType: IMAGE | PDF
  │     │     ├── originalName (String — für Anzeige)
  │     │     └── label? (String)
  │     │
  │     ├── Reflection? (1:1, optional)
  │     │     ├── observations? (String)
  │     │     ├── insight? (String — "Heute ist mir klargeworden, dass …")
  │     │     ├── learningQuestion? (String — "Was kann ich tun, um …?")
  │     │     ├── routineFollowed? (Boolean)
  │     │     └── routineDeviation? (String)
  │     │
  │     ├── Prognosis? (1:1, optional)
  │     │     ├── fitness, nutrition, technique, tactics,
  │     │     │   mentalStrength, environment, equipment (je Int 0–100)
  │     │     ├── expectedScore? (Decimal(5,1))
  │     │     ├── expectedCleanShots? (Int)
  │     │     └── performanceGoal? (String)
  │     │
  │     ├── Feedback? (1:1, optional — ergänzt Prognosis)
  │     │     ├── fitness, nutrition, technique, tactics,
  │     │     │   mentalStrength, environment, equipment (je Int 0–100)
  │     │     ├── explanation? (String)
  │     │     ├── goalAchieved? (Boolean), goalAchievedNote? (String)
  │     │     ├── progress? (String)
  │     │     ├── fiveBestShots? (String)
  │     │     ├── wentWell? (String)
  │     │     └── insights? (String)
  │     │
  │     └── Goals[] (Many-to-Many via SessionGoal-Tabelle)
  │
  ├── Disciplines
  │     ├── id, name
  │     ├── seriesCount (Int), shotsPerSeries (Int)
  │     ├── practiceSeries (Int, Standard: 0)
  │     ├── scoringType: WHOLE | TENTH
  │     ├── isSystem (Boolean — systemweit für alle Nutzer)
  │     ├── isArchived (Boolean — archiviert statt gelöscht)
  │     └── ownerId? (→ User, null bei System-Disziplinen)
  │
  ├── ShotRoutines
  │     ├── id, userId (Pflicht — jeder Ablauf gehört einem Nutzer)
  │     ├── name (String)
  │     ├── disciplineId? (→ Discipline, optional)
  │     └── steps (Json — [{order: Int, title: String, description?: String}])
  │
  └── Goals
        ├── id, userId
        ├── title (String), description? (String)
        ├── type: RESULT | PROCESS
        ├── dateFrom (DateTime), dateTo (DateTime)
        └── Sessions[] (Many-to-Many via SessionGoal)

Speicher-Hinweise:
- Zehntelwertung: Decimal(5,1) — erlaubt Werte von 0.0 bis 999.9
- Ganzringwertung: Int
- shots[]-Array: Json-Feld, Einzelwerte als Strings ("9.5") für exakte Dezimaldarstellung
- Archivierte/deaktivierte Einträge werden nie gelöscht — isArchived/isActive als Filter
```

---

## Linting & Formatierung

### Tools

| Tool     | Zweck                        | Konfigurationsdatei |
| -------- | ---------------------------- | ------------------- |
| ESLint   | Code-Qualität, Fehler finden | `.eslintrc.json`    |
| Prettier | Code-Formatierung            | `.prettierrc`       |

### ESLint-Konfiguration

ESLint v9 verwendet das neue Flat-Config-Format (`eslint.config.mjs`, kein `.eslintrc.json` mehr).

```js
// eslint.config.mjs
import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-unused-vars": "error",
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]

export default eslintConfig
```

### Prettier-Konfiguration

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Regeln

- **Vor jedem Commit**: `npm run lint` und `npm run format:check` müssen fehlerfrei durchlaufen
- **Hinweis**: `next lint` ist in Next.js 16 defekt — der `lint`-Script nutzt direkt `eslint src`
- **Kein Auto-Fix beim Commit** (kein Husky/lint-staged im ersten Schritt — zu viel Setup-Aufwand)
- **`no-console`**: `console.log()` ist verboten, `console.error()` und `console.warn()` erlaubt
- **`no-unused-vars`**: Ungenutzte Variablen sind ein Fehler, nicht nur eine Warnung
- **Keine `any`-Typen**: ESLint-Fehler bei `any` (`@typescript-eslint/no-explicit-any`)

### npm-Scripts (verbindlich)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Dateistruktur (verbindlich)

```
/
├── src/
│   ├── app/              # Next.js App Router (Seiten, Layouts, Server Actions)
│   ├── components/       # Wiederverwendbare UI-Komponenten
│   │   ├── ui/           # shadcn/ui Basis-Komponenten (nicht manuell editieren)
│   │   └── [feature]/    # Feature-spezifische Komponenten
│   ├── lib/              # Geschäftslogik, Datenbankzugriff, Hilfsfunktionen
│   │   ├── db.ts         # Prisma Client (Singleton)
│   │   ├── auth.ts       # NextAuth Konfiguration
│   │   └── [feature]/    # Feature-spezifische Logik
│   └── types/            # Gemeinsame TypeScript-Typen
├── prisma/
│   ├── schema.prisma     # Datenbankschema
│   └── migrations/       # Migrationsdateien (eingecheckt!)
├── docs/                 # Projektdokumentation
├── public/               # Statische Dateien
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Dockerfile
└── .env.example          # Vorlage für Umgebungsvariablen (niemals echte Werte!)
```

---

## Umgebungsvariablen

Eine `.env.example` Datei dokumentiert alle benötigten Variablen.
Die echte `.env` Datei ist **niemals** im Repository eingecheckt (`.gitignore`).

Benötigte Variablen:

```
DATABASE_URL=          # PostgreSQL Connection String (z.B. postgresql://user:pass@db:5432/treffsicher)
NEXTAUTH_SECRET=       # Zufälliger Secret für Session-Verschlüsselung (min. 32 Zeichen)
NEXTAUTH_URL=          # Öffentliche URL der App (z.B. https://training.example.com)
UPLOAD_DIR=            # Pfad zum Upload-Verzeichnis (Standard: /app/uploads)
ADMIN_EMAIL=           # E-Mail des ersten Admin-Accounts (wird beim ersten Start angelegt)
ADMIN_PASSWORD=        # Passwort des ersten Admin-Accounts (min. 12 Zeichen)
```

---

## Nutzerverwaltung & Rollen

- **Keine Selbstregistrierung** — nur Admins können Konten erstellen
- **Rollen**: `ADMIN` und `USER`
- **Erster Admin**: Wird automatisch beim ersten App-Start angelegt, wenn noch kein Admin existiert (aus `ADMIN_EMAIL` + `ADMIN_PASSWORD` Umgebungsvariablen)
- **Admin-Funktionen**: Nutzer anlegen, deaktivieren, Passwort zurücksetzen

---

## Disziplinen

### Verhalten bei Löschung

- Disziplinen werden **archiviert, nicht gelöscht** — bestehende Einheiten bleiben lesbar
- Archivierte Disziplinen erscheinen nicht mehr in der Auswahl für neue Einheiten

### Vorinstallierte Standarddisziplinen

| Name                 | Serien | Schuss/Serie | Wertung      |
| -------------------- | ------ | ------------ | ------------ |
| Luftpistole          | 4      | 10           | Ganzringe    |
| Luftgewehr           | 4      | 10           | Ganzringe    |
| Luftgewehr (Zehntel) | 4      | 10           | Zehntelringe |
| Luftpistole Auflage  | 3      | 10           | Zehntelringe |
| Luftgewehr Auflage   | 3      | 10           | Zehntelringe |

Standarddisziplinen gehören dem System (kein Nutzer) und sind für alle sichtbar.
Nutzer können eigene Disziplinen hinzufügen.

---

## Ergebniserfassung

- **Standard**: Seriensumme (z.B. 94 Ringe bei Ganzwertung, 94.7 bei Zehntelwertung)
- **Optional**: Einzelschuss-Eingabe aktivierbar — dann werden alle Einzelwerte gespeichert, die Seriensumme automatisch berechnet
- **Gültige Wertebereiche**:
  - Ganzringe: 0–10 pro Schuss (abhängig von Disziplin kann Maximum höher sein, z.B. Kleinkaliberpistole)
  - Zehntelringe: 0.0–10.9 pro Schuss (ISSF-Standard)
- **Wahl gilt pro Einheit**: Nicht global konfigurierbar — jede Einheit kann anders erfasst werden
- **Probeschuss-Serien**: Immer als Seriensumme, fliessen nicht in Gesamtergebnis ein

---

## Design & UI

- **Responsiv**: Mobile und Desktop gleichwertig
- **Sprache**: Deutsch
- **Dark Mode**: Nicht im ersten Schritt — nur Light Mode
- **Offline**: Kein Offline-Support im ersten Schritt

---

## App-Name

**Treffsicher**

- Docker Image: `treffsicher`
- App-Port: `3000`

---

## Datensicherung & Import

- **Backup**: TrueNAS-seitig via Volume-Snapshots — kein app-seitiger Mechanismus nötig
- **Import**: Kein Datenimport — Neustart ohne Altdaten

---

## Sprache

- **UI-Sprache**: Deutsch
- **Code-Sprache**: Englisch (Variablennamen, Funktionsnamen, Kommentare im Code)
- **Dokumentation**: Deutsch (docs/, README)
- **Fehlermeldungen für Nutzer**: Deutsch
- **Commit-Messages**: Englisch

---

## Versionskontrolle

- **Migrationsdateien** werden immer eingecheckt
- **`.env`** niemals eingecheckt
- **`node_modules/`** niemals eingecheckt
- **Uploads-Verzeichnis** niemals eingecheckt
