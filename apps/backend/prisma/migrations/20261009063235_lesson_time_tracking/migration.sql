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
    "bonusBillable" BOOLEAN NOT NULL DEFAULT false,
    "billableMinutes" INTEGER NOT NULL,
    "billingPolicy" TEXT NOT NULL DEFAULT 'actual',
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
INSERT INTO "new_Lesson" ("actualMinutes", "billableMinutes", "bonusMinutes", "createdAt", "deletedAt", "hourlyRateVnd", "id", "recurrenceId", "scheduledMinutes", "scheduledStart", "status", "studentId", "timeZone", "tuitionVnd", "updatedAt") SELECT "actualMinutes", "billableMinutes", "bonusMinutes", "createdAt", "deletedAt", "hourlyRateVnd", "id", "recurrenceId", "scheduledMinutes", "scheduledStart", "status", "studentId", "timeZone", "tuitionVnd", "updatedAt" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE INDEX "Lesson_studentId_scheduledStart_idx" ON "Lesson"("studentId", "scheduledStart");
CREATE INDEX "Lesson_status_scheduledStart_idx" ON "Lesson"("status", "scheduledStart");
CREATE INDEX "Lesson_deletedAt_idx" ON "Lesson"("deletedAt");
CREATE INDEX "Lesson_recurrenceId_idx" ON "Lesson"("recurrenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
