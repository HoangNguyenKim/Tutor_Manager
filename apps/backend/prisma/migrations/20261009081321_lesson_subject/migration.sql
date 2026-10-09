-- Move subject from Student (one subject) to Lesson (one subject per lesson).
-- Existing lessons inherit their student's subject; fallback 'Toán' when unknown.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
ALTER TABLE "Lesson" ADD COLUMN "subject" TEXT;
UPDATE "Lesson" SET "subject" = COALESCE((SELECT "subject" FROM "Student" WHERE "Student"."id" = "Lesson"."studentId"), 'Toán');
UPDATE "Lesson" SET "subject" = 'Toán' WHERE "subject" IS NULL OR "subject" = '';
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
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
INSERT INTO "new_Lesson" ("id", "studentId", "scheduledStart", "scheduledMinutes", "subject", "actualMinutes", "bonusMinutes", "bonusBillable", "billableMinutes", "billingPolicy", "hourlyRateVnd", "tuitionVnd", "timeZone", "recurrenceId", "status", "deletedAt", "createdAt", "updatedAt") SELECT "id", "studentId", "scheduledStart", "scheduledMinutes", "subject", "actualMinutes", "bonusMinutes", "bonusBillable", "billableMinutes", "billingPolicy", "hourlyRateVnd", "tuitionVnd", "timeZone", "recurrenceId", "status", "deletedAt", "createdAt", "updatedAt" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE INDEX "Lesson_studentId_scheduledStart_idx" ON "Lesson"("studentId", "scheduledStart");
CREATE INDEX "Lesson_status_scheduledStart_idx" ON "Lesson"("status", "scheduledStart");
CREATE INDEX "Lesson_subject_scheduledStart_idx" ON "Lesson"("subject", "scheduledStart");
CREATE INDEX "Lesson_deletedAt_idx" ON "Lesson"("deletedAt");
CREATE INDEX "Lesson_recurrenceId_idx" ON "Lesson"("recurrenceId");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "parentContact" TEXT,
    "grade" TEXT,
    "hourlyRateVnd" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Student" ("createdAt", "grade", "hourlyRateVnd", "id", "isActive", "name", "notes", "parentContact", "phone", "updatedAt") SELECT "createdAt", "grade", "hourlyRateVnd", "id", "isActive", "name", "notes", "parentContact", "phone", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE INDEX "Student_isActive_name_idx" ON "Student"("isActive", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
