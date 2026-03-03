# Treffsicher Production Deployment (Registry + TrueNAS 25.10.1)

Dieses Runbook beschreibt den kompletten Weg:

1. App- und Migrator-Image bauen
2. in eine Registry pushen
3. auf TrueNAS SCALE 25.10.1 (Goldeye) als Custom App deployen

## 1) Voraussetzungen

- Lokaler Build-Host mit Docker + Buildx
- Registry-Zugang (z. B. GHCR oder Docker Hub)
- TrueNAS SCALE 25.10.1 mit aktiviertem Apps-Service
- DNS/Reverse-Proxy für HTTPS (empfohlen), da `NEXTAUTH_URL` eine externe URL sein sollte

## 2) Image bauen und in Registry pushen

Beispiel mit GHCR:

```bash
export APP_IMAGE=ghcr.io/<org-oder-user>/treffsicher
export MIGRATOR_IMAGE=ghcr.io/<org-oder-user>/treffsicher-migrator
export VERSION=1.0.0

echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin

# Für typische TrueNAS x86_64-Systeme:
docker buildx build \
  --platform linux/amd64 \
  --target runner \
  -t ${APP_IMAGE}:${VERSION} \
  -t ${APP_IMAGE}:latest \
  --push \
  .

docker buildx build \
  --platform linux/amd64 \
  --target migrator \
  -t ${MIGRATOR_IMAGE}:${VERSION} \
  -t ${MIGRATOR_IMAGE}:latest \
  --push \
  .
```

Optional multi-arch:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target runner \
  -t ${APP_IMAGE}:${VERSION} \
  -t ${APP_IMAGE}:latest \
  --push \
  .

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target migrator \
  -t ${MIGRATOR_IMAGE}:${VERSION} \
  -t ${MIGRATOR_IMAGE}:latest \
  --push \
  .
```

Kurz prüfen:

```bash
docker pull ${APP_IMAGE}:${VERSION}
docker pull ${MIGRATOR_IMAGE}:${VERSION}
```

## 3) Produktions-Konfiguration vorbereiten

Auf TrueNAS eine `.env`-Datei ablegen, z. B. unter:

`/mnt/<POOL>/apps/treffsicher/.env`

Beispielinhalt:

```env
# App
DATABASE_URL=postgresql://treffsicher:SUPER_DB_PASSWORD@db:5432/treffsicher
NEXTAUTH_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
NEXTAUTH_URL=https://treffsicher.example.com
UPLOAD_DIR=/app/uploads
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=REPLACE_WITH_STRONG_ADMIN_PASSWORD
PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=true
PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS=false
AUTH_TRUST_PROXY_HEADERS=true
AUTH_RATE_LIMIT_MAX_BUCKETS=10000

# Postgres
POSTGRES_USER=treffsicher
POSTGRES_PASSWORD=SUPER_DB_PASSWORD
POSTGRES_DB=treffsicher
```

`NEXTAUTH_SECRET` erzeugen (lokal):

```bash
openssl rand -base64 48
```

### 3.1) Anonymisierte Vorlagen aus `production/`

Die folgenden Snippets entsprechen den lokalen Dateien in `production/`, aber mit
anonymisierten Beispielwerten für Registry, Pfade und Secrets.

`production/build-and-push.sh` (Beispiel):

```sh
#!/bin/sh
set -eu

REGISTRY="${REGISTRY:-registry.example.com}"
IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-example-org}"
APP_IMAGE_NAME="${APP_IMAGE_NAME:-treffsicher}"
MIGRATOR_IMAGE_NAME="${MIGRATOR_IMAGE_NAME:-treffsicher-migrator}"
PLATFORM="${PLATFORM:-linux/amd64}"
VERSION="${VERSION:-$(date +%Y.%m.%d-%H%M)}"
TAG_LATEST="${TAG_LATEST:-true}"

APP_REGISTRY_IMAGE="${APP_REGISTRY_IMAGE:-${REGISTRY}/${IMAGE_NAMESPACE}/${APP_IMAGE_NAME}}"
MIGRATOR_REGISTRY_IMAGE="${MIGRATOR_REGISTRY_IMAGE:-${REGISTRY}/${IMAGE_NAMESPACE}/${MIGRATOR_IMAGE_NAME}}"

