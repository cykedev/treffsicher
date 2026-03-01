# Treffsicher — Schrittweiser Implementierungsplan

Dieser Plan beschreibt den Aufbau der Anwendung in Phasen. Jede Phase endet mit einer
Verifikation, die prüft ob alles funktioniert, bevor die nächste Phase beginnt.

**Verbindliche Referenzdokumente:**

- `docs/requirements.md` — Fachliche Anforderungen
- `docs/technical-constraints.md` — Technische Regeln (verbindlich)

**Grundregel**: Wenn ein Schritt im Widerspruch zu den Anforderungen oder technischen Regeln
steht, wird das zuerst geklärt. Code wird erst geschrieben, wenn die Basis stimmt.

---

## Phase 1 — Fundament ✅ abgeschlossen

**Ziel**: Eine lauffähige App mit Login, Disziplin-Verwaltung und minimaler Einheitserfassung.

### Schritt 1.1 — Abhängigkeiten installieren

```bash
# Produktions-Abhängigkeiten
npm install prisma @prisma/client @prisma/adapter-pg pg next-auth bcryptjs zod

# Entwicklungs-Abhängigkeiten
npm install --save-dev @types/bcryptjs @types/pg vitest @vitejs/plugin-react prettier dotenv
```

> **Hinweis Prisma 7**: `@prisma/adapter-pg` und `pg` werden für die Datenbankverbindung benötigt.
> `dotenv` braucht Prisma 7 für die CLI (Migrations-Commands), um `DATABASE_URL` aus `.env` zu lesen.

**Danach `package.json` prüfen**: Die Scripts müssen den Vorgaben aus `technical-constraints.md`
entsprechen (sind bereits korrekt nach Projektkorrektur).

---

### Schritt 1.2 — Docker-Infrastruktur

**Ziel**: Lokale Entwicklung vollständig via Docker Compose.

**Dateien anlegen:**

`Dockerfile` — Multi-Stage Build für die Next.js App:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma-Client und Migrations-Dateien müssen im Runner-Image vorhanden sein
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Uploads-Verzeichnis mit korrekten Rechten anlegen
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
USER nextjs
EXPOSE 3000
# prisma migrate deploy läuft automatisch beim Start — wendet ausstehende Migrationen an
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

`docker-compose.dev.yml` — Lokale Entwicklung mit Hot-Reload:

```yaml
services:
  app:
    build:
      context: .
      target: deps
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - uploads_data:/app/uploads
    environment:
      - DATABASE_URL=postgresql://treffsicher:treffsicher@db:5432/treffsicher
      - NEXTAUTH_SECRET=dev-secret-min-32-zeichen-lang-abc
      - NEXTAUTH_URL=http://localhost:3000
      - UPLOAD_DIR=/app/uploads
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=admin-passwort-12
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: treffsicher
      POSTGRES_PASSWORD: treffsicher
      POSTGRES_DB: treffsicher
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U treffsicher"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  uploads_data:
```

`docker-compose.prod.yml` — Produktion (PostgreSQL + App):

```yaml
services:
  app:
    image: treffsicher:latest
    build: .
    ports:
      - "3000:3000"
    volumes:
      - uploads_data:/app/uploads
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - UPLOAD_DIR=/app/uploads
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  uploads_data:
```

`.env.example` — Vorlage (nie echte Werte, wird ins Repository eingecheckt):

```
DATABASE_URL=postgresql://treffsicher:PASSWORT@db:5432/treffsicher
NEXTAUTH_SECRET=min-32-zeichen-zufaelliger-string-hier
NEXTAUTH_URL=https://training.example.com
UPLOAD_DIR=/app/uploads
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=sicheres-passwort-min-12-zeichen
# Für Prod-Docker-Compose:
POSTGRES_USER=treffsicher
POSTGRES_PASSWORD=PASSWORT
POSTGRES_DB=treffsicher
```

`.gitignore` prüfen — diese Einträge müssen vorhanden sein:

```
.env
.env.local
uploads/
node_modules/
.next/
```

---

### Schritt 1.3 — Prisma Schema

**Ziel**: Vollständiges Datenbankschema gemäss `technical-constraints.md` (Abschnitt
"Datenmodell (verbindlich)").

```bash
npx prisma init --datasource-provider postgresql
```

