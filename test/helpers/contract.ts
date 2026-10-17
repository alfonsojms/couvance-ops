import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import app from '../../src/server/app';
import * as schema from '../../src/server/db/schema';
import { createD1Db, setGlobalDb, seedInitialAuthIfNeeded } from '../../src/server/db';
import { getPinSecret } from '../../src/server/middlewares/auth';

/** `sqlite`: better-sqlite3 en memoria (Node/Docker). `d1`: D1 local real vía miniflare (producción en Cloudflare). */
export type ContractDriver = 'sqlite' | 'd1';
export const CONTRACT_DRIVERS: ContractDriver[] = ['sqlite', 'd1'];

export const DEFAULT_PIN = '12345678';
export const START_TIME = new Date('2026-10-16T12:00:00.000Z');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOLATILE_KEYS = new Set(['token', 'resetToken']);

export interface ContractResponse {
  status: number;
  body: unknown;
}

/** Aplica las migraciones SQL de ./drizzle sobre un binding D1. */
async function migrateD1(d1: D1Database) {
  const files = fs.readdirSync('./drizzle').filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const statements = fs
      .readFileSync(path.join('./drizzle', file), 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    await d1.batch(statements.map((s) => d1.prepare(s)));
  }
}

/**
 * Harness para tests de contrato de la API: BD con migraciones reales (SQLite en memoria o D1 local),
 * reloj fijo (avanza 1 s por petición para que el orden por fecha sea determinista)
 * y normalización estable de UUIDs para snapshots.
 */
export async function createContractHarness(driver: ContractDriver = 'sqlite') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START_TIME);

  const secret = getPinSecret({} as any);
  let env: { DB: D1Database } | undefined;
  let closeDb: () => Promise<void> | void;

  if (driver === 'd1') {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
    await migrateD1(proxy.env.DB);
    await seedInitialAuthIfNeeded(createD1Db(proxy.env.DB), secret);
    env = { DB: proxy.env.DB };
    closeDb = () => proxy.dispose();
  } else {
    const sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: './drizzle' });
    setGlobalDb(db);
    await seedInitialAuthIfNeeded(db, secret);
    closeDb = () => sqlite.close();
  }

  let cookie = '';
  const ids = new Map<string, string>();

  function normalize(value: unknown): unknown {
    if (typeof value === 'string' && UUID_RE.test(value)) {
      if (!ids.has(value)) ids.set(value, `<id:${ids.size + 1}>`);
      return ids.get(value);
    }
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [key, VOLATILE_KEYS.has(key) && typeof v === 'string' ? '<token>' : normalize(v)])
      );
    }
    return value;
  }

  /** Petición cruda: devuelve el cuerpo sin normalizar (para reutilizar IDs reales). */
  async function raw(method: string, path: string, body?: unknown) {
    vi.setSystemTime(new Date(Date.now() + 1000));
    const res = await app.request(
      path,
      {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      // Copia por petición: getDb() cachea la instancia Drizzle en el objeto env.
      env ? { ...env } : undefined
    );
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0];
      cookie = pair.endsWith('=') ? '' : pair;
    }
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // cuerpo no JSON (p. ej. 404 de texto plano)
    }
    return { status: res.status, body: parsed as any, headers: res.headers };
  }

  /** Petición normalizada lista para snapshot. */
  async function call(method: string, path: string, body?: unknown): Promise<ContractResponse> {
    const res = await raw(method, path, body);
    return { status: res.status, body: normalize(res.body) };
  }

  return {
    raw,
    call,
    normalize,
    unlock: (pin = DEFAULT_PIN) => raw('POST', '/api/auth/unlock', { pin }),
    clearSession: () => {
      cookie = '';
    },
    dispose: async () => {
      await closeDb();
      vi.useRealTimers();
    },
  };
}

export type ContractHarness = Awaited<ReturnType<typeof createContractHarness>>;
