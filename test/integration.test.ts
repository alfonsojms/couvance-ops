import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import app from '../src/server/app';
import * as schema from '../src/server/db/schema';
import { setGlobalDb, seedInitialAuthIfNeeded } from '../src/server/db';
import { getPinSecret } from '../src/server/middlewares/auth';

describe('QA - Nivel 2 y 3: Pruebas de Integración (API + Base de Datos en Memoria)', () => {
  let sessionCookie = '';
  let createdClientId = '';
  let createdProjectId = '';

  beforeAll(async () => {
    // 1. Configuramos una base de datos SQLite en memoria exclusiva para este test
    const sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite, { schema });
    setGlobalDb(db);

    // 2. Aplicamos las migraciones Drizzle en la BD en memoria
    migrate(db, { migrationsFolder: './drizzle' });

    // 3. Sembramos el usuario con PIN por defecto '12345678'
    const secret = getPinSecret({} as any);
    await seedInitialAuthIfNeeded(db, secret);
  });

  describe('1. Seguridad: Protección de rutas privadas (Auth Middleware)', () => {
    it('debe responder 401 Unauthorized si intentamos leer clientes sin cookie de sesión', async () => {
      const res = await app.request('/api/clients');
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('2. Autenticación: Desbloqueo mediante PIN de 8 dígitos', () => {
    it('debe rechazar con 401 si enviamos un PIN incorrecto', async () => {
      const res = await app.request('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '99999999' }),
      });

      expect(res.status).toBe(401);
    });

    it('debe responder 200 OK y emitir cookie couvance_session si el PIN es correcto (12345678)', async () => {
      const res = await app.request('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '12345678' }),
      });

      expect(res.status).toBe(200);

      // Obtenemos la cookie emitida por el servidor
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();
      expect(setCookieHeader).toContain('couvance_session=');

      // Guardamos la cookie para usarla en las siguientes peticiones autenticadas
      sessionCookie = setCookieHeader!.split(';')[0];
    });
  });

  describe('3. Flujo de Negocio y Regla RN-06 (Integridad Referencial)', () => {
    it('debe permitir crear un nuevo cliente cuando estamos autenticados', async () => {
      const res = await app.request('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          name: 'Acme Corporation',
          contactName: 'Carlos Gómez',
          phone: '+18095551234',
          email: 'carlos@acme.com',
        }),
      });

      expect(res.status).toBe(201);
      const cliente = await res.json();
      expect(cliente).toHaveProperty('id');
      expect(cliente.name).toBe('Acme Corporation');

      createdClientId = cliente.id;
    });

    it('debe permitir crear un proyecto vinculado a ese cliente', async () => {
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          clientId: createdClientId,
          title: 'Portal Corporativo Acme',
          category: 'CORPORATE',
        }),
      });

      expect(res.status).toBe(201);
      const proyecto = await res.json();
      expect(proyecto).toHaveProperty('id');
      expect(proyecto.clientId).toBe(createdClientId);

      createdProjectId = proyecto.id;
    });

    it('RN-06: debe RECHAZAR con 409 Conflict si intentamos borrar un cliente que tiene proyectos asociados', async () => {
      // Intentamos borrar Acme Corporation teniendo el proyecto "Portal Corporativo Acme" activo
      const res = await app.request(`/api/clients/${createdClientId}`, {
        method: 'DELETE',
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error).toContain('posee 1 proyecto(s) asociado(s)');
    });

    it('debe permitir borrar con 200 OK un cliente que NO tiene proyectos asociados', async () => {
      // 1. Creamos un cliente limpio sin proyectos (ej. cargado por error o prospecto descartado)
      const resCrear = await app.request('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          name: 'Cliente Sin Proyectos S.A.',
          contactName: 'Laura Pérez',
        }),
      });
      expect(resCrear.status).toBe(201);
      const clienteVacio = await resCrear.json();

      // 2. Al no tener proyectos asociados, su eliminación debe ser permitida con 200 OK
      const deleteClientRes = await app.request(`/api/clients/${clienteVacio.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(deleteClientRes.status).toBe(200);
      const body = await deleteClientRes.json();
      expect(body.ok).toBe(true);
    });
  });

  describe('5. Manejo de Errores 404 en Backend', () => {
    it('debe responder 404 con JSON descriptivo si se invoca un endpoint de API inexistente con sesión', async () => {
      const res = await app.request('/api/rutas-inexistentes/xyz', {
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty('error', 'Not Found');
      expect(body).toHaveProperty('statusCode', 404);
      expect(body).toHaveProperty('message');
    });
  });
});
