# Technische Rahmenbedingungen — Verbindliche Regeln

Dieses Dokument definiert verbindliche technische Entscheidungen für das Projekt.
Diese Regeln dürfen nicht ohne explizite Überprüfung und Begründung geändert werden.

**Weitere verbindliche Constraint-Dokumente:**
- Code-Stil, TypeScript, Zod, Testing: @docs/code-conventions.md
- Datenmodell, Env-Vars, Disziplinen, Ergebniserfassung: @docs/data-model.md

## Index

- **Hosting / Entwicklungsumgebung** — Docker Compose (dev/prod), TrueNAS-portabel, Node.js 20 LTS
- **Persistenz** — PostgreSQL + Named Volumes, Upload-Volume `/app/uploads`, Dateinamen als UUID
- **Datenbank-Migrationen** — Prisma Migrate deploy beim Start, P3009-Recovery-Script, kein Datenverlust
- **Tech Stack + Prisma 7** — Verbindliche Versionen; Prisma 7 breaking changes (Client-Pfad, Adapter, Config)
- **Daten- und Aktionsarchitektur** — Server Actions, Zod, useActionState, serverseitige Konsistenzregeln
- **Authentifizierung & Sicherheit + DoS-Schutz** — NextAuth v4, bcrypt, Session-Invalidierung, Rate-Limits
- **Linting + Dateistruktur** — ESLint v9 Flat Config, Prettier, verbindliche Verzeichnisstruktur
- **Modularität & Wartbarkeit** — Dateigrössen-/Split-Regel, Props-Budget, Feature-Struktur, Duplikationsregel
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

## Linting & Formatierung

### Tools

| Tool     | Zweck                        | Konfigurationsdatei  |
| -------- | ---------------------------- | -------------------- |
| ESLint   | Code-Qualität, Fehler finden | `eslint.config.mjs`  |
| Prettier | Code-Formatierung            | `.prettierrc`        |

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
- **Kein Auto-Fix beim Commit** (kein Husky/lint-staged — zu viel Setup-Aufwand)
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
- Nicht-triviale Bereiche werden in einen Feature-Unterordner gruppiert:

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
- Bewusste Duplikate müssen mit kurzem Kommentar begründet werden.

### 6) Refactor-Sicherheitsnetz

- Struktur-Refactors dürfen kein Verhalten ändern.
- Pflicht vor Merge: `npm run lint` und `npm run test` grün.
- Bei UI-Refactors ist die visuelle Konsistenz (Layout/Alignment) manuell zu prüfen.

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
   - Boolesche und Modus-Auswahlen nutzen ein konsistentes, klickbares Row-Muster.
   - Das gilt auch für "Leistungsziel erreicht", "Probe/Wertung" und analoge Umschalter.
3. **Konsistente Flows für Anlegen und Löschen/Archivieren**:
   - "Neu anlegen"-Aktionen folgen durchgängig demselben Muster (Bezeichnung, Platzierung, Route `/.../new`).
   - Destruktive Aktionen verwenden immer denselben Bestätigungsdialog-Stil inkl. klarer Folgenbeschreibung.
4. **Mobil ist gleichwertig, nicht reduziert**:
   - Navigation und zentrale Aktionen bleiben auf Mobilgeräten textlich verständlich.
   - Das Interaktionsverhalten ist auf Desktop und Mobil konsistent.
5. **Detailnavigation folgt dem Einheiten-Muster (Referenz)**:
   - Detailseiten nutzen eine obere Action-Leiste rechts und darunter die inhaltlichen Metadaten.
   - Aktionsreihenfolge: zuerst fachliche/sekundäre Aktionen, danach destruktive Aktion, "Zurück" am Ende.
   - Dieses Muster gilt durchgängig für Einheiten, Ziele, Abläufe und Disziplinen.
6. **Listen-/Detail-Flow ist einheitlich**:
   - Verwaltungslisten zeigen kompakte Karten; die ganze Karte öffnet die jeweilige Detailseite.
   - Zusätzliche "Details/Anzeigen"-Buttons in Listen werden vermieden.
7. **Reine Icon-Aktionen ohne Outline**:
   - Reine Icon-Buttons verwenden `ghost` (borderlos), nicht `outline`.
   - `outline` ist für textliche oder gemischte (Icon+Text) Aktionen vorgesehen.
8. **Terminologie in der UI**:
   - In nutzerseitigen Texten wird "Probe" verwendet (nicht "Probeschuss"), z.B. "Probe-Serie".

---

## App-Name

**Treffsicher** — Docker Image: `treffsicher`, App-Port: `3000`

---

## Datensicherung & Import

- **Backup**: TrueNAS-seitig via Volume-Snapshots — kein app-seitiger Mechanismus nötig
- **Import**: Kein Massenimport von Bestandsdaten; einzige Ausnahme ist der manuelle Meyton-PDF-Import pro einzelner Einheit

---

## Betrieb & Fehlerfälle (verbindlich)

- Betriebsdokumentation liegt in `docs/production-deploy-truenas.md`.
- Für kritische Fehlerfälle (DB nicht erreichbar, Migration fehlgeschlagen, Upload-Volume nicht verfügbar, fehlende Secrets) gibt es dokumentierte Diagnose- und Wiederanlauf-Schritte.
- Nutzer erhalten in der UI klare deutsche Fehlermeldungen; technische Details bleiben im Server-Log.
- Wiederherstellbarkeit von Datenbank **und** Uploads muss regelmässig praktisch geprüft werden (Restore-Test).

---

## Sprache

- **UI-Sprache**: Deutsch
- **Code-Sprache (Identifier)**: Englisch (Variablennamen, Funktionsnamen, Komponenten-Namen, Dateinamen, Routen/URL-Segmente)
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

- **06.03.2026**: Code Conventions + Testing nach `docs/code-conventions.md` ausgelagert. Datenmodell, Env-Vars, Disziplinen, Ergebniserfassung nach `docs/data-model.md` ausgelagert. Dieses Dokument enthält nur noch Infrastruktur-, Architektur- und UI-Regeln.
- **05.03.2026**: Test- und Kommentierungsregeln präzisiert.
- **05.03.2026**: Neue verbindliche Modularitätsregeln ergänzt.
- **03.03.2026**: Navigations- und Flow-Regeln verbindlich präzisiert.
- **03.03.2026**: Verbindliche Konsistenzregeln ergänzt.
- **02.03.2026**: DoS-Härtung dokumentiert.
- **02.03.2026**: Login-Rate-Limit weiter gehärtet.
- **02.03.2026**: Sprach- und Benennungsregel präzisiert.
