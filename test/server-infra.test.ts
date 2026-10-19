import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { clients, type AppDatabase } from '../src/server/db';
import { createTestDatabase, TEST_DRIVERS } from './helpers/db';
import { runAtomic } from '../src/server/db/atomic';
import { HttpError, handleHttpError, parseBody, requireId } from '../src/server/shared/http';
import { conflict, internal, invalid, notFound, unauthorized } from '../src/server/shared/errors';

describe('shared/http', () => {
  const schemaWithMessage = z.object({ name: z.string().min(1, 'El nombre es obligatorio') });

  function buildApp() {
    const app = new Hono();
    app.post('/items/:id', async (c) => {
      const id = requireId(c.req.param('id'), 'Identificador inválido.');
      const body = await parseBody(c, schemaWithMessage, 'Datos inválidos');
      return c.json({ id, name: body.name });
    });
    app.get('/missing', () => {
      throw new HttpError(404, 'No encontrado');
    });
    app.get('/boom', () => {
      throw new Error('fallo inesperado');
    });
    app.onError((err, c) => handleHttpError(err, c) ?? c.json({ error: 'unhandled' }, 500));
    return app;
  }

  const post = (app: Hono, path: string, body?: string) =>
    app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

  it('devuelve los datos validados cuando id y body son correctos', async () => {
    const res = await post(buildApp(), '/items/abc-123', JSON.stringify({ name: 'Ana' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'abc-123', name: 'Ana' });
  });

  it('responde 400 con el mensaje dado cuando el id es inválido, antes de leer el body', async () => {
    const res = await post(buildApp(), '/items/bad;id', 'no-json');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Identificador inválido.' });
  });

  it('responde 400 con el primer mensaje de Zod cuando el body no valida', async () => {
    const res = await post(buildApp(), '/items/abc', JSON.stringify({ name: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'El nombre es obligatorio' });
  });

  it('trata un body que no es JSON como null (mismo mensaje que Zod da para null)', async () => {
    const res = await post(buildApp(), '/items/abc', 'no-json');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Expected object, received null' });
  });

  it('mapea HttpError a su status y deja pasar los demás errores', async () => {
    const app = buildApp();
    const missing = await app.request('/missing');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'No encontrado' });

    const boom = await app.request('/boom');
    expect(boom.status).toBe(500);
    expect(await boom.json()).toEqual({ error: 'unhandled' });
  });

  it('mapea cada DomainError a su status con solo { error } (sin stack)', async () => {
    const app = new Hono();
    const cases = [
      [invalid('dato inválido'), 400],
      [unauthorized('PIN incorrecto'), 401],
      [notFound('no existe'), 404],
      [conflict('en conflicto'), 409],
      [internal('sin configurar'), 500],
    ] as const;
    cases.forEach(([error], i) =>
      app.get(`/domain/${i}`, () => {
        throw error;
      }),
    );
    app.onError((err, c) => handleHttpError(err, c) ?? c.json({ error: 'unhandled' }, 500));

    for (const [i, [error, status]] of cases.entries()) {
      const res = await app.request(`/domain/${i}`);
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: error.message });
    }
  });
});

describe.each(TEST_DRIVERS)('db/runAtomic [%s]', (driver) => {
  let db: AppDatabase;
  let dispose: () => Promise<void> | void;

  beforeAll(async () => {
    ({ db, dispose } = await createTestDatabase(driver));
  }, 60_000);

  afterAll(() => dispose());

  const clientRow = (id: string, name: string) => ({
    id,
    name,
    createdAt: '2026-10-16T00:00:00.000Z',
    updatedAt: '2026-10-16T00:00:00.000Z',
  });

  it('aplica todas las sentencias cuando ninguna falla', async () => {
    await runAtomic(db, [
      db.insert(clients).values(clientRow('atomic-ok-1', 'Uno')),
      db.insert(clients).values(clientRow('atomic-ok-2', 'Dos')),
      db.update(clients).set({ name: 'Uno editado' }).where(eq(clients.id, 'atomic-ok-1')),
    ]);

    const rows = await db.select().from(clients).where(eq(clients.id, 'atomic-ok-1')).all();
    expect(rows[0]?.name).toBe('Uno editado');
    expect(await db.select().from(clients).where(eq(clients.id, 'atomic-ok-2')).all()).toHaveLength(1);
  });

  it('revierte todo si una sentencia falla a mitad de camino', async () => {
    await expect(
      runAtomic(db, [
        db.insert(clients).values(clientRow('atomic-rollback-1', 'Antes del fallo')),
        // Clave primaria duplicada: la segunda sentencia falla.
        db.insert(clients).values(clientRow('atomic-rollback-1', 'Duplicado')),
      ]),
    ).rejects.toThrow();

    expect(await db.select().from(clients).where(eq(clients.id, 'atomic-rollback-1')).all()).toHaveLength(0);
  });
});