> **Hinweis Prisma 7**: Nach `prisma init` wird automatisch `prisma.config.ts` angelegt.
> Das `url`-Feld in `datasource db` muss entfernt werden — Prisma 7 liest die DB-URL direkt
> aus der Umgebungsvariable via `prisma.config.ts`.
> Der Generator braucht `output = "../src/generated/prisma"` damit der Client lokal liegt.

Danach `prisma/schema.prisma` vollständig schreiben mit allen Modellen:
`User`, `TrainingSession`, `Series`, `Wellbeing`, `Reflection`, `Prognosis`, `Feedback`,
`Attachment`, `Discipline`, `ShotRoutine`, `Goal`, `SessionGoal`.

Enums: `UserRole`, `SessionType`, `ScoringType`, `AttachmentType`.

**Erste Migration anlegen** (lokal, DB muss laufen):

```bash
docker compose -f docker-compose.dev.yml up db -d
npx prisma migrate dev --name init
```

Die Migration wird in `prisma/migrations/` gespeichert und eingecheckt.

---

### Schritt 1.4 — Prisma Client & Datenbankverbindung

**Datei**: `src/lib/db.ts`

Prisma Client als Singleton — verhindert zu viele Datenbankverbindungen bei
Next.js Hot-Reload in der Entwicklung. Prisma 7 erfordert den `@prisma/adapter-pg` Adapter:

```typescript
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

function createPrismaClient(): PrismaClient {
  // Pool verwaltet Datenbankverbindungen — wird einmal angelegt und wiederverwendet
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// In der Entwicklung hält Next.js Hot-Reload den Modul-Cache nicht vollständig zurück.
// Ohne den Global-Singleton würden bei jedem Hot-Reload neue Datenbankverbindungen aufgebaut.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
```

---

### Schritt 1.5 — NextAuth v4

**Ziel**: Login mit Email/Passwort. Kein E-Mail-Versand, kein Self-Service.

**Dateien**:

- `src/lib/auth.ts` — NextAuth Konfiguration (Credentials Provider)
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth API-Route
- `src/lib/auth-helpers.ts` — Hilfsfunktion `getAuthSession()` für Server Actions

**Startup-Logik**: `src/lib/startup.ts`
Wird beim App-Start aufgerufen. Legt ersten Admin an, wenn noch keiner existiert.
Verwendet `ADMIN_EMAIL` + `ADMIN_PASSWORD` aus Umgebungsvariablen.

In `src/app/layout.tsx` aufrufen (nur serverseitig ausführbar).

**Middleware**: `src/middleware.ts`
Schützt alle Routen unter `/(app)/` — Weiterleitung zu `/login` wenn nicht eingeloggt.

**Login-Seite**: `src/app/(auth)/login/page.tsx`
Formular mit Email + Passwort, Fehleranzeige bei ungültigen Daten.

---

### Schritt 1.6 — shadcn/ui Setup

```bash
npx shadcn@latest init
```

Folgende Basis-Komponenten installieren (bei Bedarf ergänzen):

```bash
npx shadcn@latest add button input label form card select textarea
```

shadcn/ui legt Dateien in `src/components/ui/` ab. Diese Dateien **nicht manuell editieren**.

---

### Schritt 1.7 — App-Layout & Navigation

**Routenstruktur** (Route Groups für klare Trennung):

```
src/app/
├── (auth)/               # Nicht-authentifizierte Seiten
│   └── login/
│       └── page.tsx
└── (app)/                # Geschützte Seiten (Middleware prüft Login)
    ├── layout.tsx         # Layout mit Navigation-Leiste
    ├── dashboard/
    │   └── page.tsx      # Startseite: letzte Einheiten, Schnellstatistik
    ├── einheiten/
    │   ├── page.tsx       # Tagebuch: alle Einheiten
    │   └── neu/
    │       └── page.tsx   # Neue Einheit erfassen
    └── disziplinen/
        ├── page.tsx       # Liste aller Disziplinen
        └── neu/
            └── page.tsx   # Neue Disziplin anlegen
```

Navigation (in `(app)/layout.tsx`): Links zu Dashboard, Tagebuch, Disziplinen.

---

### Schritt 1.8 — Disziplinen (CRUD + Seed)

**Ziel**: Standarddisziplinen sind vorhanden, eigene können hinzugefügt werden.

