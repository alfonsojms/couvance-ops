import { vi } from 'vitest';
import app from '../../src/server/app';
import { setGlobalDb, seedInitialAuthIfNeeded } from '../../src/server/db';
import { getPinSecret } from '../../src/server/middlewares/auth';
import { createTestDatabase, TEST_DRIVERS, type TestDriver } from './db';

export type ContractDriver = TestDriver;
export const CONTRACT_DRIVERS: ContractDriver[] = TEST_DRIVERS;

export const DEFAULT_PIN = '12345678';
export const START_TIME = new Date('2026-10-16T12:00:00.000Z');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOLATILE_KEYS = new Set(['token', 'resetToken']);

export interface ContractResponse {
  status: number;
  body: unknown;
}

/**
 * Harness para tests de contrato de la API: BD con migraciones reales (SQLite en memoria o D1 local),
 * reloj fijo (avanza 1 s por petición para que el orden por fecha sea determinista)
 * y normalización estable de UUIDs para snapshots.
 */
export async function createContractHarness(driver: ContractDriver = 'sqlite') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START_TIME);

  const testDb = await createTestDatabase(driver);
  await seedInitialAuthIfNeeded(testDb.db, getPinSecret({} as any));
  // D1 llega a la app como binding `env.DB` (igual que en Cloudflare); SQLite como instancia global (igual que en Node).
  const env = testDb.d1 ? { DB: testDb.d1 } : undefined;
  if (!env) setGlobalDb(testDb.db);
  const closeDb = testDb.dispose;

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
        Object.entries(value).map(([key, v]) => [
          key,
          VOLATILE_KEYS.has(key) && typeof v === 'string' ? '<token>' : normalize(v),
        ]),
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
      env ? { ...env } : undefined,
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
    /** Acceso directo a la BD del harness (p. ej. para instalar triggers que fuercen fallos). */
    db: testDb.db,
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
