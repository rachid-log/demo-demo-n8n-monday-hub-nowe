#!/bin/sh
set -e

# Optional: Auto-apply pending Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "=> [entrypoint] Checking database and applying Prisma migrations..."
  if [ -x "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma migrate deploy || echo "=> [entrypoint] Warning: Prisma migration step skipped or failed. Continuing server start."
  else
    npx --yes prisma migrate deploy || echo "=> [entrypoint] Warning: Prisma migration step skipped or failed. Continuing server start."
  fi
fi

exec "$@"
