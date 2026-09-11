import { Context } from 'hono';
import { createD1Db, D1Db } from './d1';
import { getSqliteDb, SqliteDb } from './sqlite';
import * as schema from './schema';

export * from './schema';

export type AppDatabase = D1Db | SqliteDb;

export function getDb(c: Context): AppDatabase {
  // 1. Cloudflare Pages Functions (c.env.DB)
  if (c.env && (c.env as { DB?: D1Database }).DB) {
    const env = c.env as { DB: D1Database; _d1Db?: D1Db };
    if (!env._d1Db) {
      env._d1Db = createD1Db(env.DB);
    }
    return env._d1Db;
  }

  // 2. Node.js middleware context (c.get('db'))
  const contextDb = c.get('db') as AppDatabase | undefined;
  if (contextDb) {
    return contextDb;
  }

  // 3. Fallback to local SQLite instance
  const { db } = getSqliteDb();
  return db;
}
