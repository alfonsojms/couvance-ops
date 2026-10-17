import { Hono, type Context } from 'hono';
import { getDb } from '../../db';
import { renewProjectResponse } from '../projects';
import { createFinanceRepository } from './repository';
import { createFinanceService } from './service';

const serviceFor = (c: Context) => createFinanceService(createFinanceRepository(getDb(c)));

const financeRoutes = new Hono();

// GET /api/finance/radar — Radar de cobranzas WhatsApp y recurrentes a 30 días (RN-08, RN-09)
financeRoutes.get('/radar', async (c) => c.json(await serviceFor(c).getRadar()));

// GET /api/finance/history — Historial de cobros y trazabilidad de ingresos (RN-08)
financeRoutes.get('/history', async (c) => c.json(await serviceFor(c).getHistory()));

// POST /api/finance/projects/:id/renew y POST /api/finance/:id/renew — Alias de la renovación de proyectos (RN-08)
financeRoutes.post('/projects/:id/renew', async (c) => renewProjectResponse(c, c.req.param('id')));

financeRoutes.post('/:id/renew', async (c) => renewProjectResponse(c, c.req.param('id')));

// GET /api/finance/metrics — Métricas globales de caja (RN-08)
financeRoutes.get('/metrics', async (c) => c.json(await serviceFor(c).getMetrics()));

export default financeRoutes;
