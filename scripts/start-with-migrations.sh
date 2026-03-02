#!/bin/sh
set -eu

echo "[startup] Running prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "[startup] Migrations are up to date."
else
  deploy_exit_code=$?
  echo "[startup] prisma migrate deploy failed with code ${deploy_exit_code}."

  if [ "${PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" = "true" ]; then
    echo "[startup] Attempting migration recovery for failed migrations..."
    node /app/scripts/resolve-failed-migrations.mjs

    echo "[startup] Retrying prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[startup] Automatic migration recovery disabled (PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=false)."
    exit "${deploy_exit_code}"
  fi
fi

echo "[startup] Starting Next.js server..."
exec node server.js