**Server Actions**: `src/lib/disciplines/actions.ts`

- `getDisciplines()` — Alle nicht-archivierten Disziplinen des Nutzers + System-Disziplinen
- `createDiscipline(formData)` — Neue Disziplin anlegen (Auth-Check → Zod → DB)
- `archiveDiscipline(id)` — Archivieren statt Löschen (userId-Check!)

**Seed-Script**: `prisma/seed.ts` — Legt Standarddisziplinen an wenn sie noch nicht existieren.

`prisma.config.ts` ergänzen (Prisma 7 liest Seed-Kommando aus der Config, nicht aus `package.json`):

```typescript
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",
},
```

> **Hinweis**: `tsx` statt `ts-node` — ist bereits als Dev-Abhängigkeit installiert und unterstützt
> ES Modules ohne zusätzliche Konfiguration.

Standarddisziplinen (aus `technical-constraints.md`):
| Name | Serien | Schuss/Serie | Wertung |
|---|---|---|---|
| Luftpistole | 4 | 10 | WHOLE |
| Luftgewehr | 4 | 10 | WHOLE |
| Luftgewehr (Zehntel) | 4 | 10 | TENTH |
| Luftpistole Auflage | 3 | 10 | TENTH |
| Luftgewehr Auflage | 3 | 10 | TENTH |

Alle mit `isSystem: true`, `ownerId: null`.

---

### Schritt 1.9 — Einheit erfassen (Minimalflow)

**Ziel**: Einheit anlegen mit Typ, Disziplin, Datum, Serien und Seriensummen.

**Server Actions**: `src/lib/sessions/actions.ts`

- `createSession(formData)` — Neue Einheit mit Serien anlegen

**Berechnungslogik**: `src/lib/sessions/calculateScore.ts`

```typescript
/**
 * Berechnet die Gesamtpunktzahl aus Serienwertungen.
 * Probeschuss-Serien (isPractice) fliessen nicht ins Ergebnis ein.
 */
export function calculateTotalScore(
  series: Array<{ scoreTotal: number; isPractice: boolean }>
): number
```

**Formular** (`src/app/(app)/einheiten/neu/page.tsx`):

1. Einheitentyp wählen (TRAINING / WETTKAMPF / TROCKENTRAINING / MENTAL)
2. Disziplin wählen (nur bei TRAINING / WETTKAMPF)
3. Datum + Uhrzeit
4. Serien eingeben (Anzahl kommt aus Disziplin-Konfiguration)
5. Je Serie: Seriensumme eingeben

Alle anderen Felder (Befinden, Reflexion, Prognose) kommen in Phase 3.

---

### Schritt 1.10 — Tagebuch (Einheitenliste)

**Datei**: `src/app/(app)/einheiten/page.tsx`

Zeigt alle eigenen Einheiten, neuste zuerst:

- Datum, Typ, Disziplin, Gesamtergebnis
- Link zur Detailansicht (wird in Phase 2 ausgebaut)

**Server Action / Query**: `src/lib/sessions/actions.ts`

- `getSessions()` — Alle Sessions des eingeloggten Nutzers, orderBy date desc

---

### Schritt 1.11 — Tests für Berechnungen

**Konfiguration**: `vitest.config.ts` im Projektroot:

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**Testdatei**: `src/lib/sessions/calculateScore.test.ts`
Tests gemäss Muster in `technical-constraints.md`:

- Summiert alle Serienwerte korrekt
- Ignoriert Probeschuss-Serien
- Gibt 0 zurück bei leerer Liste
- Zehntelwertung (z.B. 94.7 + 95.3 = 190.0)

---

### Verifikation Phase 1

Folgende Punkte manuell prüfen:

1. **Docker Compose starten**: `docker compose -f docker-compose.dev.yml up`
   - App erreichbar unter `http://localhost:3000`
   - Datenbank startet ohne Fehler
   - Migrationen laufen automatisch durch

2. **Login-Flow**:
   - `http://localhost:3000` leitet auf `/login` weiter (Middleware aktiv)
   - Login mit Admin-Credentials (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) funktioniert
   - Nach Login: Dashboard sichtbar

3. **Disziplinen**:
   - Alle 5 Standarddisziplinen in der Liste sichtbar
   - Neue Disziplin anlegen möglich
   - Fehler-Feedback bei ungültigen Eingaben

