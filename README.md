# Treffsicher

Trainingsunterstützungs-App für Schiesssportler. Trainingstagebuch, Ergebniserfassung, Mentaltraining und Statistiken in einer Web-App (PWA ist als späterer Schritt geplant).

---

## Lokale Entwicklung

### Voraussetzungen

- [Docker](https://www.docker.com/) + Docker Compose v2.22+
- Optional: Node.js 20+ (nur wenn `npm`/Prisma-Befehle lokal statt im Container laufen sollen)

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

**2. App mit Watch starten**

```bash
docker compose -f docker-compose.dev.yml up --watch
```

Der Container-Start führt automatisch `prisma migrate deploy`, `prisma db push` und `prisma generate` aus.
Standarddisziplinen und der erste Admin-Account werden beim ersten Request automatisch angelegt (Startup-Initialisierung).

Die App läuft unter [http://localhost:3000](http://localhost:3000).

Beim ersten Request wird die Startup-Initialisierung ausgeführt (via `src/lib/startup.ts`):

- Standarddisziplinen werden angelegt, falls sie fehlen
- der erste Admin-Account wird angelegt, falls noch keiner existiert

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
# Danach: App-Start erneut ausführen (Schritt 2)
```

Hinweis: Nach `down -v` sind alle Nutzerdaten neu aufgebaut. Falls im Browser noch eine alte Session liegt, einmal neu einloggen (ggf. Cookies löschen), damit keine veraltete `userId` verwendet wird.

### Ab dem zweiten Start

```bash
docker compose -f docker-compose.dev.yml up --watch
```

Keine weiteren Initialisierungsschritte nötig (ausser nach `down -v`).

### Docker Compose Watch

Der Dev-Workflow nutzt [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) für automatische Reaktion auf Dateiänderungen:

| Datei / Pfad           | Aktion         | Effekt                                                                 |
| ---------------------- | -------------- | ---------------------------------------------------------------------- |
| `src/**`               | Bind-Mount HMR | Next.js Hot-Reload (kein Compose-Watch-Eintrag)                        |
| `prisma/schema.prisma` | `restart`      | App-Container startet neu, `prisma db push` + `prisma generate` laufen |
| `next.config.ts`       | `restart`      | App-Container startet neu                                              |
| `package.json`         | `rebuild`      | Image neu gebaut (npm ci), Container neu gestartet                     |
| `package-lock.json`    | `rebuild`      | Wie `package.json`                                                     |

Der Container-Start führt `prisma migrate deploy && prisma db push && prisma generate && npm run dev` aus.

---

## Schemaänderungen

In der laufenden Entwicklung sind keine manuellen Schritte nötig:
Änderungen an `prisma/schema.prisma` triggern automatisch einen Container-Restart, dabei werden Schema (`db push`) und Prisma-Client aktualisiert.

Wenn eine Schemaänderung ins Repository soll, danach eine Migration erzeugen und committen:

```bash
docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name beschreibender-name
```

---

## Qualitätschecks

Vor jedem Commit müssen diese drei Befehle fehlerfrei durchlaufen.
Container-basiert (ohne lokales `npm ci`):

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run lint
docker compose -f docker-compose.dev.yml run --rm app npm run format:check
docker compose -f docker-compose.dev.yml run --rm app npm run test
```

Formatierung automatisch korrigieren:

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run format
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
| `PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS` | Aktiviert automatische Recovery für fehlgeschlagene Migrationen beim Start | `true` |
| `PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS` | Erlaubt Fallback für unbekannte fehlgeschlagene Migrationen (`--rolled-back`) | `false` |

**Entwicklung**: Werte sind direkt in `docker-compose.dev.yml` gesetzt — für den oben beschriebenen Container-Workflow ist keine `.env` nötig.

**Optional (lokale Prisma-CLI):** Wenn Prisma-Befehle lokal ausgeführt werden sollen:

```bash
npm ci
export DATABASE_URL=postgresql://treffsicher:treffsicher@localhost:5432/treffsicher
```

**Produktion**: `.env`-Datei anlegen (aus `.env.example` kopieren) und alle Werte ausfüllen.

```bash
cp .env.example .env
# .env editieren und echte Werte eintragen
```

---

## Meyton-PDF-Import (Sicherheit)

Der URL-Import für Meyton-PDFs ist bewusst eingeschränkt:

- Nur `http://` und `https://`
- Keine Redirects (`3xx` wird abgebrochen)
- Keine lokalen/privaten Ziele (z.B. `localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `fc00::/7`)
- Bei Hostnamen wird zusätzlich die DNS-Auflösung geprüft (keine private Ziel-IP erlaubt)
- Response muss ein PDF liefern (`Content-Type`)
- Datei wird als PDF plausibilisiert (`%PDF-` Header + `%%EOF` Marker)

---

## Produktions-Deployment

```bash
docker compose -f docker-compose.prod.yml up -d
```

Erfordert eine ausgefüllte `.env`-Datei (siehe Abschnitt oben).
Migrationen laufen automatisch beim App-Start (`prisma migrate deploy`).
Wenn `migrate deploy` fehlschlägt und ein P3009-Fall vorliegt, versucht das Startscript eine automatische Recovery
für bekannte sichere Migrationsfälle und startet danach `migrate deploy` erneut.
Der erste Admin wird beim ersten Start aus `ADMIN_EMAIL` + `ADMIN_PASSWORD` angelegt.

---

## Projektstruktur

```
src/
├── app/              # Next.js App Router (Seiten, Layouts)
│   ├── (auth)/       # Login (nicht geschützt)
│   └── (app)/        # Geschützte Seiten (Proxy prüft Login)
├── proxy.ts          # Route-Schutz (Next.js Proxy + NextAuth)
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
