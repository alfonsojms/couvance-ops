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

  describe('6. Soft Edit de Proyectos (PATCH /api/projects/:id)', () => {
    let testProjectId = '';

    beforeAll(async () => {
      // Creamos un proyecto para las pruebas de PATCH
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          clientId: createdClientId,
          title: 'Proyecto Para Soft Edit',
          category: 'WEBAPP',
          status: 'IN_PROGRESS',
        }),
      });
      expect(res.status).toBe(201);
      const proj = await res.json();
      testProjectId = proj.id;
    });

    it('PATCH debe editar metadatos exitosamente (200), persistir campos y no alterar clientId ni status', async () => {
      const res = await app.request(`/api/projects/${testProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Proyecto Editado Con Éxito',
          category: 'ECOMMERCE',
          productionUrl: 'https://tienda-acme.com',
          productionStatus: 'ACTIVE',
          codeRepoUrl: 'https://github.com/acme/tienda',
          resourcesUrl: 'https://drive.google.com/tienda',
          hasRecurring: 1,
          recurringAmount: 120.5,
          recurringCurrency: 'USD',
          recurringPeriod: 'MONTHLY',
          recurringRenewalDate: '2026-11-15',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Proyecto Editado Con Éxito');
      expect(body.category).toBe('ECOMMERCE');
      expect(body.productionUrl).toBe('https://tienda-acme.com');
      expect(body.codeRepoUrl).toBe('https://github.com/acme/tienda');
      expect(body.resourcesUrl).toBe('https://drive.google.com/tienda');
      expect(body.hasRecurring).toBe(1);
      expect(body.recurringAmount).toBe(120.5);
      expect(body.recurringCurrency).toBe('USD');
      expect(body.recurringPeriod).toBe('MONTHLY');
      expect(body.recurringRenewalDate).toBe('2026-11-15');
      expect(body.clientId).toBe(createdClientId);
      expect(body.status).toBe('IN_PROGRESS');
    });

    it('PATCH debe rechazar con 400 si se envía status o clientId (strict)', async () => {
      const resStatus = await app.request(`/api/projects/${testProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          status: 'CANCELLED',
        }),
      });
      expect(resStatus.status).toBe(400);

      const resClient = await app.request(`/api/projects/${testProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          clientId: 'otro-cliente-id',
        }),
      });
      expect(resClient.status).toBe(400);
    });

    it('PATCH debe rechazar con 400 si hasRecurring es 1 pero falta la fecha de renovación', async () => {
      const res = await app.request(`/api/projects/${testProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          hasRecurring: 1,
          recurringAmount: 50,
          recurringRenewalDate: '',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/renovaci[oó]n/i);
    });

    it('PATCH sobre un proyecto CANCELLED debe responder 409 Conflict', async () => {
      // 1. Creamos un proyecto y lo cancelamos vía PUT
      const resCrear = await app.request('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          clientId: createdClientId,
          title: 'Proyecto Para Cancelar',
          category: 'LANDING',
          status: 'PROSPECT',
        }),
      });
      expect(resCrear.status).toBe(201);
      const proj = await resCrear.json();

      const resCancel = await app.request(`/api/projects/${proj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          status: 'CANCELLED',
        }),
      });
      expect(resCancel.status).toBe(200);

      // 2. Intentamos editarlo con PATCH
      const resPatch = await app.request(`/api/projects/${proj.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Nuevo Título Imposible',
        }),
      });
      expect(resPatch.status).toBe(409);
      const bodyPatch = await resPatch.json();
      expect(bodyPatch.error).toContain('cancelado no se puede editar');
    });

    it('Regresión: PUT con status CANCELLED cancela hitos PENDING preservando PAID (RN-05)', async () => {
      // Creamos proyecto, presupuesto con hitos, pagamos uno, cancelamos proyecto
      const resProj = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          clientId: createdClientId,
          title: 'Proyecto RN-05 Cascade',
          category: 'LANDING',
        }),
      });
      const proj = await resProj.json();

      // Creamos presupuesto de $1000 con preset 50/50
      const resBudget = await app.request(`/api/projects/${proj.id}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          title: 'Presupuesto Base',
          totalAmount: 1000,
          milestones: [
            { title: 'Anticipo 50%', percentage: 50 },
            { title: 'Final 50%', percentage: 50 },
          ],
        }),
      });
      const budget = await resBudget.json();

      // Aprobamos presupuesto -> hitos pasan a PENDING
      await app.request(`/api/budgets/${budget.id}/approve`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });

      // Pagamos el primer hito
      const hito1 = budget.milestones[0];
      await app.request(`/api/milestones/${hito1.id}/pay`, {
        method: 'PATCH',
        headers: { Cookie: sessionCookie },
      });

      // Cancelamos el proyecto con PUT
      const resCancel = await app.request(`/api/projects/${proj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      expect(resCancel.status).toBe(200);

      // Verificamos los hitos: el pagado sigue PAID, el pendiente quedó CANCELLED
      const resDetail = await app.request(`/api/projects/${proj.id}`, {
        headers: { Cookie: sessionCookie },
      });
      const detail = await resDetail.json();
      const ms = detail.budgets[0].milestones;
      const paidMs = ms.find((m: any) => m.id === hito1.id);
      const otherMs = ms.find((m: any) => m.id !== hito1.id);

      expect(paidMs.status).toBe('PAID');
      expect(otherMs.status).toBe('CANCELLED');
    });

    it('Proyecto editado con productionUrl y COMPLETED aparece en GET /api/showcase (RN-07)', async () => {
      // Editamos testProjectId a COMPLETED vía PUT (para marcar status) y aseguramos productionUrl vía PATCH
      await app.request(`/api/projects/${testProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          productionUrl: 'https://tienda-showcase.com',
          productionStatus: 'ACTIVE',
        }),
      });

      await app.request(`/api/projects/${testProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      });

      const resShowcase = await app.request('/api/showcase', {
        headers: { Cookie: sessionCookie },
      });
      expect(resShowcase.status).toBe(200);
      const showcase = await resShowcase.json();
      const item = showcase.find((p: any) => p.id === testProjectId);
      expect(item).toBeTruthy();
      expect(item.productionUrl).toBe('https://tienda-showcase.com');
      expect(item.productionStatus).toBe('ACTIVE');
    });
  });

  describe('7. Historial de Cobros y Trazabilidad de Ganancias (GET /api/finance/history)', () => {
    it('debe listar los hitos cobrados con detalle de cliente, proyecto y fecha de pago', async () => {
      const res = await app.request('/api/finance/history', {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('totalCollected');
      expect(data).toHaveProperty('totalCount');
      expect(Array.isArray(data.history)).toBe(true);
      expect(data.history.length).toBeGreaterThanOrEqual(1);

      // Verificamos que los elementos contengan la información necesaria para saber de dónde salió cada dólar
      const primerCobro = data.history[0];
      expect(primerCobro).toHaveProperty('id');
      expect(primerCobro).toHaveProperty('milestoneTitle');
      expect(primerCobro).toHaveProperty('amount');
      expect(primerCobro).toHaveProperty('projectTitle');
      expect(primerCobro).toHaveProperty('clientName');
      expect(primerCobro).toHaveProperty('paidAt');
      expect(primerCobro.amount).toBeGreaterThan(0);
    });
  });
});

