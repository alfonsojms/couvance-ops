import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { createD1Db, D1Db } from './d1';
import type { SqliteDb } from './sqlite';
import * as schema from './schema';
import { authConfig } from './schema';
import { sha256 } from '../middlewares/auth';

export * from './schema';
export { type SqliteDb } from './sqlite';
export { createD1Db, type D1Db } from './d1';

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

  throw new Error('Database connection not available in context. Ensure c.env.DB or c.get("db") is configured.');
}

export async function seedInitialAuthIfNeeded(db: AppDatabase, secret: string, env?: Record<string, any>): Promise<boolean> {
  const [existingAuth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!existingAuth) {
    const getVal = (key: string, fallback: string) => {
      if (env && env[key]) return env[key];
      if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
      return fallback;
    };

    const initialPin = getVal('INITIAL_PIN', '12345678');
    const q1 = getVal('SECURITY_Q1', '¿Cuál es el nombre de tu primera mascota?');
    const a1 = getVal('SECURITY_A1', 'couvance');
    const q2 = getVal('SECURITY_Q2', '¿En qué ciudad se fundó la agencia?');
    const a2 = getVal('SECURITY_A2', 'valencia');

    const pinHash = await sha256(initialPin, secret);
    const a1Hash = await sha256(a1, secret);
    const a2Hash = await sha256(a2, secret);

    await db.insert(authConfig).values({
      id: 1,
      pinHash,
      q1,
      a1Hash,
      q2,
      a2Hash,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }
  return false;
}

