#!/bin/sh
set -e

# Default DATABASE_URL if not set by Railway (ephemeral SQLite — data lost on restart)
# For persistent data, set DATABASE_URL=file:/data/prod.db and add a Railway Volume at /data
export DATABASE_URL="${DATABASE_URL:-file:./prisma/dev.db}"

# Bind to all interfaces so Railway's health check can reach us
export HOSTNAME="0.0.0.0"

echo "==> DATABASE_URL: $DATABASE_URL"
echo "==> Running Prisma migrations..."
node node_modules/prisma/build/index.js db push --skip-generate || {
  echo "Warning: prisma db push failed, continuing anyway..."
}

echo "==> Starting JobPilot server on port ${PORT:-3000}..."
exec node server.js
