Führe alle vier Pre-Commit-Qualitätsgates im Docker-Container aus und berichte das Ergebnis.

Die Checks müssen in dieser Reihenfolge laufen:

1. `docker compose -f docker-compose.dev.yml run --rm app npm run lint`
2. `docker compose -f docker-compose.dev.yml run --rm app npm run format:check`
3. `docker compose -f docker-compose.dev.yml run --rm app npm run test`
4. `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`

Führe alle vier Befehle aus, auch wenn einer fehlschlägt.

Berichte anschliessend kompakt: welche Gates grün sind, welche rot sind, und falls rot: die relevanten Fehlermeldungen. Schlage konkrete Fixes vor, sofern die Ursache eindeutig ist.
