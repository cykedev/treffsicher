# Treffsicher Production Deployment (Registry + TrueNAS 25.10.1)

Dieses Runbook beschreibt den kompletten Weg:

1. Production-Image bauen
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
export REGISTRY_IMAGE=ghcr.io/<org-oder-user>/treffsicher
export VERSION=1.0.0

echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin

# Für typische TrueNAS x86_64-Systeme:
docker buildx build \
  --platform linux/amd64 \
  -t ${REGISTRY_IMAGE}:${VERSION} \
  -t ${REGISTRY_IMAGE}:latest \
  --push \
  .
```

Optional multi-arch:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY_IMAGE}:${VERSION} \
  -t ${REGISTRY_IMAGE}:latest \
  --push \
  .
```

Kurz prüfen:

```bash
docker pull ${REGISTRY_IMAGE}:${VERSION}
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

# Postgres
POSTGRES_USER=treffsicher
POSTGRES_PASSWORD=SUPER_DB_PASSWORD
POSTGRES_DB=treffsicher
```

`NEXTAUTH_SECRET` erzeugen (lokal):

```bash
openssl rand -base64 48
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
6. `<REGISTRY_IMAGE>` und `<VERSION>` ersetzen
7. Speichern

```yaml
services:
  app:
    image: <REGISTRY_IMAGE>:<VERSION>
    env_file:
      - /mnt/<POOL>/apps/treffsicher/.env
    depends_on:
      db:
        condition: service_healthy
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

- Das Image startet mit `prisma migrate deploy` und startet dann die App.
- Standarddisziplinen/Admin werden bei Bedarf automatisch initialisiert.

## 7) Update-Strategie

Für ein Update:

1. Neues Image-Tag bauen und pushen (`VERSION` erhöhen)
2. In TrueNAS App bearbeiten
3. Im YAML nur das Tag bei `app.image` ändern
4. Speichern (redeploy)

Rollback:

1. Auf letztes funktionierendes Tag zurücksetzen
2. Erneut speichern/deployen

## 8) Betriebshinweise

- `NEXTAUTH_URL` in Produktion auf die externe HTTPS-URL setzen.
- Private Registry nur mit dediziertem Read-Token anbinden.
- Datenhaltung ist persistent über die Docker-Volumes `postgres_data` und `uploads_data`.
- Für Offsite-Backups die App-Daten regelmäßig über TrueNAS-Mechanismen sichern.
