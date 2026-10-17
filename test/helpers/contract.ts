import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { vi } from 'vitest';
import app from '../../src/server/app';
import * as schema from '../../src/server/db/schema';
import { setGlobalDb, seedInitialAuthIfNeeded } from '../../src/server/db';
import { getPinSecret } from '../../src/server/middlewares/auth';

export const DEFAULT_PIN = '12345678';
export const START_TIME = new Date('2026-10-16T12:00:00.000Z');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOLATILE_KEYS = new Set(['token', 'resetToken']);

export interface ContractResponse {
  status: number;
  body: unknown;
}

/**
 * Harness para tests de contrato de la API: BD SQLite en memoria con migraciones reales,
 * reloj fijo (avanza 1 s por petición para que el orden por fecha sea determinista)
 * y normalización estable de UUIDs para snapshots.
 */
export async function createContractHarness() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START_TIME);

  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: './drizzle' });
  setGlobalDb(db);
  await seedInitialAuthIfNeeded(db, getPinSecret({} as any));

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
    const res = await app.request(path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
    dispose: () => {
      sqlite.close();
      vi.useRealTimers();
    },
  };
}

export type ContractHarness = Awaited<ReturnType<typeof createContractHarness>>;
