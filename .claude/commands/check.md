Führe alle fünf Pre-Commit-Qualitätsgates im Docker-Container aus und berichte das Ergebnis.

Die Checks müssen in dieser Reihenfolge laufen:

1. `docker compose -f docker-compose.dev.yml run --rm app npm run lint`
2. `docker compose -f docker-compose.dev.yml run --rm app npm run format:check`
3. `docker compose -f docker-compose.dev.yml run --rm app npm run test`
4. `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`
5. `docker compose -f docker-compose.dev.yml run --rm app npm run build`

Gate 5 (`next build`) ist Pflicht: es fängt Build-only-Fehler ab, die `lint`/`tsc`/`test` **nicht** sehen — z.B. die Next.js-Regel, dass eine `"use server"`-Datei nur direkt deklarierte async-Funktionen exportieren darf (keine Re-Exports/Barrels). Besonders bei Änderungen an Server Actions zwingend.

Führe alle fünf Befehle aus, auch wenn einer fehlschlägt.

Berichte anschliessend kompakt: welche Gates grün sind, welche rot sind, und falls rot: die relevanten Fehlermeldungen. Schlage konkrete Fixes vor, sofern die Ursache eindeutig ist.
