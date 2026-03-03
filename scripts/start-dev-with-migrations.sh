#!/bin/sh
set -eu

if [ "${SKIP_MIGRATE_DEPLOY:-false}" = "true" ]; then
  echo "[dev-startup] Skipping prisma migrate deploy because SKIP_MIGRATE_DEPLOY=true."
else
  sh /app/scripts/run-migrations-with-recovery.sh
fi

echo "[dev-startup] Running prisma db push for live schema sync..."
npx prisma db push

echo "[dev-startup] Generating prisma client..."
npx prisma generate

echo "[dev-startup] Starting Next.js dev server..."
exec npm run dev
