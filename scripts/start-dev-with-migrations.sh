#!/bin/sh
set -eu

echo "[dev-startup] Running prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "[dev-startup] Migration deploy succeeded."
else
  deploy_exit_code=$?
  echo "[dev-startup] prisma migrate deploy failed with code ${deploy_exit_code}."

  if [ "${PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" = "true" ]; then
    echo "[dev-startup] Attempting migration recovery for failed migrations..."
    node /app/scripts/resolve-failed-migrations.mjs

    echo "[dev-startup] Retrying prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[dev-startup] Automatic migration recovery disabled (PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=false)."
    exit "${deploy_exit_code}"
  fi
fi

echo "[dev-startup] Running prisma db push for live schema sync..."
npx prisma db push

echo "[dev-startup] Generating prisma client..."
npx prisma generate

echo "[dev-startup] Starting Next.js dev server..."
exec npm run dev
