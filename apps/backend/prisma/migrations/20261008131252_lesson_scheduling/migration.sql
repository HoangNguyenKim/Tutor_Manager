-- CreateTable
CREATE TABLE "RecurrenceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "hourlyRateVnd" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurrenceRule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "bonusMinutes" INTEGER NOT NULL DEFAULT 0,
    "billableMinutes" INTEGER NOT NULL,
    "hourlyRateVnd" INTEGER NOT NULL,
    "tuitionVnd" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "recurrenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lesson_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "RecurrenceRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("actualMinutes", "billableMinutes", "bonusMinutes", "createdAt", "deletedAt", "hourlyRateVnd", "id", "scheduledMinutes", "scheduledStart", "status", "studentId", "tuitionVnd", "updatedAt") SELECT "actualMinutes", "billableMinutes", "bonusMinutes", "createdAt", "deletedAt", "hourlyRateVnd", "id", "scheduledMinutes", "scheduledStart", "status", "studentId", "tuitionVnd", "updatedAt" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE INDEX "Lesson_studentId_scheduledStart_idx" ON "Lesson"("studentId", "scheduledStart");
CREATE INDEX "Lesson_status_scheduledStart_idx" ON "Lesson"("status", "scheduledStart");
CREATE INDEX "Lesson_deletedAt_idx" ON "Lesson"("deletedAt");
CREATE INDEX "Lesson_recurrenceId_idx" ON "Lesson"("recurrenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecurrenceRule_studentId_isActive_idx" ON "RecurrenceRule"("studentId", "isActive");