4. **Einheit erfassen**:
   - Neue Einheit anlegen: Typ wählen → Disziplin wählen → Serien eingeben → Speichern
   - Einheit erscheint im Tagebuch
   - Gesamtergebnis korrekt berechnet

5. **Tests**:

   ```bash
   npm run test
   # Muss grün sein
   ```

6. **Lint + Format**:
   ```bash
   npm run lint
   npm run format:check
   ```

---

## Phase 2 — Ergebnisse & Uploads ✅ abgeschlossen

**Ziel**: Vollständige Ergebniserfassung, Datei-Uploads, Basis-Statistiken.

### Schritt 2.1 — Erweiterte Ergebniserfassung

- **Einzelschuss-Eingabe**: Optional aktivierbar pro Einheit
  - Bei Aktivierung: pro Schuss ein Eingabefeld (Anzahl kommt aus Disziplin, kann aber pro Serie angepasst werden)
  - Seriensumme wird automatisch berechnet
  - Werte werden in `Series.shots` (Json-Feld) gespeichert
- **Flexible Serienanzahl**: Die Disziplin definiert Standardwerte — im Formular kann die Anzahl der Serien frei erhöht oder verringert werden (min. 1). Serien werden per Button hinzugefügt oder entfernt.
- **Flexible Schussanzahl pro Serie**: Im Einzelschuss-Modus kann die Schussanzahl pro Serie abweichend vom Disziplin-Standard gesetzt werden (1–99). Statistiken und Gesamtergebnisse basieren immer auf den tatsächlich erfassten Rohwerten — keine falschen Berechnungen durch abweichende Schusszahlen.
- **Zehntelwertung**: Dezimal-Input, `Decimal(5,1)` in DB
- **Probeschuss-Serien**: Separat erfassbar, fliessen nicht ins Gesamtergebnis
- **Ausführungsqualität** je Serie: optionaler Schieberegler 1–5

### Schritt 2.2 — Einheit-Detailansicht

`src/app/(app)/einheiten/[id]/page.tsx`

Zeigt alle Daten der Einheit:

- Typ, Disziplin, Datum, Ort
- Serien mit Einzelwerten (falls erfasst) und Summen
- Gesamtergebnis

### Schritt 2.3 — Datei-Uploads

Paket installieren: `npm install sharp` (für Bildverarbeitung/Validierung)

**Upload-Logik**: `src/lib/uploads/upload.ts`

- Validierung: Typ (JPEG/PNG/WebP/PDF), Grösse (max 10 MB)
- UUID-Dateiname generieren (kein Originalname im Filesystem)
- Speichern im `UPLOAD_DIR` (`/app/uploads`)
- Pfad in DB speichern (`Attachment.filePath`)

**Server Action**: `src/lib/uploads/actions.ts`

- `uploadAttachment(formData, sessionId)` — Upload + DB-Eintrag
- `deleteAttachment(id)` — Datei löschen + DB-Eintrag löschen

**UI**: Upload-Bereich in der Einheit-Detailansicht, Bildvorschau.

### Schritt 2.4 — Basis-Statistiken

`src/app/(app)/statistiken/page.tsx`

Pakete: `npm install recharts`

**Ansichten (Phase 2)**:

1. **Ergebnisübersicht**: Gesamtringe pro Einheit über Zeit (LineChart)
   - Gleitender Durchschnitt (5 Einheiten) als zweite Linie
   - Filter: nur Training / nur Wettkampf / beides
2. **Serienwertungen**: Min/Max/Durchschnitt je Serienposition (BarChart)

**Zeitraum-Picker**: Von–Bis Datum, Voreinstellungen: letzte 4 Wochen, letzter Monat, alles.

**Berechnungslogik** (mit Tests):

- `src/lib/stats/calculateMovingAverage.ts` — gleitender Durchschnitt
- `src/lib/stats/calculateSeriesStats.ts` — Min/Max/Avg je Serie

### Verifikation Phase 2

1. Vollständige Einheit erfassen: Einzelschüsse, Zehntelwertung, Probeschüsse
2. Bild hochladen (z.B. Schussbild), in Detailansicht sichtbar
3. Statistik: Ergebniskurve der letzten Einheiten korrekt angezeigt
4. Filter (Training/Wettkampf) filtert korrekt
5. Alle neuen Tests grün: `npm run test`

