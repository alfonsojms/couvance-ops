import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createContractHarness,
  type ContractHarness,
  type JsonBody,
  CONTRACT_DRIVERS,
  DEFAULT_PIN,
} from './helpers/contract';

/**
 * Tests de contrato de la API (caracterización).
 *
 * Fijan con snapshots el comportamiento HTTP actual (status + cuerpo JSON) de cada endpoint,
 * recorriendo un escenario de negocio completo en orden. Sirven de red de seguridad para el
 * refactor por capas: cualquier cambio en una respuesta rompe el snapshot y debe justificarse.
 * Las claves de los objetos se comparan ordenadas, así que reordenar campos no rompe nada.
 *
 * El escenario corre sobre los dos drivers: `sqlite` (Node/Docker) y `d1` (D1 local real vía
 * miniflare, el camino de producción en Cloudflare). Cada driver tiene sus propios snapshots.
 */
describe.each(CONTRACT_DRIVERS)('Contrato de la API [%s]', (driver) => {
  let h: ContractHarness;
  const ids: Record<string, string> = {};

  /** Ejecuta la petición, fija su respuesta normalizada en el snapshot y devuelve el cuerpo crudo. */
  async function pin(method: string, path: string, body?: unknown) {
    const res = await h.raw(method, path, body);
    expect({ status: res.status, body: h.normalize(res.body) }).toMatchSnapshot();
    return res.body;
  }

  const milestonesOf = (budget: JsonBody): JsonBody[] => budget?.milestones ?? budget?.budget?.milestones ?? [];

  beforeAll(async () => {
    h = await createContractHarness(driver);
  }, 60_000);

  afterAll(() => h.dispose());

  describe('auth sin sesión', () => {
    it('status sin sesión', async () => {
      await pin('GET', '/api/auth/status');
    });

    it('rutas privadas sin sesión responden 401', async () => {
      await pin('GET', '/api/clients');
    });

    it('questions es público', async () => {
      await pin('GET', '/api/auth/questions');
    });

    it('unlock con PIN incorrecto y con formato inválido', async () => {
      await pin('POST', '/api/auth/unlock', { pin: '99999999' });
      await pin('POST', '/api/auth/unlock', { pin: '12' });
    });

    it('unlock correcto abre sesión', async () => {
      await pin('POST', '/api/auth/unlock', { pin: DEFAULT_PIN });
      await pin('GET', '/api/auth/status');
      await pin('GET', '/api/auth/me');
      await pin('GET', '/api/auth/settings');
    });
  });

  describe('clients', () => {
    it('crea clientes y valida el body', async () => {
      ids.dental = (
        await pin('POST', '/api/clients', {
          name: 'Clínica Dental Sonrisa',
          contactName: 'Dra. Marta Pérez',
          phone: '+34600000101',
          email: 'marta@sonrisa.example',
          notes: 'Paga siempre por transferencia',
        })
      ).id;
      ids.ferre = (await pin('POST', '/api/clients', { name: 'Ferretería El Tornillo' })).id;
      ids.lonely = (await pin('POST', '/api/clients', { name: 'Cliente sin proyectos' })).id;
      await pin('POST', '/api/clients', { name: '' });
      await pin('POST', '/api/clients', { name: 'Email roto', email: 'no-es-email' });
    });

    it('actualiza un cliente y maneja ids inválidos o inexistentes', async () => {
      await pin('PUT', `/api/clients/${ids.ferre}`, { name: 'Ferretería El Tornillo SL', phone: '+34600000102' });
      await pin('PUT', '/api/clients/bad;id', { name: 'X' });
      await pin('PUT', '/api/clients/00000000-0000-4000-8000-000000000000', { name: 'X' });
    });

    it('lista clientes sin proyectos', async () => {
      await pin('GET', '/api/clients');
    });
  });

  describe('projects', () => {
    it('crea proyectos con y sin recurrencia', async () => {
      ids.web = (
        await pin('POST', '/api/projects', {
          clientId: ids.dental,
          title: 'Web corporativa con reserva de citas',
          category: 'CORPORATE',
          productionUrl: 'https://sonrisa.example.com',
          hasRecurring: 1,
          recurringAmount: 180,
          recurringPeriod: 'ANNUALLY',
          recurringRenewalDate: '2026-10-28',
        })
      ).id;
      ids.shop = (
        await pin('POST', '/api/projects', {
          clientId: ids.ferre,
          title: 'Tienda online de herramientas',
          category: 'ECOMMERCE',
          hasRecurring: 1,
          recurringAmount: 29.99,
          recurringPeriod: 'MONTHLY',
          recurringRenewalDate: '2026-01-31',
        })
      ).id;
      ids.landing = (
        await pin('POST', '/api/projects', {
          clientId: ids.ferre,
          title: 'Landing de catálogo',
          category: 'LANDING',
        })
      ).id;
      // Mantenimiento mensual que vence dentro de 30 días y nunca se renueva: alimenta recurringAlerts del radar.
      ids.cafe = (
        await pin('POST', '/api/projects', {
          clientId: ids.dental,
          title: 'Mantenimiento de la web del consultorio',
          category: 'WEBAPP',
          status: 'IN_PROGRESS',
          hasRecurring: 1,
          recurringAmount: 49.5,
          recurringPeriod: 'MONTHLY',
          recurringRenewalDate: '2026-11-05',
        })
      ).id;
    });

    it('rechaza proyectos inválidos', async () => {
      await pin('POST', '/api/projects', { clientId: ids.dental, title: '', category: 'LANDING' });
      await pin('POST', '/api/projects', {
        clientId: ids.dental,
        title: 'Sin fecha',
        category: 'LANDING',
        hasRecurring: 1,
        recurringAmount: 10,
      });
      await pin('POST', '/api/projects', { clientId: 'bad;id', title: 'X', category: 'LANDING' });
    });

    it('lista proyectos (todos y filtrado por estado) y obtiene el detalle', async () => {
      await pin('GET', '/api/projects');
      await pin('GET', '/api/projects?status=PROSPECT');
      await pin('GET', `/api/projects/${ids.web}`);
      await pin('GET', '/api/projects/00000000-0000-4000-8000-000000000000');
      await pin('GET', '/api/projects/bad;id');
    });

    it('soft edit con PATCH', async () => {
      await pin('PATCH', `/api/projects/${ids.landing}`, {
        title: 'Landing de catálogo 2026',
        codeRepoUrl: 'https://github.com/example/landing',
      });
      await pin('PATCH', `/api/projects/${ids.landing}`, { status: 'COMPLETED' });
    });
  });

  describe('budgets', () => {
    it('crea presupuestos con absorción del residuo y valida la regla del 100%', async () => {
      const web = await pin('POST', `/api/projects/${ids.web}/budgets`, {
        title: 'Diseño y desarrollo web',
        totalAmount: 2400,
        milestones: [
          { title: '50% Anticipo', percentage: 50, dueDate: '2026-10-10' },
          { title: '50% Entrega', percentage: 50, dueDate: '2026-10-20' },
        ],
      });
      ids.webBudget = web.id;

      const shop = await pin('POST', `/api/projects/${ids.shop}/budgets`, {
        title: 'Tienda a medida',
        totalAmount: 1000,
        currency: 'EUR',
        milestones: [
          { title: 'Anticipo', percentage: 33, dueDate: '2026-10-01' },
          { title: 'Catálogo', percentage: 33, dueDate: '2026-10-17' },
          { title: 'Lanzamiento', percentage: 34, dueDate: '2026-11-30' },
        ],
      });
      ids.shopBudget = shop.id;

      ids.landingBudget = (
        await pin('POST', `/api/projects/${ids.landing}/budgets`, {
          title: 'Landing',
          totalAmount: 950,
          milestones: [{ title: 'Entrega', percentage: 100, dueDate: '2026-10-18' }],
        })
      ).id;

      ids.rejectedBudget = (
        await pin('POST', `/api/projects/${ids.landing}/budgets`, {
          title: 'Landing premium',
          totalAmount: 1500,
          milestones: [{ title: 'Entrega', percentage: 100 }],
        })
      ).id;

      await pin('POST', `/api/projects/${ids.web}/budgets`, {
        title: 'No suma 100',
        totalAmount: 100,
        milestones: [
          { title: 'A', percentage: 60 },
          { title: 'B', percentage: 30 },
        ],
      });
      await pin('POST', `/api/projects/${ids.web}/budgets`, {
        title: 'Decimales',
        totalAmount: 99.5,
        milestones: [{ title: 'A', percentage: 100 }],
      });
      await pin('POST', '/api/projects/00000000-0000-4000-8000-000000000000/budgets', {
        title: 'Proyecto inexistente',
        totalAmount: 100,
        milestones: [{ title: 'A', percentage: 100 }],
      });
    });

    it('edita un presupuesto en DRAFT y lo consulta', async () => {
      await pin('PUT', `/api/budgets/${ids.shopBudget}`, {
        title: 'Tienda a medida v2',
        totalAmount: 1001,
        currency: 'EUR',
        milestones: [
          { title: 'Anticipo', percentage: 40, dueDate: '2026-10-01' },
          { title: 'Catálogo', percentage: 30, dueDate: '2026-10-17' },
          { title: 'Lanzamiento', percentage: 30, dueDate: '2026-11-30' },
        ],
      });
      await pin('GET', `/api/budgets/${ids.shopBudget}`);
      await pin('GET', '/api/budgets/00000000-0000-4000-8000-000000000000');
      await pin('GET', `/api/projects/${ids.shop}/budgets`);
    });

    it('aprueba, rechaza y no permite editar fuera de DRAFT', async () => {
      await pin('POST', `/api/budgets/${ids.webBudget}/approve`);
      await pin('POST', `/api/budgets/${ids.shopBudget}/approve`);
      await pin('POST', `/api/budgets/${ids.landingBudget}/approve`);
      await pin('POST', `/api/budgets/${ids.rejectedBudget}/reject`);
      await pin('PUT', `/api/budgets/${ids.webBudget}`, {
        title: 'No editable',
        totalAmount: 10,
        milestones: [{ title: 'A', percentage: 100 }],
      });
      await pin('POST', '/api/budgets/bad;id/approve');
    });

    it('cobra hitos individuales y con pay-all', async () => {
      const web = await h.raw('GET', `/api/budgets/${ids.webBudget}`);
      const [advance] = milestonesOf(web.body);
      ids.webAdvance = advance.id;
      await pin('PATCH', `/api/milestones/${ids.webAdvance}/pay`);

      const shop = await h.raw('GET', `/api/budgets/${ids.shopBudget}`);
      ids.shopAdvance = milestonesOf(shop.body)[0].id;
      await pin('PATCH', `/api/milestones/${ids.shopAdvance}/pay`);

      await pin('POST', `/api/budgets/${ids.landingBudget}/pay-all`);
      await pin('PATCH', '/api/milestones/00000000-0000-4000-8000-000000000000/pay');
      await pin('GET', `/api/projects/${ids.web}/budgets`);
    });
  });

  describe('projects: cambios de estado y renovaciones', () => {
    it('completa y cancela proyectos con PUT (cascada no destructiva)', async () => {
      await pin('PUT', `/api/projects/${ids.landing}`, {
        status: 'COMPLETED',
        productionUrl: 'https://catalogo.example.com',
      });
      await pin('PUT', `/api/projects/${ids.shop}`, { status: 'CANCELLED' });
      await pin('GET', `/api/projects/${ids.shop}`);
      await pin('PATCH', `/api/projects/${ids.shop}`, { title: 'Editar cancelado' });
    });

    it('renueva servicios recurrentes por las tres rutas', async () => {
      await pin('POST', `/api/projects/${ids.web}/renew`);
      await pin('POST', `/api/finance/projects/${ids.shop}/renew`);
      await pin('POST', `/api/finance/${ids.web}/renew`);
      await pin('POST', `/api/projects/${ids.landing}/renew`);
      await pin('POST', '/api/projects/bad;id/renew');
    });
  });

  describe('finance, showcase y listados con totales', () => {
    it('radar, métricas e historial', async () => {
      await pin('GET', '/api/finance/radar');
      await pin('GET', '/api/finance/metrics');
      await pin('GET', '/api/finance/history');
    });

    it('showcase', async () => {
      await pin('GET', '/api/showcase');
    });

    it('listados con totales', async () => {
      await pin('GET', '/api/projects');
      await pin('GET', '/api/projects?status=IN_PROGRESS');
      await pin('GET', '/api/clients');
    });
  });

  describe('backup', () => {
    it('exporta datos sin credenciales', async () => {
      const res = await h.raw('GET', '/api/backup/export');
      expect(res.headers.get('content-disposition')).toMatchSnapshot();
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toMatch(/pin_?hash|a1_?hash|a2_?hash|auth_?config/i);
      expect({ status: res.status, body: h.normalize(res.body) }).toMatchSnapshot();
    });
  });

  describe('clients: borrado (RN-06)', () => {
    it('409 con proyectos, 200 sin proyectos', async () => {
      await pin('DELETE', `/api/clients/${ids.ferre}`);
      await pin('DELETE', `/api/clients/${ids.lonely}`);
      await pin('DELETE', `/api/clients/${ids.lonely}`);
    });
  });

  describe('auth con sesión', () => {
    it('cambia PIN y preguntas', async () => {
      await pin('POST', '/api/auth/change-pin', { currentPin: '00000000', newPin: '87654321' });
      await pin('POST', '/api/auth/change-pin', { currentPin: DEFAULT_PIN, newPin: '87654321' });
      await pin('POST', '/api/auth/update-questions', {
        currentPin: '87654321',
        q1: '¿Color favorito?',
        a1: 'Azul',
        q2: '¿Ciudad natal?',
        a2: 'Madrid',
      });
      await pin('GET', '/api/auth/settings');
    });

    it('lock cierra la sesión', async () => {
      await pin('POST', '/api/auth/lock');
      await pin('GET', '/api/auth/status');
      await pin('GET', '/api/projects');
    });

    it('recupera el acceso con preguntas secretas y resetea el PIN', async () => {
      await pin('GET', '/api/auth/questions');
      await pin('POST', '/api/auth/recover', { a1: 'rojo', a2: 'madrid' });
      const recovered = await pin('POST', '/api/auth/recover', { a1: '  AZUL ', a2: 'madrid' });
      await pin('POST', '/api/auth/reset-pin', { token: 'token-invalido', newPin: '11112222' });
      await pin('POST', '/api/auth/reset-pin', { token: recovered.resetToken, newPin: '11112222' });
      h.clearSession();
      await pin('POST', '/api/auth/unlock', { pin: '11112222' });
      await pin('GET', '/api/auth/status');
    });
  });

  describe('health y 404', () => {
    it('health es público', async () => {
      h.clearSession();
      const res = await h.raw('GET', '/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', runtime: driver === 'd1' ? 'cloudflare' : 'node' });
    });

    it('404 de API', async () => {
      await h.unlock('11112222');
      await pin('GET', '/api/no-existe');
    });
  });
});
