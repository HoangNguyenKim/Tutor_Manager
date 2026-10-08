import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';
import { resolveDbPath } from '../src/db/db-path';
import { applyPendingMigrations, resolveMigrationsDir } from '../src/db/migrations';

// Fictional demo data only — never real student personal data.
const STUDENTS = [
  { name: 'Nguyen Van Minh (demo)', phone: '0900000001', notes: 'Toán lớp 10' },
  { name: 'Tran Thi Hoa (demo)', phone: '0900000002', notes: 'Tiếng Anh lớp 8' },
  { name: 'Le Van Bao (demo)', phone: '0900000003', notes: 'Lý lớp 11' },
];

async function main() {
  const dbPath = resolveDbPath();
  const setup = new Database(dbPath);
  try {
    const dir = resolveMigrationsDir();
    if (dir) applyPendingMigrations(setup, dir);
  } finally {
    setup.close();
  }
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });
  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    if ((await prisma.student.count()) > 0) {
      console.log('[seed] students already exist, skipping');
      return;
    }
    await prisma.$transaction(async (tx) => {
      for (const s of STUDENTS) {
        const student = await tx.student.create({ data: s });
        const lesson = await tx.lesson.create({
          data: {
            studentId: student.id,
            scheduledStart: new Date(Date.now() + 86400000),
            scheduledMinutes: 90,
            billableMinutes: 90,
            hourlyRateVnd: 200000,
            tuitionVnd: 300000,
          },
        });
        await tx.payment.create({
          data: { studentId: student.id, amountVnd: 300000, paidAt: new Date(), note: 'Demo' },
        });
        await tx.tuitionAdjustment.create({
          data: { studentId: student.id, amountVnd: -50000, reason: 'Demo discount' },
        });
        await tx.calendarConnection.create({
          data: { providerAccountId: `demo-${student.id}@example.com`, scopes: 'calendar.readonly' },
        });
        const op = await tx.syncOperation.create({ data: { status: 'succeeded', pushedCount: 1 } });
        await tx.calendarEventLink.create({
          data: { lessonId: lesson.id, providerEventId: `demo-evt-${lesson.id}`, lastPushedHash: 'demo' },
        });
        await tx.syncConflict.create({
          data: {
            operationId: op.id,
            lessonId: lesson.id,
            providerEventId: `demo-evt-${lesson.id}`,
            localHash: 'demo-local',
            remoteSummary: 'Demo conflict (resolved)',
            resolvedAt: new Date(),
          },
        });
      }
    });
    console.log(`[seed] created ${STUDENTS.length} fictional students with related rows`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
