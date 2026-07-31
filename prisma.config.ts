import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma/schema.prisma'),
  datasource: {
    // For Railway: set DATABASE_URL=file:///data/prod.db + mount a Volume at /data
    // Default: absolute path to /app/prisma/dev.db (ephemeral, resets on deploy)
    url: process.env.DATABASE_URL ?? 'file:///app/prisma/dev.db',
  },
})
