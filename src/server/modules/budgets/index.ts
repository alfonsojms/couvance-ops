import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb, budgets, milestones, projects } from '../../db';

const budgetsApp = new Hono();

// Esquema de creación de hito
const milestoneInputSchema = z.object({
  title: z.string().min(1, 'El título del hito es obligatorio'),
  percentage: z.number().int('El porcentaje debe ser un número entero').min(1).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').optional().nullable().or(z.literal('')),
});

// Esquema de creación de presupuesto (RN-01 & RN-02)
const budgetCreateSchema = z.object({
  title: z.string().min(1, 'El concepto o título del presupuesto es obligatorio'),
  totalAmount: z.number().int('El monto total debe ser un entero estricto sin decimales').positive('El monto debe ser mayor a 0'),
  currency: z.string().default('USD'),
  milestones: z.array(milestoneInputSchema).min(1, 'Debe incluir al menos 1 hito de cobro'),
}).refine(
  (data) => {
    const sumPercentages = data.milestones.reduce((acc, m) => acc + m.percentage, 0);
    return sumPercentages === 100;
  },
  {
    message: 'La suma de los porcentajes de los hitos debe ser exactamente 100% (RN-02).',
    path: ['milestones'],
  }
);

// Helper para calcular montos enteros de hitos absorbiendo residuo en el último hito (RN-01)
export function calculateMilestonesAmounts(
  totalAmount: number,
  items: Array<{ title: string; percentage: number; dueDate?: string | null }>
) {
  let accumulatedAmount = 0;

  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    let amount: number;

    if (isLast) {
      // El último hito absorbe el residuo para cuadrar exactamente con totalAmount
      amount = totalAmount - accumulatedAmount;
    } else {
      amount = Math.round((totalAmount * item.percentage) / 100);
      accumulatedAmount += amount;
    }

    return {
      title: item.title,
      percentage: item.percentage,
      amount,
      dueDate: item.dueDate || null,
    };
  });
}