APP_BUILD_CMD="docker buildx build --platform ${PLATFORM} --target runner -t ${APP_REGISTRY_IMAGE}:${VERSION}"
MIGRATOR_BUILD_CMD="docker buildx build --platform ${PLATFORM} --target migrator -t ${MIGRATOR_REGISTRY_IMAGE}:${VERSION}"

if [ "${TAG_LATEST}" = "true" ]; then
  APP_BUILD_CMD="${APP_BUILD_CMD} -t ${APP_REGISTRY_IMAGE}:latest"
  MIGRATOR_BUILD_CMD="${MIGRATOR_BUILD_CMD} -t ${MIGRATOR_REGISTRY_IMAGE}:latest"
fi

APP_BUILD_CMD="${APP_BUILD_CMD} --push ."
MIGRATOR_BUILD_CMD="${MIGRATOR_BUILD_CMD} --push ."

sh -c "${APP_BUILD_CMD}"
sh -c "${MIGRATOR_BUILD_CMD}"
```

`production/truenas.yml` (Beispiel):

```yaml
services:
  migrate:
    image: registry.example.com/example-org/treffsicher-migrator:2026.03.03-1200
    env_file:
      - /mnt/tank/apps/treffsicher/.env
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  app:
    image: registry.example.com/example-org/treffsicher:2026.03.03-1200
    env_file:
      - /mnt/tank/apps/treffsicher/.env
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    ports:
      - "30080:3000"
    volumes:
      - /mnt/tank/apps/treffsicher/uploads:/app/uploads
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    env_file:
      - /mnt/tank/apps/treffsicher/.env
    volumes:
      - /mnt/tank/apps/treffsicher/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

`production/env.sh` (Beispiel):

```sh
#!/bin/sh
set -eu

cd /mnt/tank/apps/treffsicher

cat > .env <<'EOF'
# App
DATABASE_URL=postgresql://treffsicher:CHANGE_ME_DB_PASSWORD@db:5432/treffsicher
NEXTAUTH_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
NEXTAUTH_URL=https://treffsicher.example.com
UPLOAD_DIR=/app/uploads
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=true
PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS=false
AUTH_TRUST_PROXY_HEADERS=true
AUTH_RATE_LIMIT_MAX_BUCKETS=10000

# Postgres
POSTGRES_USER=treffsicher
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD
POSTGRES_DB=treffsicher
EOF

chmod 600 .env
```

## 4) TrueNAS: Registry-Login (nur private Registry)

Wenn das Image privat ist:

1. `Apps` öffnen
2. `Configuration` öffnen
3. `Sign-in to a Docker registry` wählen
4. Registry-URI, User, Passwort/PAT eintragen

## 5) TrueNAS: Deployment als Custom App (YAML)

In TrueNAS:

1. `Apps` -> `Discover Apps`
2. `Custom App` Menü öffnen
3. `Install via YAML` wählen
4. Name setzen (z. B. `treffsicher`)
5. Folgende Compose-YAML als `Custom Config` einfügen
6. `<APP_IMAGE>`, `<MIGRATOR_IMAGE>` und `<VERSION>` ersetzen
7. Speichern

```yaml
services:
  migrate:
    image: <MIGRATOR_IMAGE>:<VERSION>
    env_file:
      - /mnt/<POOL>/apps/treffsicher/.env
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  app:
    image: <APP_IMAGE>:<VERSION>
    env_file:
      - /mnt/<POOL>/apps/treffsicher/.env
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    ports:
      - "3000:3000"
    volumes:
      - uploads_data:/app/uploads
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    env_file:
      - /mnt/<POOL>/apps/treffsicher/.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  uploads_data:
```

## 6) Erststart und Smoke-Test

1. App-Status in TrueNAS auf `Running` prüfen
2. URL öffnen (`NEXTAUTH_URL`)
3. Mit `ADMIN_EMAIL`/`ADMIN_PASSWORD` einloggen
4. Testeinheit anlegen und einen Test-Anhang hochladen

