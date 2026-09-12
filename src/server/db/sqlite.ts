import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type SqliteDb = BetterSQLite3Database<typeof schema>;

let sqliteInstance: Database.Database | null = null;
let dbInstance: SqliteDb | null = null;

export function getSqliteDb(customPath?: string): { db: SqliteDb; sqlite: Database.Database } {
  if (dbInstance && sqliteInstance && !customPath) {
    return { db: dbInstance, sqlite: sqliteInstance };
  }

  const dbPath = customPath || process.env.DATABASE_URL?.replace('file:', '') || './data/kodex-ops.db';
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (!customPath) {
    sqliteInstance = sqlite;
    dbInstance = db;
  }

  return { db, sqlite };
}