---

## Phase 3 — Mentaltraining ✅ abgeschlossen

**Ziel**: Einheiten bearbeiten & löschen, Befinden-Tracking, Reflexion, Prognose/Feedback, Schuss-Ablauf.

### Schritt 3.0 — Disziplinen: revalidatePath für Einheit-Seiten

**Problem**: Nach dem Anlegen/Bearbeiten/Archivieren einer Disziplin kann der Next.js Router Cache
dazu führen, dass `/einheiten/neu` und `/einheiten/[id]/bearbeiten` veraltete Disziplin-Listen anzeigen.

**Lösung**: In allen Disziplin-CRUD-Actions (`createDiscipline`, `updateDiscipline`, `archiveDiscipline`)
zusätzlich `revalidatePath("/einheiten", "layout")` aufrufen — invalidiert alle Einheit-Seiten.

---

### Schritt 3.1 — Einheit bearbeiten & löschen

**Ziel**: Bestehende Einheiten korrigieren und bei Bedarf löschen können.

**Server Actions** in `src/lib/sessions/actions.ts`:

- `updateSession(id, formData)` — Basisdaten (Typ, Datum, Ort, Disziplin) und Serien aktualisieren.
  Serien werden vollständig ersetzt (alle alten löschen, neue anlegen) — einfacher als Diff.
  Auth-Check + `userId`-Filter (nur eigene Einheiten).
- `deleteSession(id)` — Einheit inkl. aller Serien und Attachments löschen.
  Attachment-Dateien vom Disk entfernen (wie in `deleteAttachment`).
  Auth-Check + `userId`-Filter.

**Neue Route**: `src/app/(app)/einheiten/[id]/bearbeiten/page.tsx`

Server Component — lädt die Einheit via `getSessionById`, zeigt vorausgefülltes Formular.
`notFound()` wenn Einheit nicht gefunden.

**Formular**: Wiederverwendung von `EinheitForm` mit neuem `initialData`-Prop.
Vorausgefüllte Werte: Typ, Disziplin, Datum, Ort, Serien (inkl. Einzelschüsse und Ausführungsqualität).

**Löschen**: Button in der Detailansicht (`/einheiten/[id]`), mit Bestätigungsdialog (native `confirm` oder einfaches Inline-Confirm-Pattern ohne externe Abhängigkeit).
Nach dem Löschen: Redirect zu `/einheiten`.

**Detailansicht erweitern**: Link "Bearbeiten" → `/einheiten/[id]/bearbeiten`.

---

### Schritt 3.2 — Disziplin bearbeiten

**Ziel**: Bestehende Disziplinen korrigieren können (Name, Serien, Schuss/Serie, Wertungsart).

**Einschränkungen**:

- System-Disziplinen (`isSystem: true`) können **nicht** bearbeitet werden (nur eigene Disziplinen)
- Die Wertungsart (`scoringType`) einer Disziplin, die bereits in Einheiten verwendet wird, kann nicht mehr geändert werden — sonst würden gespeicherte Werte falsch interpretiert

**Server Action** in `src/lib/disciplines/actions.ts`:

- `updateDiscipline(id, formData)` — Name, `seriesCount`, `shotsPerSeries`, `practiceSeries`, `scoringType` aktualisieren
  Auth-Check + `userId`-Filter (nur eigene, nicht-archivierte Disziplinen)
  Falls Disziplin bereits in Sessions verwendet: `scoringType`-Änderung ablehnen (Fehlermeldung)

**Neue Route**: `src/app/(app)/disziplinen/[id]/bearbeiten/page.tsx`

Server Component — lädt die Disziplin via `getDisciplineById`, zeigt vorausgefülltes Formular.
`notFound()` wenn Disziplin nicht gefunden oder nicht dem Nutzer gehört.

**Disziplinenliste erweitern**: Link/Button "Bearbeiten" bei eigenen Disziplinen (bei System-Disziplinen ausgeblendet).

---

### Schritt 3.3 — Befinden-Tracking

Optional vor jeder Einheit, 4 Schieberegler (0–10):

- Schlaf, Energie, Stress, Motivation

**Modell**: `Wellbeing` (1:1 mit TrainingSession, optional)
Wird beim Anlegen der Einheit oder danach erfasst.

