# Treffsicher

Trainingsunterstützungs-App für Schiesssportler. Trainingstagebuch, Ergebniserfassung, Mentaltraining und Statistiken in einer Web-App (PWA-fähig).

---

## Lokale Entwicklung

### Voraussetzungen

- [Docker](https://www.docker.com/) + Docker Compose v2.22+
- Node.js 20+ (für Prisma-CLI-Befehle, die lokal ausgeführt werden)

### Erste Inbetriebnahme

**1. Datenbank starten**

```bash
docker compose -f docker-compose.dev.yml up db -d
```

Warten bis die DB bereit ist — Status prüfen:

```bash
docker compose -f docker-compose.dev.yml ps
# "db" sollte "healthy" zeigen
```

**2. Initiale Migration erstellen**

```bash
npx prisma migrate dev --name init
```

Erstellt `prisma/migrations/` und wendet das Schema auf die DB an. Erzeugt ausserdem den Prisma-Client unter `src/generated/prisma/`.

**3. Standarddisziplinen anlegen**

```bash
npx prisma db seed
```

Legt die 5 vorinstallierten Disziplinen (Luftpistole, Luftgewehr etc.) in der DB an.

**4. App mit Watch starten**

```bash
docker compose -f docker-compose.dev.yml up --watch
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

Beim ersten Start wird automatisch ein Admin-Account angelegt (via `src/lib/startup.ts`).
Die Credentials kommen aus den Umgebungsvariablen in `docker-compose.dev.yml`:

| Variable         | Wert in dev         |
| ---------------- | ------------------- |
| `ADMIN_EMAIL`    | `admin@example.com` |
| `ADMIN_PASSWORD` | `admin-passwort-12` |

Mit diesen Daten unter [http://localhost:3000/login](http://localhost:3000/login) einloggen.

### Stoppen

```bash
docker compose -f docker-compose.dev.yml down
```

Daten (Datenbank, Uploads) bleiben in den Docker Volumes erhalten.

Für einen vollständigen Reset inkl. Datenverlust:

```bash
docker compose -f docker-compose.dev.yml down -v
# Danach: Migration und Seed erneut ausführen (Schritte 2–4)
```

### Ab dem zweiten Start

```bash
docker compose -f docker-compose.dev.yml up --watch
```

Migration und Seed müssen nicht wiederholt werden.

### Docker Compose Watch

Der Dev-Workflow nutzt [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) für automatische Reaktion auf Dateiänderungen:

| Datei / Pfad         | Aktion          | Effekt                                               |
| -------------------- | --------------- | ---------------------------------------------------- |
| `src/**`             | Bind-Mount HMR  | Next.js Hot-Reload (kein Watch nötig)                |
| `prisma/schema.prisma` | `sync+restart` | Container startet neu, `prisma generate` läuft auto. |
| `next.config.ts`     | `sync+restart`  | Container startet neu mit neuer Konfiguration        |
| `package.json`       | `rebuild`       | Image neu gebaut (npm ci), Container neu gestartet   |
| `package-lock.json`  | `rebuild`       | Wie `package.json`                                   |

Der Container-Start führt immer `prisma generate && npm run dev` aus — damit ist der Prisma-Client nach einem Watch-Neustart automatisch aktuell.

---

## Schemaänderungen

Nach jeder Änderung an `prisma/schema.prisma` eine neue Migration erstellen:

```bash
npx prisma migrate dev --name beschreibender-name
```

Die erzeugte Migrationsdatei wird ins Repository eingecheckt.

Wenn Compose Watch läuft, erkennt es die Schema-Änderung automatisch, startet den Container neu und regeneriert den Prisma-Client (`prisma generate`). Ein manueller Neustart ist nicht nötig.

---

## Qualitätschecks

Vor jedem Commit müssen diese drei Befehle fehlerfrei durchlaufen:

```bash
npm run lint         # ESLint
npm run format:check # Prettier
npm run test         # Vitest
```

Formatierung automatisch korrigieren:

```bash
npm run format
```

---

## Konfiguration (Umgebungsvariablen)

Alle Konfiguration erfolgt über Umgebungsvariablen. Die Vorlage liegt in `.env.example`.

| Variable          | Beschreibung                                                    | Beispiel                                     |
| ----------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL Connection String                                    | `postgresql://user:pass@db:5432/treffsicher` |
| `NEXTAUTH_SECRET` | Zufälliger Secret für Session-Verschlüsselung (min. 32 Zeichen) | `openssl rand -base64 32`                    |
| `NEXTAUTH_URL`    | Öffentliche URL der App                                         | `https://training.example.com`               |
| `UPLOAD_DIR`      | Pfad zum Upload-Verzeichnis im Container                        | `/app/uploads`                               |
| `ADMIN_EMAIL`     | E-Mail des ersten Admin-Accounts                                | `admin@example.com`                          |
| `ADMIN_PASSWORD`  | Passwort des ersten Admin-Accounts (min. 12 Zeichen)            | sicheres Passwort                            |

**Entwicklung**: Werte sind direkt in `docker-compose.dev.yml` gesetzt — keine `.env` nötig (ausser `DATABASE_URL` für Prisma-CLI-Befehle, die lokal ausgeführt werden).

**Produktion**: `.env`-Datei anlegen (aus `.env.example` kopieren) und alle Werte ausfüllen.

```bash
cp .env.example .env
# .env editieren und echte Werte eintragen
```

---

## Produktions-Deployment

```bash
docker compose -f docker-compose.prod.yml up -d
```

Erfordert eine ausgefüllte `.env`-Datei (siehe Abschnitt oben).
Migrationen laufen automatisch beim App-Start (`prisma migrate deploy`).
Der erste Admin wird beim ersten Start aus `ADMIN_EMAIL` + `ADMIN_PASSWORD` angelegt.

---

## Projektstruktur

```
src/
├── app/              # Next.js App Router (Seiten, Layouts)
│   ├── (auth)/       # Login (nicht geschützt)
│   └── (app)/        # Geschützte Seiten (Middleware prüft Login)
├── components/
│   ├── ui/           # shadcn/ui Basiskomponenten
│   └── app/          # App-spezifische Komponenten
└── lib/              # Geschäftslogik, Datenbankzugriff
    ├── db.ts          # Prisma Client Singleton
    ├── auth.ts        # NextAuth Konfiguration
    ├── disciplines/   # Disziplin-Logik
    ├── sessions/      # Einheiten-Logik, Berechnung
    └── stats/         # Statistik-Abfragen und Berechnungen
prisma/
├── schema.prisma      # Datenbankschema
├── migrations/        # Migrationsdateien (eingecheckt)
└── seed.ts            # Standarddisziplinen
docs/                  # Anforderungen und technische Dokumentation
```

---

## Tech Stack

| Bereich   | Technologie                |
| --------- | -------------------------- |
| Framework | Next.js 16 (App Router)    |
| Datenbank | PostgreSQL 15 + Prisma 7   |
| Auth      | NextAuth.js v4             |
| UI        | shadcn/ui + Tailwind CSS 4 |
| Charts    | Recharts                   |
| Tests     | Vitest                     |
| Container | Docker + Docker Compose    |
