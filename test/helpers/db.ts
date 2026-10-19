import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { getPlatformProxy } from 'wrangler';
import * as schema from '../../src/server/db/schema';
import { createD1Db, type AppDatabase } from '../../src/server/db';

/** `sqlite`: better-sqlite3 en memoria (Node/Docker). `d1`: D1 local real vía miniflare (producción en Cloudflare). */
export type TestDriver = 'sqlite' | 'd1';
export const TEST_DRIVERS: TestDriver[] = ['sqlite', 'd1'];

export interface TestDatabase {
  db: AppDatabase;
  /** Binding D1 crudo (solo en el driver `d1`), para pasarlo como `env.DB` a la app. */
  d1?: D1Database;
  dispose: () => Promise<void> | void;
}

/** Aplica las migraciones SQL de ./drizzle sobre un binding D1. */
async function migrateD1(d1: D1Database) {
  const files = fs
    .readdirSync('./drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const statements = fs
      .readFileSync(path.join('./drizzle', file), 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    await d1.batch(statements.map((s) => d1.prepare(s)));
  }
}

/** Base de datos de test vacía con las migraciones reales aplicadas. */
export async function createTestDatabase(driver: TestDriver): Promise<TestDatabase> {
  if (driver === 'd1') {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
    await migrateD1(proxy.env.DB);
    return { db: createD1Db(proxy.env.DB), d1: proxy.env.DB, dispose: () => proxy.dispose() };
  }

  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: './drizzle' });
  return { db, dispose: () => sqlite.close() };
}
