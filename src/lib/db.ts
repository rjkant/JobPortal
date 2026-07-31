/**
 * Prisma v7 requires a driver adapter for all database connections.
 * We use @libsql/client (pure JS, works on any platform) with the
 * @prisma/adapter-libsql adapter for SQLite file-based databases.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // DATABASE_URL must be in libsql format: "file:/absolute/path.db" or "file:relative/path.db"
  // Railway volume: "file:/data/prod.db"
  // Local dev:      "file:./prisma/dev.db"
  // Use an absolute path as the fallback so it matches startup.sh's default
  const url = process.env.DATABASE_URL ?? 'file:///app/prisma/dev.db';
  const adapter = new PrismaLibSql({ url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
