# Treffsicher

Trainings-App für Schiesssportler (Tagebuch, Ergebniserfassung, Mentaltraining, Statistiken).
Self-hosted, Einzelnutzer bis Vereinsbetrieb, ausschliesslich Dark Mode, ausschliesslich Deutsch in der UI.

**Verbindliche Referenzdokumente** (bei Widersprüchen: Docs gewinnen):
- Fachlich: `docs/requirements.md`
- Technisch: `docs/technical-constraints.md`
- Deployment: `docs/production-deploy-truenas.md`
- Backlog: `docs/backlog.md`

---

## Commands

```bash
# Dev starten (DB + App mit Hot-Reload)
docker compose -f docker-compose.dev.yml up --watch

# Vor jedem Commit — alle drei müssen fehlerfrei sein
docker compose -f docker-compose.dev.yml run --rm app npm run lint
docker compose -f docker-compose.dev.yml run --rm app npm run format:check
docker compose -f docker-compose.dev.yml run --rm app npm run test

# Formatierung auto-fix
docker compose -f docker-compose.dev.yml run --rm app npm run format

# Neue Migration erzeugen (nach Schemaänderung)
docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name <name>

# DB komplett zurücksetzen (Datenverlust!)
docker compose -f docker-compose.dev.yml down -v
```

Dev-Login: `admin@example.com` / `admin-passwort-12`

---

## Deployment

Produktions-Deployment auf TrueNAS SCALE via Docker: @docs/production-deploy-truenas.md

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 16 App Router |
| Sprache | TypeScript 5 strict |
| Datenbank | PostgreSQL 15 + Prisma 7 |
| Auth | NextAuth.js v4 |
| UI | shadcn/ui + Tailwind CSS 4 |
| Charts | Recharts 2 |
| Tests | Vitest |
| Container | Docker + Docker Compose |

---

## Kritische Prisma-7-Abweichungen

Nie von älteren Versionen ableiten (details: @docs/technical-constraints.md#prisma-7):

- Client in `src/generated/prisma/` — Import via `@/generated/prisma/client`
- Kein `url`-Feld in `datasource db` — stattdessen `prisma.config.ts` im Root
- DB-Verbindung über `@prisma/adapter-pg` + `pg.Pool` (siehe `src/lib/db.ts`)

---

## Architektur-Regeln

Details: @docs/technical-constraints.md#daten--und-aktionsarchitektur

- **Server Actions** statt API Routes; **Zod** für Validierung; **`useActionState`** in Formularen
- Fachregeln serverseitig: Attachments + Prognose/Feedback nur bei `TRAINING`/`WETTKAMPF`
- **Kein silent fail**: strukturiertes ActionResult; **Datenisolation**: jeder DB-Zugriff nach `userId`

---

## Modularitäts-Regeln

Details: @docs/technical-constraints.md#modularität--wartbarkeit-verbindlich

- Dateigrösse **< 200 Zeilen** — splitten wenn nötig; Seiten sind dünne Orchestratoren
- Props-Budget: **max. 6 Top-Level-Props**; wiederholte Logik (≥ 2×) → Helper/Hook extrahieren

---

## Sprache & Benennung

Details: @docs/technical-constraints.md#sprache

| Kontext | Sprache |
|---------|---------|
| UI-Texte, Fehlermeldungen, Code-Kommentare | **Deutsch** |
| Komponenten, Funktionen, Dateinamen, Routen/URLs, Commits | **Englisch** |

Keine neuen deutschen Benennungen für interne Bezeichner oder URL-Segmente.

---

## UI-Konsistenz

Details: @docs/technical-constraints.md#design--ui

- Nur **shadcn/ui** — kein `alert()`/`confirm()`; Icon-Buttons: `ghost`; destruktive Aktionen: Bestätigungsdialog
- Listen: ganze Karte klickbar → Detail; Terminologie: **"Probe"** (nicht "Probeschuss")
- Detailseiten: Action-Leiste oben rechts, fachliche → destruktive Aktion → Zurück

---

## Gotchas

- `.env` + Uploads-Verzeichnis niemals einchecken; Migrationsdateien (`prisma/migrations/`) immer einchecken
- Upload-Whitelist fix: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` (@docs/technical-constraints.md#persistenz)
- Disziplinen **archivieren, nicht löschen** (@docs/requirements.md#disziplinen)
- `NEXTAUTH_SECRET` erzeugen: `openssl rand -base64 48`
- `next lint` defekt in Next.js 16 — `lint`-Script nutzt `eslint src` (@docs/technical-constraints.md#linting--formatierung)
- Zod v4: kein `invalid_type_error` → nutze `message` (@docs/technical-constraints.md#zod-v4-aktuell-installiert)
