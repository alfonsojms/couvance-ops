import type { BatchItem } from 'drizzle-orm/batch';
import type { AppDatabase, D1Db } from './index';

/** Sentencias Drizzle sin ejecutar (sin `await`), construidas sobre la misma instancia `db`. */
export type AtomicStatements = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];

/** En drizzle-orm `batch()` solo existe en la instancia de D1; better-sqlite3 no lo declara. */
export function isD1(db: AppDatabase): db is D1Db {
  return 'batch' in db && typeof (db as D1Db).batch === 'function';
}

/**
 * Ejecuta varias escrituras como una sola unidad atómica en ambos runtimes:
 * - D1 (Cloudflare): `db.batch([...])`, que D1 ejecuta en una transacción implícita.
 * - better-sqlite3 (Node/Docker): `db.transaction()` síncrona; si una sentencia lanza, se revierte todo.
 */
export async function runAtomic(db: AppDatabase, statements: AtomicStatements): Promise<void> {
  if (isD1(db)) {
    await db.batch(statements);
    return;
  }

  db.transaction(() => {
    for (const statement of statements) {
      // En better-sqlite3 los query builders son síncronos y exponen `.run()`.
      (statement as unknown as { run(): unknown }).run();
    }
  });
}