// 1. POST /api/projects/:projectId/budgets — Crea presupuesto e hitos en estado DRAFT
budgetsApp.post('/projects/:projectId/budgets', async (c) => {
  const projectId = c.req.param('projectId');
  const body = await c.req.json().catch(() => null);
  const parsed = budgetCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId)).all();
  if (!proj) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  const budgetId = crypto.randomUUID();

  // Calcular hitos enteros con conciliación de residuo (RN-01)
  const computedMilestones = calculateMilestonesAmounts(
    parsed.data.totalAmount,
    parsed.data.milestones
  );

  const newBudget = {
    id: budgetId,
    projectId,
    title: parsed.data.title.trim(),
    totalAmount: parsed.data.totalAmount,
    currency: parsed.data.currency,
    status: 'DRAFT' as const,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(budgets).values(newBudget);

  const milestoneRows = computedMilestones.map((m) => ({
    id: crypto.randomUUID(),
    budgetId,
    title: m.title.trim(),
    percentage: m.percentage,
    amount: m.amount,
    dueDate: m.dueDate,
    status: 'DRAFT' as const,
    paidAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  for (const mRow of milestoneRows) {
    await db.insert(milestones).values(mRow);
  }

  return c.json(
    {
      ...newBudget,
      milestones: milestoneRows,
    },
    201
  );
});

// 2. GET /api/projects/:projectId/budgets — Historial de presupuestos del proyecto
budgetsApp.get('/projects/:projectId/budgets', async (c) => {
  const projectId = c.req.param('projectId');
  const db = getDb(c);

  const projBudgets = await db.select().from(budgets).where(eq(budgets.projectId, projectId)).all();

  const result = await Promise.all(
    projBudgets.map(async (b) => {
      const ms = await db.select().from(milestones).where(eq(milestones.budgetId, b.id)).all();
      return {
        ...b,
        milestones: ms,
      };
    })
  );

  return c.json(result);
});

// 3. PUT /api/budgets/:id — Edición de presupuesto (solo en estado DRAFT)
budgetsApp.put('/budgets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = budgetCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const [existing] = await db.select().from(budgets).where(eq(budgets.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404);
  }

  if (existing.status !== 'DRAFT') {
    return c.json({ error: 'Solo se pueden editar presupuestos en estado DRAFT (Borrador).' }, 400);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(budgets)
    .set({
      title: parsed.data.title.trim(),
      totalAmount: parsed.data.totalAmount,
      currency: parsed.data.currency,
      updatedAt: nowIso,
    })
    .where(eq(budgets.id, id));

  // Reemplazar hitos anteriores
  await db.delete(milestones).where(eq(milestones.budgetId, id));

  const computedMilestones = calculateMilestonesAmounts(
    parsed.data.totalAmount,
    parsed.data.milestones
  );

  const milestoneRows = computedMilestones.map((m) => ({
    id: crypto.randomUUID(),
    budgetId: id,
    title: m.title.trim(),
    percentage: m.percentage,
    amount: m.amount,
    dueDate: m.dueDate,
    status: 'DRAFT' as const,
    paidAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  for (const mRow of milestoneRows) {
    await db.insert(milestones).values(mRow);
  }

  return c.json({
    ...existing,
    title: parsed.data.title.trim(),
    totalAmount: parsed.data.totalAmount,
    currency: parsed.data.currency,
    updatedAt: nowIso,
    milestones: milestoneRows,
  });
});

// 4. POST /api/budgets/:id/approve — Aprobación en 1 Clic (RN-03)
budgetsApp.post('/budgets/:id/approve', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id)).all();
  if (!budget) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();

  // 1. Presupuesto pasa a APPROVED
  await db
    .update(budgets)
    .set({
      status: 'APPROVED',
      updatedAt: nowIso,
    })
    .where(eq(budgets.id, id));

  // 2. Proyecto pasa a IN_PROGRESS
  await db
    .update(projects)
    .set({
      status: 'IN_PROGRESS',
      updatedAt: nowIso,
    })
    .where(eq(projects.id, budget.projectId));

  // 3. Hitos asociados pasan de DRAFT a PENDING
  await db
    .update(milestones)
    .set({
      status: 'PENDING',
      updatedAt: nowIso,
    })
    .where(and(eq(milestones.budgetId, id), eq(milestones.status, 'DRAFT')));

  const updatedMilestones = await db.select().from(milestones).where(eq(milestones.budgetId, id)).all();

  return c.json({
    ok: true,
    message: 'Presupuesto aprobado y proyecto activado exitosamente.',
    budget: { ...budget, status: 'APPROVED', updatedAt: nowIso },
    milestones: updatedMilestones,
  });
});

// 5. POST /api/budgets/:id/reject — Marca presupuesto como REJECTED
budgetsApp.post('/budgets/:id/reject', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id)).all();
  if (!budget) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(budgets)
    .set({
      status: 'REJECTED',
      updatedAt: nowIso,
    })
    .where(eq(budgets.id, id));

  return c.json({ ok: true, message: 'Presupuesto rechazado.' });
});

// 6. PATCH /api/milestones/:id/pay — Marca hito individual como PAID
budgetsApp.patch('/milestones/:id/pay', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id)).all();
  if (!milestone) {
    return c.json({ error: 'Hito no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(milestones)
    .set({
      status: 'PAID',
      paidAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(milestones.id, id));

  const [updated] = await db.select().from(milestones).where(eq(milestones.id, id)).all();
  return c.json(updated);
});

// 7. POST /api/budgets/:id/pay-all — Operación Cobro Express "Cobrar Todo" (RN-04)
budgetsApp.post('/budgets/:id/pay-all', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id)).all();
  if (!budget) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(milestones)
    .set({
      status: 'PAID',
      paidAt: nowIso,
      updatedAt: nowIso,
    })
    .where(and(eq(milestones.budgetId, id), eq(milestones.status, 'PENDING')));

  const updatedMilestones = await db.select().from(milestones).where(eq(milestones.budgetId, id)).all();

  return c.json({
    ok: true,
    message: 'Todos los hitos pendientes fueron cobrados exitosamente.',
    milestones: updatedMilestones,
  });
});

export default budgetsApp;
