-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "totalExperience" REAL NOT NULL DEFAULT 0,
    "currentRole" TEXT NOT NULL DEFAULT '',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "desiredRoles" TEXT NOT NULL DEFAULT '[]',
    "preferredLocs" TEXT NOT NULL DEFAULT '[]',
    "expectedCTC" TEXT NOT NULL DEFAULT '',
    "noticePeriod" TEXT NOT NULL DEFAULT '',
    "resumePath" TEXT,
    "linkedinUrl" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "sessionCookies" TEXT,
    "lastLogin" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "experience" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "applyUrl" TEXT NOT NULL,
    "postedAt" DATETIME,
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tailoredResume" TEXT,
    "coverLetter" TEXT,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsApplied" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_platform_externalId_key" ON "JobListing"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
