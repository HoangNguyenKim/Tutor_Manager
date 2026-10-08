import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Dev/migration DB only. Runtime uses DATA_DIR via the better-sqlite3 adapter.
    url: process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
