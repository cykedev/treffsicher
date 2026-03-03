#!/bin/sh
set -eu

run_prisma() {
  # In manchen Images fehlen .bin-Symlinks; direkter Aufruf bleibt robust.
  if [ -f "/app/node_modules/prisma/build/index.js" ]; then
    node /app/node_modules/prisma/build/index.js "$@"
    return
  fi

  npx prisma "$@"
}

echo "[migrate] Running prisma migrate deploy..."
if run_prisma migrate deploy; then
  echo "[migrate] Migrations are up to date."
else
  deploy_exit_code=$?
  echo "[migrate] prisma migrate deploy failed with code ${deploy_exit_code}."

  if [ "${PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" = "true" ]; then
    echo "[migrate] Attempting migration recovery for failed migrations..."
    node /app/scripts/resolve-failed-migrations.mjs

    echo "[migrate] Retrying prisma migrate deploy..."
    run_prisma migrate deploy
  else
    echo "[migrate] Automatic migration recovery disabled (PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=false)."
    exit "${deploy_exit_code}"
  fi
fi
