#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
# Use the local prisma binary directly (faster than npx, no network lookup)
node node_modules/prisma/build/index.js db push --skip-generate || {
  echo "Warning: prisma db push failed, continuing anyway..."
}

echo "==> Starting JobPilot server on port ${PORT:-3000}..."
# Next.js standalone server reads PORT from env automatically
exec node server.js
