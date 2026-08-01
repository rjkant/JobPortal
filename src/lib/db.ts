/**
 * Prisma v7 with @prisma/adapter-libsql.
 *
 * Supports two modes:
 *  - Local / Railway file:  DATABASE_URL = "file:///app/prisma/dev.db"
 *  - Turso cloud:           DATABASE_URL = "libsql://xxx.turso.io"
 *                           DATABASE_AUTH_TOKEN = "<token>"
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:///app/prisma/dev.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