**UI-Pattern (view/edit)**: `WellbeingSection` ist ein Client Component das den Zustand verwaltet:
- Kein Datensatz: Leerzustand + "Befinden erfassen"-Button
- Datensatz vorhanden: Leseanzeige (4 Balken mit Werten) + "Bearbeiten"-Button
- Bearbeitungsmodus: `WellbeingForm` inline + "Abbrechen"-Button
- Nach Speichern: `router.refresh()` synchronisiert Server-Zustand, Rückkehr zur Leseanzeige

### Schritt 3.4 — Reflexion nach der Einheit

Optional nach jeder Einheit:

- Freie Beobachtungen
- Erfolgsmonitoring: "Heute ist mir klargeworden, dass …"
- Lernfrage: "Was kann ich tun, um …?"
- Schuss-Ablauf eingehalten? (Boolean + optionale Notiz)

**UI-Pattern (view/edit)**: `ReflectionSection` — analoges Muster wie `WellbeingSection`.
Lesemodus zeigt nur ausgefüllte Felder + Ablauf-Status.

### Schritt 3.5 — Prognose & Feedback

Gilt für Wettkampf und fokussiertes Training (aus requirements.md).

**Prognose (vor der Einheit)**:

- 7 Dimensionen Selbsteinschätzung (Schieberegler 0–100)
- Ergebnisprognose (Ringe + saubere Schüsse)
- Leistungsziel (Freitext)

**Feedback (nach der Einheit)**:

- Tatsächlicher Stand in gleichen 7 Dimensionen
- Erklärungstext
- Leistungsziel erreicht? (Boolean + Text)
- Fortschritte, Five Best Shots, Was lief gut, Aha-Erlebnisse

**Automatischer Vergleich**: Prognose vs. tatsächlicher Stand als eigene Card, nur wenn beide vorhanden. Wird vom Server Component gerendert und nach `router.refresh()` aktualisiert.

**UI-Pattern (view/edit)**: `PrognosisSection` und `FeedbackSection` — analoges Muster wie `WellbeingSection`. Lesemodus zeigt 7-Dimensionen-Übersicht als Balkenchart + optionale Textfelder.

### Schritt 3.6 — Schuss-Ablauf

`src/app/(app)/schuss-ablauf/page.tsx`

Editierbares Dokument (kein Versionsverlauf — bewusste Entscheidung):

- Geordnete Liste von Schritten
- Jeder Schritt: Titel + optionale Beschreibung
- Drag-and-Drop Neuordnung (oder einfacher Move-Up/Move-Down)

**Mehrere Abläufe möglich** (z.B. je Disziplin): Liste aller Abläufe, einer aktiv.

**Daten**: `ShotRoutine.steps` als Json-Array, kein Versionsverlauf.

### Schritt 3.7 — Statistiken erweitern

**Normalisierung**: Alle Ergebnis-Statistiken basieren auf `avgPerShot` (Ringe pro Schuss), nicht auf absoluten Gesamtringen. Grund: Einheiten mit abweichender Serienzahl sollen fair verglichen werden können.

- `avgPerShot = Summe aller Wertungsserien-Ergebnisse / Gesamtschusszahl` (Probeschüsse ausgeschlossen)
- Schusszahl pro Serie: aus `shots`-Array (wenn Einzelschüsse erfasst), sonst Disziplin-Standard

**Hochrechnung** (optionaler Anzeigemodus, nur bei gewählter Disziplin):
- `Hochrechnung = avgPerShot × shotsPerSeries × seriesCount`
- Zehntelwertung: 1 Dezimalstelle; Ganzringwertung: ganzzahlig gerundet

**Disziplin-Filter**: Client-seitiger Filter — verhindert das Mischen unterschiedlicher Disziplinen in Charts. `availableDisciplines` wird aus den geladenen Sessions abgeleitet (kein separater DB-Query).

**Neue Statistik-Ansichten**:
- **Befinden-Korrelation**: `avgPerShot` vs. Befinden-Dimensionen (ScatterChart)
- **Schussqualität vs. Ringe**: `scorePerShot` (Ringe/Schuss je Serie) vs. Ausführungsqualität (ScatterChart)

### Schritt 3.8 — Schuss-Histogramm (Detailansicht + Statistik)

