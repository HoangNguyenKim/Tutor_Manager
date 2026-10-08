import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { BACKEND_CONFIG } from '../config.provider';
import type { BackendConfig } from '../config';
import { PrismaClient } from '../generated/prisma/client';
import { resolveDbPath } from './db-path';
import { applyPendingMigrations, resolveMigrationsDir } from './migrations';

/**
 * Single SQLite connection via better-sqlite3. DB file lives in DATA_DIR
 * (Electron passes app.getPath('userData')). WAL + FK enforced per boot.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly dbPath: string;

  constructor(@Inject(BACKEND_CONFIG) config: BackendConfig) {
    const dbPath = resolveDbPath(config.dataDir);
    const setup = new Database(dbPath);
    let applied: string[] = [];
    try {
      setup.pragma('journal_mode = WAL');
      setup.pragma('busy_timeout = 5000');
      setup.pragma('synchronous = NORMAL');
      const dir = resolveMigrationsDir();
      applied = dir ? applyPendingMigrations(setup, dir) : [];
    } finally {
      setup.close();
    }
    super({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });
    this.dbPath = dbPath;
    if (applied.length > 0) {
      this.logger.log(`applied migrations: ${applied.join(', ')}`);
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    // foreign_keys is per-connection; the adapter opens its own handle.
    await this.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    const mode = await this.$queryRawUnsafe<{ journal_mode: string }[]>(`PRAGMA journal_mode`);
    this.logger.log(`SQLite ready at ${this.dbPath} (journal_mode=${mode[0]?.journal_mode})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
