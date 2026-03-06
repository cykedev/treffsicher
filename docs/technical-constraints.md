# Technische Rahmenbedingungen — Verbindliche Regeln

Dieses Dokument definiert verbindliche technische Entscheidungen für das Projekt.
Diese Regeln dürfen nicht ohne explizite Überprüfung und Begründung geändert werden.

## Index

- **Hosting / Entwicklungsumgebung** — Docker Compose (dev/prod), TrueNAS-portabel, Node.js 20 LTS
- **Persistenz** — PostgreSQL + Named Volumes, Upload-Volume `/app/uploads`, Dateinamen als UUID
- **Datenbank-Migrationen** — Prisma Migrate deploy beim Start, P3009-Recovery-Script, kein Datenverlust
- **Tech Stack + Prisma 7** — Verbindliche Versionen; Prisma 7 breaking changes (Client-Pfad, Adapter, Config)
- **Daten- und Aktionsarchitektur** — Server Actions, Zod, useActionState, serverseitige Konsistenzregeln
- **Authentifizierung & Sicherheit + DoS-Schutz** — NextAuth v4, bcrypt, Session-Invalidierung, Rate-Limits
- **Code Conventions** — Benennung, TypeScript-Regeln, Zod v4, React 19 useActionState, DB-Zugriffsmuster, Kommentare
- **Testing** — Vitest, Testpflicht-Kategorien (Berechnung/Actions/Guards), Arrange-Act-Assert
- **Datenmodell** — Vollständiges Prisma-Schema (User, Sessions, Disciplines, ShotRoutines, Goals, ...)
- **Linting + Dateistruktur** — ESLint v9 Flat Config, Prettier, verbindliche Verzeichnisstruktur
- **Modularität & Wartbarkeit** — Dateigrössen-/Split-Regel, Props-Budget, Feature-Struktur, Duplikationsregel
- **Umgebungsvariablen / Nutzerverwaltung / Disziplinen** — Env-Vars, Rollen (ADMIN/USER), System-Disziplinen
- **Ergebniserfassung + Meyton-Import** — Serien, Validierungsregeln, PDF-Import-Architektur + Sicherheitsgrenzen
- **Design & UI** — Dark Mode only, 8 verbindliche UI-Konsistenzregeln
- **Betrieb / Sprache / Versionskontrolle** — Fehlerfälle, Sprachmatrix, Git-Regeln

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
- **Recovery bei P3009**: Wenn ein Migrationseintrag in `_prisma_migrations` als fehlgeschlagen markiert ist,
  startet ein Recovery-Script automatisch. Bekannte, explizit freigegebene Fälle werden aufgelöst und
  `prisma migrate deploy` wird erneut ausgeführt.
- **Sicherheitsgrenze**: Unbekannte fehlgeschlagene Migrationen werden standardmässig **nicht**
  automatisch aufgelöst (`PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS=false`).
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

### Verbindliche Konsistenzregeln (fachlich + technisch)

1. **Fachregeln werden serverseitig erzwungen** (nicht nur im UI):
   - Attachments sind nur bei `TRAINING` und `WETTKAMPF` erlaubt.
   - Prognose und Feedback sind nur bei `TRAINING` und `WETTKAMPF` erlaubt.
2. **Fehlerpfade sind immer explizit und nutzerführend**:
   - Server Actions liefern strukturierte Rückgaben (ActionResult-Stil) statt stillen Abbrüchen.
   - Es gibt kein "silent fail": Jede Aktion liefert für die UI ein klares Erfolg-/Fehlersignal.
