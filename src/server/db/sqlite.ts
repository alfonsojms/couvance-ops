import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type SqliteDb = BetterSQLite3Database<typeof schema>;

let sqliteInstance: Database.Database | null = null;
let dbInstance: SqliteDb | null = null;

export function getSqliteDb(customPath?: string): { db: SqliteDb; sqlite: Database.Database } {
  if (dbInstance && sqliteInstance && !customPath) {
    return { db: dbInstance, sqlite: sqliteInstance };
  }

  const dbPath = customPath || process.env.DATABASE_URL?.replace('file:', '') || './data/kodex-ops.db';
  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');

  dbInstance = drizzle(sqliteInstance, { schema });
  return { db: dbInstance, sqlite: sqliteInstance };
}
