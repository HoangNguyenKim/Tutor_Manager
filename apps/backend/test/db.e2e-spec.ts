import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';
import { resolveDbPath } from '../src/db/db-path';
import { applyPendingMigrations, resolveMigrationsDir } from '../src/db/migrations';

function freshDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tm-db-test-'));
}

function bootPrisma(dataDir: string): PrismaClient {
  const dbPath = resolveDbPath(dataDir);
  const setup = new Database(dbPath);
  try {
    setup.pragma('journal_mode = WAL');
    const dir = resolveMigrationsDir();
    expect(dir).toBeDefined();
    applyPendingMigrations(setup, dir as string);
  } finally {
    setup.close();
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });
}

describe('SQLite persistence', () => {
  it('migrates an empty database and enforces FK + transactions', async () => {
    const prisma = bootPrisma(freshDir());
    try {
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      const tables = (await prisma.$queryRawUnsafe<{ name: string }[]>(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )).map((t) => t.name);
      for (const t of ['Student', 'Lesson', 'Payment', 'TuitionAdjustment', 'AppSetting', 'CalendarConnection', 'CalendarEventLink', 'SyncOperation', 'SyncConflict']) {
        expect(tables).toContain(t);
      }
      // Restrict: cannot delete a student with lessons.
      const student = await prisma.student.create({ data: { name: 'FK Demo (fictional)' } });
      await prisma.lesson.create({
        data: {
          studentId: student.id,
          scheduledStart: new Date(),
          scheduledMinutes: 60,
          subject: 'Toán',
          billableMinutes: 60,
          hourlyRateVnd: 200000,
          tuitionVnd: 200000,
        },
      });
      await expect(prisma.student.delete({ where: { id: student.id } })).rejects.toThrow();
      // Transaction rollback: payment must not persist when the second write fails.
      const before = await prisma.payment.count();
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.payment.create({ data: { studentId: student.id, amountVnd: 100000, paidAt: new Date() } });
          await tx.lesson.create({
            data: {
              studentId: 'no-such-student',
              scheduledStart: new Date(),
              scheduledMinutes: 60,
              subject: 'Toán',
              billableMinutes: 60,
              hourlyRateVnd: 1,
              tuitionVnd: 1,
            },
          });
        }),
      ).rejects.toThrow();
      expect(await prisma.payment.count()).toBe(before);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('re-applies migrations idempotently on an existing database', async () => {
    const dir = freshDir();
    const first = bootPrisma(dir);
    await first.student.create({ data: { name: 'Persist (fictional)' } });
    await first.$disconnect();
    // Simulate restart: boot again against the same file.
    const second = bootPrisma(dir);
    try {
      expect(await second.student.count()).toBe(1);
      const applied = second.$queryRawUnsafe<{ name: string }[]>(`SELECT name FROM schema_migrations`);
      const expected = fs.readdirSync(resolveMigrationsDir() as string).filter((d) => {
        try {
          return fs.statSync(path.join(resolveMigrationsDir() as string, d)).isDirectory();
        } catch {
          return false;
        }
      }).length;
      await expect(applied).resolves.toHaveLength(expected);
    } finally {
      await second.$disconnect();
    }
  });

  it('stores no plaintext OAuth credentials', async () => {
    const prisma = bootPrisma(freshDir());
    try {
      const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(CalendarConnection)`);
      const names = cols.map((c) => c.name.toLowerCase());
      expect(names).not.toContain('refreshtoken');
      expect(names).not.toContain('accesstoken');
      expect(names).not.toContain('clientsecret');
    } finally {
      await prisma.$disconnect();
    }
  });
});
