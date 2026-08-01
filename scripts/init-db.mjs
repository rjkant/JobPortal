/**
 * Initialise the database by running CREATE TABLE IF NOT EXISTS for every model.
 * Works with both local SQLite (file:///...) and Turso cloud (libsql://...).
 *
 * Usage: node scripts/init-db.mjs
 */
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL ?? 'file:///app/prisma/dev.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('[init-db] Using DATABASE_URL:', url.replace(/authToken=\S+/, 'authToken=***'));

const db = createClient({ url, ...(authToken ? { authToken } : {}) });

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "name"         TEXT     NOT NULL,
    "email"        TEXT     NOT NULL,
    "passwordHash" TEXT     NOT NULL,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  `CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id"              TEXT     NOT NULL PRIMARY KEY,
    "userId"          TEXT     NOT NULL,
    "fullName"        TEXT     NOT NULL DEFAULT '',
    "email"           TEXT     NOT NULL DEFAULT '',
    "phone"           TEXT     NOT NULL DEFAULT '',
    "location"        TEXT     NOT NULL DEFAULT '',
    "totalExperience" REAL     NOT NULL DEFAULT 0,
    "currentRole"     TEXT     NOT NULL DEFAULT '',
    "skills"          TEXT     NOT NULL DEFAULT '[]',
    "desiredRoles"    TEXT     NOT NULL DEFAULT '[]',
    "preferredLocs"   TEXT     NOT NULL DEFAULT '[]',
    "expectedCTC"     TEXT     NOT NULL DEFAULT '',
    "noticePeriod"    TEXT     NOT NULL DEFAULT '',
    "resumePath"      TEXT,
    "linkedinUrl"     TEXT,
    "summary"         TEXT     NOT NULL DEFAULT '',
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId")`,

  `CREATE TABLE IF NOT EXISTS "PlatformCredential" (
    "id"             TEXT     NOT NULL PRIMARY KEY,
    "userId"         TEXT     NOT NULL,
    "platform"       TEXT     NOT NULL,
    "email"          TEXT     NOT NULL,
    "password"       TEXT     NOT NULL,
    "sessionCookies" TEXT,
    "lastLogin"      DATETIME,
    "isActive"       INTEGER  NOT NULL DEFAULT 1,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "PlatformCredential_userId_platform_key"
    ON "PlatformCredential"("userId", "platform")`,

  `CREATE TABLE IF NOT EXISTS "JobListing" (
    "id"          TEXT     NOT NULL PRIMARY KEY,
    "userId"      TEXT     NOT NULL,
    "platform"    TEXT     NOT NULL,
    "externalId"  TEXT     NOT NULL,
    "title"       TEXT     NOT NULL,
    "company"     TEXT     NOT NULL,
    "location"    TEXT     NOT NULL,
    "salaryMin"   INTEGER,
    "salaryMax"   INTEGER,
    "experience"  TEXT,
    "skills"      TEXT     NOT NULL DEFAULT '[]',
    "description" TEXT     NOT NULL,
    "applyUrl"    TEXT     NOT NULL,
    "postedAt"    DATETIME,
    "matchScore"  INTEGER  NOT NULL DEFAULT 0,
    "fetchedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "JobListing_userId_platform_externalId_key"
    ON "JobListing"("userId", "platform", "externalId")`,

  `CREATE TABLE IF NOT EXISTS "Application" (
    "id"             TEXT     NOT NULL PRIMARY KEY,
    "jobId"          TEXT     NOT NULL,
    "status"         TEXT     NOT NULL DEFAULT 'applied',
    "appliedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tailoredResume" TEXT,
    "coverLetter"    TEXT,
    "notes"          TEXT,
    "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("jobId") REFERENCES "JobListing"("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "AutomationRun" (
    "id"          TEXT     NOT NULL PRIMARY KEY,
    "userId"      TEXT     NOT NULL,
    "startedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status"      TEXT     NOT NULL DEFAULT 'running',
    "platforms"   TEXT     NOT NULL DEFAULT '[]',
    "jobsFound"   INTEGER  NOT NULL DEFAULT 0,
    "jobsApplied" INTEGER  NOT NULL DEFAULT 0,
    "errors"      TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "AutomationLog" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "runId"     TEXT     NOT NULL,
    "level"     TEXT     NOT NULL,
    "message"   TEXT     NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "Settings" (
    "id"     TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key"    TEXT NOT NULL,
    "value"  TEXT NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Settings_userId_key_key" ON "Settings"("userId", "key")`,
];

try {
  for (const sql of statements) {
    await db.execute(sql);
  }
  console.log('[init-db] All tables ready ✓');
} catch (err) {
  console.error('[init-db] FAILED:', err);
  process.exit(1);
} finally {
  db.close();
}
