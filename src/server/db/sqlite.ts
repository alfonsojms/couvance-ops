import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type SqliteDb = BetterSQLite3Database<typeof schema>;

/**
 * Abre (o crea) la base SQLite local del runtime Node/Docker con WAL y claves foráneas activas.
 * Solo se importa desde node-entry: Cloudflare usa D1 y nunca carga este módulo en runtime.
 */
export function openSqliteDb(dbPath: string): { db: SqliteDb; sqlite: Database.Database } {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return { db: drizzle(sqlite, { schema }), sqlite };
}
