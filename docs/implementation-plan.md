# Treffsicher — Implementierungsstatus & Roadmap

Verbindliche Referenzdokumente: @docs/requirements.md · @docs/technical-constraints.md

---

## Phasen-Übersicht

| Phase | Inhalt | Status |
|-------|--------|--------|
| 1 | Fundament: Auth, Disziplinen, Einheit-Minimal, Tagebuch | ✅ |
| 2 | Erweiterte Ergebnisse, Uploads, Basis-Statistiken | ✅ |
| 3 | Mentaltraining: Bearbeiten/Löschen, Befinden, Reflexion, Prognose/Feedback, Schuss-Ablauf | ✅ |
| 3.9 | UI-Überarbeitung: Dark Mode, Lucide-Icons, shadcn-Komponenten | ✅ |
| 3.10 | Favoriten, Trainingsziel, Schuss-/Probeschussanzahl im Tagebuch, Eingabevalidierung | ✅ |
| 3.11 | Meyton-PDF Import (URL + Upload) | ✅ |
| 3.12 | Import-Sicherheits-Härtung (SSRF, PDF-Plausibilität) | ✅ |
| 3.13 | DoS-Härtung: Streaming-Import, FormData-Limits, Statistik-Caps, Login-Rate-Limit | ✅ |
| 4.1 | Saisonziele (CRUD + Einheits-Verknüpfung) | ✅ |
| 4.2 | Radarchart (7 Dimensionen Prognose vs. Feedback) | ✅ |
| 4.3 | PDF-Export einzelner Einheit ✅ — CSV-Zeitraum-Export ⏳ | 🔄 |
| 5.1 | Admin-Bereich: Nutzerverwaltung, System-Disziplinen, Passwortwechsel | ✅ |
| 5.2 | PWA / Offline-Unterstützung | ⏳ |

---

## Offene Arbeitspakete

Kurzfristige offene Punkte (priorisiert): @docs/backlog.md

### Phase 4.3 — CSV-Zeitraum-Export (offen)

Ergebnisse aller Einheiten in einem Zeitraum als CSV-Download:
- Felder: Datum, Typ, Disziplin, Gesamtergebnis, Serien
- UI: Button auf der Statistik-Seite oder im Tagebuch mit Datumspicker
- Gedacht zur bewussten Weitergabe / Archivierung
- Spec: @docs/requirements.md#export

### Phase 5.2 — PWA / Offline-Unterstützung (offen)

Einheiten auch ohne Verbindung erfassen (Schiessstand):
- Paket: `next-pwa`
- Offline: Erfassung in IndexedDB, automatische Synchronisation nach Reconnect
- Aufwand: Gross (~1 Tag), ausführlich auf Mobilgeräten testen
- Spec: @docs/requirements.md#offene-punkte-spätere-phasen

---

## Entwicklungsworkflow

### Vor jeder Schemaänderung

1. Änderung in `prisma/schema.prisma`
2. Migration: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name <name>`
3. Migration-Datei einchecken (`prisma/migrations/`)
4. Keine destructiven Migrationen ohne Kommentar

### Vor jedem Commit (alle müssen grün sein)

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run lint
docker compose -f docker-compose.dev.yml run --rm app npm run format:check
docker compose -f docker-compose.dev.yml run --rm app npm run test
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit
```

### Bei gewachsenen Dateien (>220 Zeilen)

Split verpflichtend — Orchestrator-Seiten dünn halten.
Details: @docs/technical-constraints.md#modularität--wartbarkeit-verbindlich

### Bei Widersprüchen zu Docs

Abweichung dokumentieren → klären → dann erst implementieren.
