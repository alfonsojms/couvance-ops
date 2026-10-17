import { Hono, type Context } from 'hono';
import { getDb } from '../../db';
import { parseBody, requireId } from '../../shared/http';
import { createBudgetsRepository } from './repository';
import { budgetCreateSchema } from './schemas';
import { createBudgetsService } from './service';

const INVALID_PROJECT_ID = 'Identificador de proyecto inválido o malformado.';
const INVALID_BUDGET_ID = 'Identificador de presupuesto inválido o malformado.';
const INVALID_MILESTONE_ID = 'Identificador de hito inválido o malformado.';

const serviceFor = (c: Context) => createBudgetsService(createBudgetsRepository(getDb(c)));

// Montado en /api: expone /projects/:projectId/budgets, /budgets/:id/* y /milestones/:id/pay.
const budgetsRoutes = new Hono();

// POST /api/projects/:projectId/budgets — Crea presupuesto e hitos en estado DRAFT
budgetsRoutes.post('/projects/:projectId/budgets', async (c) => {
  const projectId = requireId(c.req.param('projectId'), INVALID_PROJECT_ID);
  const input = await parseBody(c, budgetCreateSchema);
  return c.json(await serviceFor(c).createBudget(projectId, input), 201);
});

// GET /api/projects/:projectId/budgets — Historial de presupuestos del proyecto
budgetsRoutes.get('/projects/:projectId/budgets', async (c) => {
  const projectId = requireId(c.req.param('projectId'), INVALID_PROJECT_ID);
  return c.json(await serviceFor(c).listProjectBudgets(projectId));
});

// PUT /api/budgets/:id — Edición de presupuesto (solo en estado DRAFT)
budgetsRoutes.put('/budgets/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_BUDGET_ID);
  const input = await parseBody(c, budgetCreateSchema);
  return c.json(await serviceFor(c).updateBudget(id, input));
});

// GET /api/budgets/:id — Detalle del presupuesto con sus hitos
budgetsRoutes.get('/budgets/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_BUDGET_ID);
  return c.json(await serviceFor(c).getBudget(id));
});

// POST /api/budgets/:id/approve — Aprobación en 1 clic (RN-03)
budgetsRoutes.post('/budgets/:id/approve', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_BUDGET_ID);
  const { milestones, ...budget } = await serviceFor(c).approveBudget(id);
  return c.json({
    ok: true,
    message: 'Presupuesto aprobado y proyecto activado exitosamente.',
    budget,
    milestones,
  });
});

// POST /api/budgets/:id/reject — Marca el presupuesto como REJECTED
budgetsRoutes.post('/budgets/:id/reject', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_BUDGET_ID);
  return c.json({ ok: true, message: 'Presupuesto rechazado.', budget: await serviceFor(c).rejectBudget(id) });
});

// PATCH /api/milestones/:id/pay — Cobra un hito individual
budgetsRoutes.patch('/milestones/:id/pay', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_MILESTONE_ID);
  return c.json(await serviceFor(c).payMilestone(id));
});

// POST /api/budgets/:id/pay-all — Cobro express "Cobrar Todo" (RN-04)
budgetsRoutes.post('/budgets/:id/pay-all', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_BUDGET_ID);
  return c.json({
    ok: true,
    message: 'Todos los hitos pendientes fueron cobrados exitosamente.',
    milestones: await serviceFor(c).payAllPending(id),
  });
});

export default budgetsRoutes;
