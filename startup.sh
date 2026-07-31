#!/bin/sh
set -e

# ── Database URL ────────────────────────────────────────────────────────────
# Use absolute path so both the init script and runtime prisma adapter agree.
# Set DATABASE_URL in Railway's env vars panel for a persistent volume:
#   DATABASE_URL=file:///data/prod.db  (and mount a Railway Volume at /data)
export DATABASE_URL="${DATABASE_URL:-file:///app/prisma/dev.db}"
export HOSTNAME="0.0.0.0"

echo "==> DATABASE_URL: $DATABASE_URL"

# ── Create DB directory if needed ───────────────────────────────────────────
mkdir -p /app/prisma

# ── Initialise schema (CREATE TABLE IF NOT EXISTS) ───────────────────────────
echo "==> Initialising database schema..."
node scripts/init-db.mjs

# ── Start Next.js ────────────────────────────────────────────────────────────
echo "==> Starting JobPilot on port ${PORT:-3000}..."
exec node server.js