Hinweis:

- Der `migrate`-Service führt `prisma migrate deploy` aus, dann startet die App.
- Falls `migrate deploy` wegen bereits als fehlgeschlagen markierter Migration (`P3009`) blockiert ist,
  versucht der `migrate`-Service eine automatische Recovery für bekannte sichere Fälle und führt danach
  `migrate deploy` erneut aus.
- Standarddisziplinen/Admin werden bei Bedarf automatisch initialisiert.

## 7) Update-Strategie

Für ein Update:

1. Neues Image-Tag bauen und pushen (`VERSION` erhöhen)
2. In TrueNAS App bearbeiten
3. Im YAML beide Tags ändern (`app.image` und `migrate.image`)
4. Speichern (redeploy)

Rollback:

1. Auf letztes funktionierendes Tag zurücksetzen
2. Erneut speichern/deployen

## 8) Betriebshinweise

- `NEXTAUTH_URL` in Produktion auf die externe HTTPS-URL setzen.
- Private Registry nur mit dediziertem Read-Token anbinden.
- Datenhaltung ist persistent über die Docker-Volumes `postgres_data` und `uploads_data`.
- Für Offsite-Backups die App-Daten regelmäßig über TrueNAS-Mechanismen sichern.
- Standardempfehlung für TrueNAS:
  - `PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=true`
  - `PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS=false`
  - `AUTH_TRUST_PROXY_HEADERS=true` (wenn Reverse-Proxy/Ingress die Client-IP korrekt setzt)
  - `AUTH_RATE_LIMIT_MAX_BUCKETS=10000` (bei sehr vielen Logins ggf. erhöhen)
    Damit werden bekannte Recovery-Fälle automatisiert, unbekannte Fälle aber weiterhin sichtbar gestoppt.

## 9) Fehlerfälle im Betrieb (Runbook)

### 9.1 App nicht erreichbar

1. In TrueNAS prüfen, ob `app` und `db` laufen und `db` healthy ist.
2. App-Logs prüfen:
   - `docker logs <app-container> --tail 200`
3. DB-Logs prüfen:
   - `docker logs <db-container> --tail 200`
4. Bei wiederholten Crashes zuerst auf das letzte funktionierende Image-Tag zurückrollen (siehe Abschnitt 7).

### 9.2 Migration blockiert beim Start

1. In den Logs des `migrate`-Containers nach `P3009` oder `migrate deploy failed` suchen.
2. Wenn ein bekannter Recovery-Fall automatisch aufgelöst wurde, läuft der Start weiter.
3. Bei unbekanntem Recovery-Fall (`manual intervention required`):
   - Deployment stoppen
   - DB-Snapshot sichern
   - Migration manuell analysieren und erst dann erneut deployen

### 9.3 Uploads schlagen fehl

1. App-Logs auf Upload-Fehler prüfen.
2. Freien Speicher des Volumes `uploads_data` prüfen.
3. Rechte und Mount des Upload-Verzeichnisses (`/app/uploads`) kontrollieren.
4. Nach Fehlerbehebung einen Test-Upload durchführen.

### 9.4 Login-Probleme / Rate-Limit

1. Prüfen, ob `NEXTAUTH_URL` und `NEXTAUTH_SECRET` korrekt gesetzt sind.
2. Bei vielen legitimen Login-Versuchen `AUTH_RATE_LIMIT_MAX_BUCKETS` und Proxy-Konfiguration prüfen.
3. Für vergessene Passwörter Admin-Reset wie in den Produktanforderungen verwenden.

## 10) Restore-Drill (regelmäßig testen)

1. Testsystem bereitstellen (separates Namespace/Host).
2. Snapshot von `postgres_data` und `uploads_data` einspielen.
3. App mit gleichem Image-Tag und angepasster `NEXTAUTH_URL` starten.
4. Mit Test-User anmelden, mindestens eine Einheit öffnen und einen Anhang prüfen.
5. Ergebnis dokumentieren (Datum, Dauer, Auffälligkeiten, offene Maßnahmen).
