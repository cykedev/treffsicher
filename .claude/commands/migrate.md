Erstelle eine neue Prisma-Migration für eine Schemaänderung.

Verwende den ersten Argument-Token als Migrationsname (kebab-case, englisch, beschreibend — z.B. `add-session-notes` oder `add-goal-priority`). Falls kein Name angegeben wurde, frage danach bevor du fortfährst.

Führe dann aus:
```
docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name <name>
```

Danach:
- Bestätige dass die Migration-Datei in `prisma/migrations/` angelegt wurde
- Weise darauf hin, dass die Migrationsdatei eingecheckt werden muss
- Prüfe ob der generierte Prisma-Client (`src/generated/prisma/`) aktualisiert wurde
- Erinnerung: keine destructiven Migrationen ohne Kommentar in der SQL-Datei

Wichtig: Diese Datei ist einzuchecken — `.env` und `uploads/` niemals.
