#!/bin/sh
set -eu

run_prisma() {
  # Im Production-Image liegt Prisma als Package unter /app/node_modules/prisma.
  # npx ist hier unzuverlässig, weil .bin-Symlinks im standalone-Setup fehlen können.
  if [ -f "/app/node_modules/prisma/build/index.js" ]; then
    node /app/node_modules/prisma/build/index.js "$@"
    return
  fi

  npx prisma "$@"
}

echo "[startup] Running prisma migrate deploy..."
if run_prisma migrate deploy; then
  echo "[startup] Migrations are up to date."
else
  deploy_exit_code=$?
  echo "[startup] prisma migrate deploy failed with code ${deploy_exit_code}."

  if [ "${PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" = "true" ]; then
    echo "[startup] Attempting migration recovery for failed migrations..."
    node /app/scripts/resolve-failed-migrations.mjs

    echo "[startup] Retrying prisma migrate deploy..."
    run_prisma migrate deploy
  else
    echo "[startup] Automatic migration recovery disabled (PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=false)."
    exit "${deploy_exit_code}"
  fi
fi

echo "[startup] Starting Next.js server..."
exec node server.js
