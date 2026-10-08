-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "bonusMinutes" INTEGER NOT NULL DEFAULT 0,
    "billableMinutes" INTEGER NOT NULL,
    "hourlyRateVnd" INTEGER NOT NULL,
    "tuitionVnd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TuitionAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuitionAdjustment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "providerAccountId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" DATETIME,
    "secretRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalendarEventLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "providerEventId" TEXT NOT NULL,
    "lastPushedHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarEventLink_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pushedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "SyncConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "localHash" TEXT NOT NULL,
    "remoteSummary" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncConflict_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "SyncOperation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Student_isActive_name_idx" ON "Student"("isActive", "name");

-- CreateIndex
CREATE INDEX "Lesson_studentId_scheduledStart_idx" ON "Lesson"("studentId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Lesson_status_scheduledStart_idx" ON "Lesson"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Lesson_deletedAt_idx" ON "Lesson"("deletedAt");

-- CreateIndex
CREATE INDEX "Payment_studentId_paidAt_idx" ON "Payment"("studentId", "paidAt");

-- CreateIndex
CREATE INDEX "TuitionAdjustment_studentId_createdAt_idx" ON "TuitionAdjustment"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_provider_providerAccountId_key" ON "CalendarConnection"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "CalendarEventLink_lessonId_idx" ON "CalendarEventLink"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventLink_provider_providerEventId_key" ON "CalendarEventLink"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "SyncConflict_operationId_idx" ON "SyncConflict"("operationId");

-- CreateIndex
CREATE INDEX "SyncConflict_lessonId_idx" ON "SyncConflict"("lessonId");