**Neue Komponente `src/components/app/ShotHistogram.tsx`** (Client Component):
- Props: `shots: string[]`, `isDecimal: boolean`
- Recharts `BarChart`, X-Achse: 10 links → 0 rechts, alle 11 Buckets immer sichtbar
- Balkenfarbe grün (10) bis rot (0) via `Cell`-Komponente, Buckets mit 0 Treffern transparent

**`src/app/(app)/einheiten/[id]/page.tsx`**:
- `allShots` aus allen Serien sammeln (nutzt bestehende `parseShotsJson`)
- Card "Schussverteilung" unterhalb Ergebnis-Card, nur wenn `hasScoring && hasShots`

**`getShotDistributionData(filters)` + `ShotDistributionPoint`** in `src/lib/stats/actions.ts`:
- Pro Einheit: Schüsse aller Wertungsserien sammeln, in Buckets zählen, auf Prozent normalisieren
- Einheiten ohne Einzelschüsse werden übersprungen
- Gibt `ShotDistributionPoint[]` mit Feldern `r0`–`r10` (Prozentsatz) zurück

**`StatistikCharts.tsx`** — neue Card "Schussverteilung im Zeitverlauf":
- Recharts `AreaChart` mit 11 gestapelten `Area`-Komponenten (`stackId="rings"`)
- Farben: rot (r0) bis grün (r10); X-Achse: Datum, Y-Achse: 0–100 %
- Tooltip zeigt nur Buckets mit Wert > 0

**Betroffene Dateien**: `ShotHistogram.tsx` (neu), `einheiten/[id]/page.tsx`, `lib/stats/actions.ts`, `StatistikCharts.tsx`, `StatistikChartsWrapper.tsx`, `statistiken/page.tsx`

**Schema-Migration**: Keine — `Series.shots` (Json) bereits vorhanden.

### Verifikation Phase 3

1. Einheit bearbeiten: Typ, Datum, Serien ändern → gespeichert und in Detailansicht sichtbar
2. Einheit löschen: Bestätigung → Einheit weg, Attachments vom Disk entfernt
3. Disziplin bearbeiten: Name und Serienkonfiguration ändern → gespeichert und in Liste sichtbar
4. System-Disziplinen haben keinen Bearbeiten-Button
5. Wertungsart-Änderung bei verwendeter Disziplin → Fehlermeldung
3. Befinden vor einer Einheit erfassen, in Statistik sichtbar
4. Reflexion nach einer Einheit ausfüllen, gespeichert und lesbar
5. Prognose + Feedback für eine Einheit durchspielen, Vergleich angezeigt
6. Schuss-Ablauf anlegen, Schritte ordnen, speichern

---

## Phase 3.9 — UI-Überarbeitung ✅ abgeschlossen

**Ziel**: Konsistentes Dark-Mode-Design, Lucide-Icons, shadcn-Komponenten, lesbare Charts.

- Dark Mode erzwungen (`class="dark"` auf `<html>`, kein Toggle)
- Schatten entfernt (Cards nur noch durch Hintergrundfarbe + Border unterschieden)
- Lucide-Icons in Navigation, Dashboard, Detailansicht und Disziplinen
- Schieberegler mit `@radix-ui/react-slider` (eigene `Slider`-Komponente) — native range inputs ersetzt
- Statistik-Charts in 3 Tabs (Verlauf / Befinden / Qualität & Schüsse)
- ShotHistogram auf shadcn `ChartContainer` umgestellt
- Farbige Typ-Badges (blau = Training, amber = Wettkampf, grün = Trockentraining, lila = Mental)
- `QualityDots`: immer 5 Kreise, konsistente Spaltenbreite
- Schüsse-Spalte in Ergebnis-Tabelle nur rendern wenn Einzelschüsse erfasst wurden

---

## Phase 4 — Tiefe & Ziele

**Ziel**: Saisonziele, erweiterte Statistiken, PDF/CSV-Export.

### Schritt 4.1 — Saisonziele

`src/app/(app)/ziele/page.tsx`

- Ziel anlegen: Titel, Beschreibung, Typ (RESULT / PROCESS), Zeitraum (Von–Bis)
- Einheiten mit Zielen verknüpfen (Many-to-Many via SessionGoal)
- Übersicht: wie viele Einheiten einem Ziel gewidmet?

### Schritt 4.2 — Radarchart (7 Dimensionen)