3. **Upload-Whitelist ist verbindlich**:
   - Erlaubte MIME-Typen sind ausschliesslich `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
4. **Interne Benennung bleibt konsequent englisch**:
   - Komponenten, Funktionen, Dateinamen und Routen/URL-Segmente sind intern englisch.
   - Neue interne deutsche Benennungen oder deutsche URL-Segmente sind nicht erlaubt.

---

## Authentifizierung & Sicherheit

- **Methode**: Email + Passwort via NextAuth.js v4
- **Passwörter**: Gehasht mit bcrypt, niemals im Klartext gespeichert
- **Sessions**: Server-seitig via NextAuth.js Session-Tokens
- **Datenisolation**: Jeder Datenbankzugriff filtert zwingend nach `userId` — kein Nutzer sieht fremde Daten
- **Kein E-Mail-Versand** im ersten Schritt — kein Mail-Reset-Flow
- **Passwortwechsel (Self-Service)**: Nur im eingeloggten Zustand mit aktuellem Passwort (`/account`)
- **Passwort vergessen**: Reset weiterhin nur durch Admin
- **Session-Invalidierung bei Passwortwechsel**: Passwortwechsel/-Reset erhöht `sessionVersion`; alte JWT-Sessions werden dadurch serverseitig ungültig
- **HTTPS**: In Produktion zwingend (via Reverse Proxy, z.B. Nginx oder Traefik auf TrueNAS)
- **Secrets**: `NEXTAUTH_SECRET` und Datenbank-Credentials nur via Umgebungsvariablen

### DoS-Schutz (verbindlich)

- **Login-Rate-Limit**: In-Memory Buckets pro E-Mail und pro IP (`maxAttemptsPerEmail=5`, `maxAttemptsPerIp=30`, Fenster/Blockdauer je 15 Minuten)
- **Login-Rate-Limit Speichergrenze**: Maximale Anzahl Buckets konfigurierbar (`AUTH_RATE_LIMIT_MAX_BUCKETS`, Standard 10'000), älteste Buckets werden bei Erreichen der Grenze verdrängt
- **Proxy-Header-Vertrauen**: IP-basierte Limits nutzen `x-real-ip`/`x-forwarded-for` nur wenn `AUTH_TRUST_PROXY_HEADERS=true` gesetzt ist (sicherer Default: aus)
- **Meyton-URL-Import**:
  - `fetch` mit `AbortController` (Timeout 15 Sekunden)
  - Keine Redirects (`redirect: "manual"`)
  - `Content-Length` Vorab-Prüfung auf 10 MB
  - Streaming-Download mit hartem Abbruch > 10 MB (kein ungebremstes `arrayBuffer()` mehr)
- **Meyton-PDF-Dekompression**:
  - Maximal 2 MB pro Flate-Stream (`inflateSync(..., { maxOutputLength })`)
  - Maximal 8 MB dekomprimierter Inhalt insgesamt pro Import
  - Maximal 25'000 extrahierte Text-Tokens
- **Session-FormData (Server Action)**:
  - Maximal 120 Serien pro Request
  - Maximal 120 Schusswerte pro Serie (beim JSON-Array)
  - Maximal 16 KB JSON-Text pro `shots`-Feld
  - Maximal 100 Ziel-IDs (`goalIds`) pro Request
- **Statistik-Abfragen**:
  - Harte Server-Caps pro Request: max. 1'200 Sessions bzw. 12'000 Serienpunkte
  - Ergebnisdarstellung bleibt chronologisch (intern `desc` + Reverse)

---

## Code Conventions

### Benennungsregeln

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
Kommentare sind **sparsam und zielgerichtet**: kein Kommentar-Selbstzweck und keine offensichtlichen
"Warum sowieso"-Sätze.

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
- Nicht-trivialer UI-Logik in `.tsx` (z. B. abgeleitete Zustände, Guard-Branches, Mapping
  zwischen Form-/Domain-Modell), wenn der Grund nicht direkt lesbar ist
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

4. **Server-Action-Orchestrierung mit klarer Entscheidungslogik**:
   - Auth-/Ownership-Guards
   - Delegation in Shared-Logik/Fassaden
   - Fehlerpfade mit erwarteten Fehlermeldungen
   - Revalidate-/Redirect-Reihenfolge bei Mutationen

5. **Import-/Mapping-Pfade mit hoher Wirkung**:
   - Disziplinabhängige Wert-Konvertierung
   - Harte Abbruchpfade bei invaliden Inputs
   - Kein stilles Teilimport-Verhalten

### Was wird nicht getestet

- React-Komponenten auf reiner Presentational-Ebene (UI-Details ändern sich oft, Tests wären fragil)
- Next.js Routing und Middleware
- Volle Prisma-Integrationspfade ohne dedizierte Test-DB

### UI- und Flow-Tests (aktuelle Priorisierung)

- UI-/Flow-Tests sind **gewünscht**, aber derzeit **nicht Merge-blockend**.
- Priorität liegt auf stabilen Tests der Business-Logik und Action-Entscheidungspfade.
- UI-/Flow-Tests folgen gezielt für die kritischsten End-to-End-Abläufe, sobald die betreffenden
  Screens/Flows fachlich stabil sind.

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
  ├── id, name?, email, passwordHash, role (ADMIN | USER)
  ├── createdAt, isActive (Boolean — deaktiviert statt gelöscht)
  │
  ├── Sessions (Einheiten)
  │     ├── id, userId
  │     ├── type: TRAINING | WETTKAMPF | TROCKENTRAINING | MENTAL
  │     ├── date (DateTime), location? (String)
  │     ├── disciplineId? (→ Discipline, nur bei TRAINING/WETTKAMPF)
  │     │
  │     ├── Wellbeing? (1:1, optional)
  │     │     └── sleep, energy, stress, motivation (je Int 0–100)
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

## Modularität & Wartbarkeit (verbindlich)

Diese Regeln sind verbindlich für **neuen Code** und für **wesentlich geänderte** bestehende Dateien.
Bestandsdateien werden schrittweise bei fachlichen Änderungen in Richtung dieser Regeln refaktoriert.

### 1) Dünne Orchestrator-Dateien

- `page.tsx`, `route.ts` und Action-Einstiegspunkte orchestrieren nur:
  - Auth/Param-Handling
  - Aufruf von Feature-Logik
  - Zusammenbau der Antwort/Komposition
- Fachlogik, Datenaufbereitung und Mapping gehören in dedizierte Module (`lib/`, Feature-`_lib/`, Hooks, View-Models).

### 2) Dateigröße und Split-Regel

- Zielbereich je Datei: **80–180 Zeilen**.
- Ab **>220 Zeilen** ist ein Split verpflichtend, wenn kein klarer technischer Ausnahmegrund vorliegt.
- Ausnahmen: generierter Code (`src/generated/*`) und externe Basisbibliotheken (`src/components/ui/*`).
- Hotfix-Ausnahme: Bei kritischen Fixes darf temporär darüber hinaus gearbeitet werden; der Split folgt im nächsten Wartungs-PR.

### 3) Props-Budget und Kopplung

- Komponenten sollen im Regelfall maximal **6 Top-Level-Props** haben.
- Bei größerem Datenbedarf: auf `model` + `actions` oder Feature-Hook aufteilen.
- Prop-Drilling über mehr als zwei Ebenen ist zu vermeiden; stattdessen Komposition, lokale Container-Komponente oder dedizierter Hook.
- Komponenten erhalten keine unstrukturierten Setter-Sammlungen mehrerer Domänen.

### 4) Einheitliche Feature-Struktur

- Komponenten-Dateien bleiben `PascalCase`; Hook-/Utility-Dateien bleiben `camelCase`; Ordnernamen bleiben `kebab-case`.
- Nicht-triviale Bereiche (mehrere zusammengehörige Dateien) werden in einen Feature-Unterordner gruppiert, z.B.:

```text
components/app/<feature>/<module>/
  index.ts
  <ModuleRoot>.tsx
  <SubPart>.tsx
  use<ModulePart>.ts
  types.ts
```

- Imports innerhalb desselben Feature-Unterordners nutzen relative Pfade (`./`, `../`); Alias-Imports (`@/...`) sind für feature-übergreifende Abhängigkeiten.

### 5) Duplikationsregel

- Logik, die an mehreren Stellen identisch oder nahezu identisch auftritt, wird in ein gemeinsames Modul extrahiert.
- Spätestens beim dritten Vorkommen ist ein Split in Shared-Utility/Helfer verpflichtend.
- Bewusste Duplikate müssen mit kurzem Kommentar begründet werden (`Warum noch nicht extrahiert`).

### 6) Refactor-Sicherheitsnetz

- Struktur-Refactors dürfen kein Verhalten ändern.
- Pflicht vor Merge: `npm run lint` und `npm run test` grün.
- Bei UI-Refactors ist die visuelle Konsistenz (Layout/Alignment) manuell zu prüfen.

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
AUTH_TRUST_PROXY_HEADERS=   # true nur bei vertrauenswürdigem Reverse Proxy (für IP-Rate-Limit)
AUTH_RATE_LIMIT_MAX_BUCKETS= # Max. In-Memory Buckets für Login-Rate-Limit (Standard: 10000)
```

---

## Nutzerverwaltung & Rollen

- **Keine Selbstregistrierung** — nur Admins können Konten erstellen
- **Rollen**: `ADMIN` und `USER`
- **Erster Admin**: Wird automatisch beim ersten App-Start angelegt, wenn noch kein Admin existiert (aus `ADMIN_EMAIL` + `ADMIN_PASSWORD` Umgebungsvariablen)
- **Admin-Funktionen**: Nutzer anlegen, bearbeiten (Name, E-Mail, Rolle, Status), deaktivieren, Passwort zurücksetzen
- **Nutzer-Funktion**: Eigenes Passwort ändern, wenn eingeloggt und aktuelles Passwort bekannt ist

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
Admins koennen System-Disziplinen verwalten (anlegen, bearbeiten, archivieren/reaktivieren).

---

## Ergebniserfassung

- **Standard**: Seriensumme (z.B. 94 Ringe bei Ganzwertung, 94.7 bei Zehntelwertung)
- **Optional**: Einzelschuss-Eingabe aktivierbar — dann werden alle Einzelwerte gespeichert, die Seriensumme automatisch berechnet
- **Gültige Wertebereiche**:
  - Ganzringe: 0–10 pro Schuss (abhängig von Disziplin kann Maximum höher sein, z.B. Kleinkaliberpistole)
  - Zehntelringe: 0.0–10.9 pro Schuss (ISSF-Standard)
- **Wahl gilt pro Einheit**: Nicht global konfigurierbar — jede Einheit kann anders erfasst werden
- **Probeschuss-Serien**: Immer als Seriensumme, fliessen nicht in Gesamtergebnis ein

### Meyton-PDF Import (verbindlich)

- Import-Startpunkt: Dialog direkt im Einheit-Formular (`neu` und `bearbeiten`)
- Quelle: `URL` oder Datei-Upload (`application/pdf`)
- Verarbeitung: strikt textbasiert (kein OCR)
- Architekturtrennung: **PDF laden** -> **Text extrahieren** -> **Meyton-Parsing**
- Serienerkennung: über `Serie <n>:`; Reihenfolge entspricht Dokumentreihenfolge
- Schussparser: nur Werte im Bereich `0.0` bis `10.9`; Marker (`*`, `T`) und Footer-Texte werden ignoriert
- Importierte Serien sind initial immer `isPractice: false`
- Bei Disziplin `WHOLE`: jeder importierte Schusswert wird per `Math.floor()` umgerechnet
- Import ersetzt die aktuell geladenen Serien im Formular vollständig
- Import speichert nicht direkt in der DB: Speichern erst durch Nutzeraktion
- Bei neuen, noch nicht gespeicherten Einheiten kann Datum/Uhrzeit aus dem Meyton-PDF übernommen werden
- Fehlerstrategie: harter Abbruch mit deutscher Fehlermeldung, kein Teilimport
- Schutzgrenzen:
  - Datei-Grenze 10 MB (Upload und URL-Import)
  - URL-Import: 15 Sekunden Timeout, keine Redirects
  - Dekompression: 2 MB pro Stream, 8 MB gesamt, 25'000 Tokens
  - Formularübernahme: max. 120 Serien, max. 120 Schusswerte pro Serie

---

## Design & UI

- **Responsiv**: Mobile und Desktop gleichwertig
- **Sprache**: Deutsch
- **Dark Mode**: Ausschliesslich Dark Mode — kein Light Mode, kein Toggle. `class="dark"` ist fest auf `<html>` gesetzt.
- **Offline**: Kein Offline-Support im ersten Schritt

### Verbindliche UI-Konsistenzregeln

1. **Einheitliches Komponenten-System**:
   - Interaktive UI-Elemente (Dialoge, Auswahlen, Bestätigungen, Eingaben) nutzen durchgängig `shadcn/ui`.
   - Native Browser-Dialoge (`alert`, `confirm`) werden in App-Flows nicht verwendet.
2. **Einheitliches Auswahlmuster**:
   - Boolesche und Modus-Auswahlen nutzen ein konsistentes, klickbares Row-Muster (z.B. Stil "zahlt auf Ziel ein").
   - Das gilt auch für fachlich gleiche Interaktionen wie "Leistungsziel erreicht", "Probe/Wertung" und analoge Umschalter.
3. **Konsistente Flows für Anlegen und Löschen/Archivieren**:
   - "Neu anlegen"-Aktionen folgen durchgängig demselben Muster (Bezeichnung, Platzierung, Route `/.../new`).
   - Destruktive Aktionen (Löschen/Archivieren) verwenden immer denselben Bestätigungsdialog-Stil inkl. klarer Folgenbeschreibung.
4. **Mobil ist gleichwertig, nicht reduziert**:
   - Navigation und zentrale Aktionen bleiben auf Mobilgeräten textlich verständlich (keine rein icon-basierte Hauptnavigation).
   - Das Interaktionsverhalten ist auf Desktop und Mobil konsistent.
5. **Detailnavigation folgt dem Einheiten-Muster (Referenz)**:
   - Detailseiten nutzen eine obere Action-Leiste rechts und darunter die inhaltlichen Metadaten.
   - Aktionsreihenfolge folgt dem Einheiten-Prinzip: zuerst fachliche/sekundäre Aktionen, danach destruktive Aktion, "Zurück" am Ende.
   - Dieses Muster gilt durchgängig für Einheiten, Ziele, Abläufe und Disziplinen.
6. **Listen-/Detail-Flow ist einheitlich**:
   - Verwaltungslisten zeigen kompakte Karten; die ganze Karte öffnet die jeweilige Detailseite.
   - Zusätzliche "Details/Anzeigen"-Buttons in Listen werden vermieden, wenn die Karte bereits als Navigation dient.
7. **Reine Icon-Aktionen ohne Outline**:
   - Reine Icon-Buttons verwenden `ghost` (borderlos), nicht `outline`.
   - `outline` ist für textliche oder gemischte (Icon+Text) Aktionen vorgesehen.
8. **Terminologie in der UI**:
   - In nutzerseitigen Texten wird "Probe" verwendet (nicht "Probeschuss"), z.B. "Probe-Serie".

---

## App-Name

**Treffsicher**

- Docker Image: `treffsicher`
- App-Port: `3000`

---

## Datensicherung & Import

- **Backup**: TrueNAS-seitig via Volume-Snapshots — kein app-seitiger Mechanismus nötig
- **Import**: Kein Massenimport von Bestandsdaten; einzige Ausnahme ist der manuelle Meyton-PDF-Import pro einzelner Einheit

---

## Betrieb & Fehlerfälle (verbindlich)

- Betriebsdokumentation für Deployment, Recovery und Inbetriebnahme ist Pflicht und liegt in `docs/production-deploy-truenas.md`.
- Für kritische Fehlerfälle (DB nicht erreichbar, Migration fehlgeschlagen, Upload-Volume nicht verfügbar, fehlende Secrets) gibt es dokumentierte Diagnose- und Wiederanlauf-Schritte.
- Nutzer erhalten in der UI klare deutsche Fehlermeldungen; technische Details bleiben im Server-Log.
- Wiederherstellbarkeit von Datenbank **und** Uploads muss regelmässig praktisch geprüft werden (Restore-Test), nicht nur theoretisch dokumentiert.

---

## Sprache

- **UI-Sprache**: Deutsch
- **Code-Sprache (Identifier)**: Englisch (Variablennamen, Funktionsnamen, Komponenten-Namen, Dateinamen von Komponenten, Routen/URL-Segmente)
- **Code-Kommentare**: Deutsch
- **Dokumentation**: Deutsch (docs/, README)
- **Fehlermeldungen für Nutzer**: Deutsch
- **Commit-Messages**: Englisch

---

## Versionskontrolle

- **Migrationsdateien** werden immer eingecheckt
- **`.env`** niemals eingecheckt
- **`node_modules/`** niemals eingecheckt
- **Uploads-Verzeichnis** niemals eingecheckt

---

## Änderungsnotizen

- **05.03.2026**: Test- und Kommentierungsregeln präzisiert: Business-Logik und Action-Orchestrierung verpflichtend testen, UI-/Flow-Tests vorerst nachgelagert; Kommentare explizit sparsam und nur für nicht-triviale Logikgründe.
- **05.03.2026**: Neue verbindliche Modularitätsregeln ergänzt: dünne Orchestrator-Dateien, Dateigrößen-/Split-Regel, Props-Budget (max. 6 Top-Level-Props), einheitliche Feature-Unterordner, Duplikationsregel sowie Refactor-Sicherheitsnetz (Lint/Test + visuelle Prüfung).
- **03.03.2026**: Navigations- und Flow-Regeln verbindlich präzisiert: Einheiten-Detailansicht als Referenzmuster für Action-Leisten und Aktionsreihenfolge; Listen als klickbare Karten ohne separaten Details-Button; reine Icon-Aktionen ohne Outline; UI-Terminologie auf "Probe" standardisiert.
- **03.03.2026**: Verbindliche Konsistenzregeln ergänzt: serverseitige Fachregel-Erzwingung, explizite Fehlerpfade ohne silent fail, feste Upload-Whitelist, englische interne Benennung/Routen sowie verbindliche UI-Muster (shadcn/ui, einheitliche Auswahl-/Delete-/Archive-Flows, mobile Verständlichkeit) plus Betriebs-/Fehlerfall-Regeln mit Restore-Test-Pflicht.
- **02.03.2026**: DoS-Härtung dokumentiert: Streaming-URL-Import mit Hard-Cap, begrenzte PDF-Dekompression, serverseitige FormData-Limits und Statistik-Caps.
- **02.03.2026**: Login-Rate-Limit weiter gehärtet: begrenzte Bucket-Anzahl (Speichergrenze) und optionales Proxy-Header-Vertrauen (`AUTH_TRUST_PROXY_HEADERS`).
- **02.03.2026**: Sprach- und Benennungsregel präzisiert: UI und Code-Kommentare auf Deutsch, interne Komponenten- sowie Routen-/URL-Benennung auf Englisch.
- **02.03.2026**: Umsetzung abgeschlossen: interne Routenpfade und Komponenten-Namen auf Englisch standardisiert (`/sessions`, `/disciplines`, `/statistics`, `/goals`, `/shot-routines`, `/admin/users`), ohne Altpfad-Redirects.