Zeigt die Selbsteinschätzung in den 7 Dimensionen über Zeit:

- Prognose-Werte vs. tatsächliche Feedback-Werte
- `recharts` RadarChart

### Schritt 4.3 — PDF/CSV-Export

Pakete: `npm install @react-pdf/renderer` (PDF) oder `jspdf`

**Einzelne Einheit exportieren**:

- PDF: Alle Daten der Einheit (Serien, Reflexion, Prognose/Feedback)
- Gedacht zur Weitergabe an Trainer

**Zeitraum-Export (CSV)**:

- Ergebnisse aller Einheiten in einem Zeitraum
- Datum, Typ, Disziplin, Gesamtergebnis, Serien

### Verifikation Phase 4

1. Saisonziel anlegen, Einheiten verknüpfen, Übersicht korrekt
2. Radarchart mit mehreren Einheiten mit Prognose/Feedback
3. PDF-Export einer Einheit, lesbar im Browser

---

## Phase 5 — Vereinsbetrieb & Admin

**Ziel**: Admin-Bereich, Nutzerverwaltung, Offline-Vorbereitung.

### Schritt 5.1 — Admin-Bereich

`src/app/(app)/admin/` (nur für ADMIN-Rolle zugänglich — Middleware/Middleware prüft)

**Funktionen**:

- Nutzerliste anzeigen (ohne Passwörter)
- Neuen Nutzer anlegen (Email + temporäres Passwort)
- Nutzer deaktivieren (`isActive: false`) — keine Datenlöschung
- Passwort zurücksetzen (neues temporäres Passwort)
- System-Disziplinen verwalten (für alle Nutzer sichtbar)

### Schritt 5.2 — Offline-Unterstützung (PWA)

Paket: `npm install next-pwa`

Service Worker für:

- Einheiten auch ohne Verbindung erfassen (in IndexedDB zwischenspeichern)
- Automatische Synchronisation wenn Verbindung wieder da

Dies ist die komplexeste Phase — ausführlich testen auf mobilen Geräten.

### Verifikation Phase 5

1. Admin kann Nutzer anlegen, Nutzer kann sich einloggen
2. Nutzer sieht ausschliesslich eigene Daten (andere Nutzer anlegen und prüfen)
3. Admin-Bereich für normale Nutzer nicht zugänglich (403/Redirect)
4. PWA: Einheit im Offline-Modus erfassen, nach Reconnect synchronisiert

---

## Entwicklungsworkflow (gilt für alle Phasen)

### Vor jeder Schemaänderung

1. Änderung in `prisma/schema.prisma` vornehmen
2. Migration anlegen: `npx prisma migrate dev --name beschreibender-name`
3. Migration-Datei einzuchecken (liegt in `prisma/migrations/`)
4. **Keine destructiven Migrationen** ohne Kommentar

### Vor jedem Commit

```bash
npm run lint         # Muss fehlerfrei sein
npm run format:check # Muss fehlerfrei sein
npm run test         # Muss grün sein
```

### Beim Feststellen von Widersprüchen

Wenn Code oder Entscheidungen den Anforderungen (`docs/requirements.md`) oder den
technischen Regeln (`docs/technical-constraints.md`) widersprechen:

1. Abweichung dokumentieren
2. Mit dem Entwickler klären
3. Erst dann implementieren

---

## Übersicht: Welche Dateien entstehen in Phase 1

```
/
├── Dockerfile
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
├── .prettierrc
├── vitest.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       └── 20xx_init/
├── src/
│   ├── middleware.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── auth-helpers.ts
│   │   ├── startup.ts
│   │   ├── disciplines/
│   │   │   └── actions.ts
│   │   └── sessions/
│   │       ├── actions.ts
│   │       ├── calculateScore.ts
│   │       └── calculateScore.test.ts
│   ├── components/
│   │   └── ui/          # shadcn/ui (auto-generiert)
│   └── app/
│       ├── layout.tsx
│       ├── (auth)/
│       │   └── login/page.tsx
│       ├── (app)/
│       │   ├── layout.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── einheiten/
│       │   │   ├── page.tsx
│       │   │   └── neu/page.tsx
│       │   └── disziplinen/
│       │       ├── page.tsx
│       │       └── neu/page.tsx
│       └── api/
│           └── auth/[...nextauth]/route.ts
```
