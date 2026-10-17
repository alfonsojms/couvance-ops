import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb, projects, clients, budgets, milestones } from '../../db';
import { sanitizeString, idParamSchema } from '../../middlewares/sanitize';
import { parseBody, requireId } from '../../shared/http';

const projectsApp = new Hono();

export const projectCategorySchema = z.enum(['LANDING', 'ECOMMERCE', 'CORPORATE', 'WEBAPP']);
export const projectStatusSchema = z.enum(['PROSPECT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const productionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const recurringPeriodSchema = z.enum(['MONTHLY', 'ANNUALLY']);

export const projectCreateSchema = z.object({
  clientId: idParamSchema,
  title: z
    .string({ required_error: 'El título del proyecto es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El título del proyecto es obligatorio')
    .refine((v) => v.length <= 200, 'El título no puede superar los 200 caracteres'),
  category: projectCategorySchema,
  status: projectStatusSchema.default('PROSPECT'),
  productionUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de producción inválida').or(z.literal('')))
    .optional()
    .nullable(),
  productionStatus: productionStatusSchema.default('ACTIVE'),
  codeRepoUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de repositorio inválida').or(z.literal('')))
    .optional()
    .nullable(),
  resourcesUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de recursos inválida').or(z.literal('')))
    .optional()
    .nullable(),
  hasRecurring: z.number().int().min(0).max(1).default(0),
  recurringAmount: z.number().nonnegative('El monto recurrente debe ser mayor o igual a 0').optional().nullable(),
  recurringCurrency: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 10, 'La moneda no puede superar los 10 caracteres')
    .default('USD'),
  recurringPeriod: recurringPeriodSchema.default('ANNUALLY'),
  recurringRenewalDate: z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').or(z.literal('')))
    .optional()
    .nullable(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectSoftEditSchema = projectCreateSchema
  .omit({ clientId: true, status: true })
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.hasRecurring === 1) {
      if (!data.recurringRenewalDate || data.recurringRenewalDate.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringRenewalDate'],
          message: 'La fecha de renovación es obligatoria cuando el servicio recurrente está activo',
        });
      }
      if (data.recurringAmount === undefined || data.recurringAmount === null || data.recurringAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringAmount'],
          message: 'El monto recurrente es obligatorio cuando el servicio recurrente está activo',
        });
      }
    }
  });

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectSoftEditInput = z.infer<typeof projectSoftEditSchema>;

export function buildProjectUpdate(
  data: Partial<ProjectCreateInput>,
  existing: typeof projects.$inferSelect,
  nowIso: string = new Date().toISOString()
): Partial<typeof projects.$inferInsert> {
  const updateData: Partial<typeof projects.$inferInsert> = {
    updatedAt: nowIso,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.productionUrl !== undefined) updateData.productionUrl = data.productionUrl || null;
  if (data.productionStatus !== undefined) updateData.productionStatus = data.productionStatus;
  if (data.codeRepoUrl !== undefined) updateData.codeRepoUrl = data.codeRepoUrl || null;
  if (data.resourcesUrl !== undefined) updateData.resourcesUrl = data.resourcesUrl || null;
  if (data.hasRecurring !== undefined) {
    updateData.hasRecurring = data.hasRecurring;
    if (data.hasRecurring === 0) {
      updateData.recurringAmount = null;
      updateData.recurringRenewalDate = null;
    }
  }
  if (data.recurringAmount !== undefined && (data.hasRecurring ?? existing.hasRecurring) === 1) {
    updateData.recurringAmount = data.recurringAmount;
  }
  if (data.recurringCurrency !== undefined) updateData.recurringCurrency = data.recurringCurrency;
  if (data.recurringPeriod !== undefined) updateData.recurringPeriod = data.recurringPeriod;
  if (data.recurringRenewalDate !== undefined) {
    updateData.recurringRenewalDate = data.recurringRenewalDate || null;
  }

  return updateData;
}

// 1. GET /api/projects — Listado general de proyectos con filtros
projectsApp.get('/', async (c) => {
  const rawStatus = c.req.query('status');
  const cleanStatus = rawStatus ? sanitizeString(rawStatus).toUpperCase() : null;
  const statusParsed = cleanStatus ? projectStatusSchema.safeParse(cleanStatus) : null;
  const statusFilter = statusParsed?.success ? statusParsed.data : null;
  const db = getDb(c);

  const allProjects = await db.select().from(projects).all();
  const filtered = statusFilter
    ? allProjects.filter((p) => p.status === statusFilter)
    : allProjects;

  const allClients = await db.select().from(clients).all();
  const clientsMap = new Map(allClients.map((cl) => [cl.id, cl]));

  const allBudgets = await db.select().from(budgets).all();
  const allMilestones = await db.select().from(milestones).all();

  const budgetsByProject = new Map<string, typeof allBudgets>();
  for (const b of allBudgets) {
    const list = budgetsByProject.get(b.projectId) || [];
    list.push(b);
    budgetsByProject.set(b.projectId, list);
  }

  const milestonesByBudget = new Map<string, typeof allMilestones>();
  for (const m of allMilestones) {
    const list = milestonesByBudget.get(m.budgetId) || [];
    list.push(m);
    milestonesByBudget.set(m.budgetId, list);
  }

  const result = filtered.map((proj) => {
    const client = clientsMap.get(proj.clientId) || null;
    const projBudgets = budgetsByProject.get(proj.id) || [];

    let totalBudgeted = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const b of projBudgets) {
      const ms = milestonesByBudget.get(b.id) || [];
      for (const m of ms) {
        if (m.status === 'PAID') {
          totalPaid += m.amount;
        } else if (m.status === 'PENDING') {
          totalPending += m.amount;
        }
      }
      if (b.status === 'APPROVED' || b.status === 'DRAFT' || b.status === 'SENT') {
        totalBudgeted += b.totalAmount;
      }
    }

    return {
      ...proj,
      client,
      totalBudgeted,
      totalPaid,
      totalPending,
    };
  });

  return c.json(result);
});

// 2. GET /api/projects/:id — Detalle completo del proyecto con cliente, presupuestos e hitos
projectsApp.get('/:id', async (c) => {
  const rawId = c.req.param('id');
  const id = requireId(rawId, 'Identificador de proyecto inválido o malformado.');

  const db = getDb(c);

  const [proj] = await db.select().from(projects).where(eq(projects.id, id)).all();
  if (!proj) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, proj.clientId)).all();
  const projBudgets = await db.select().from(budgets).where(eq(budgets.projectId, id)).all();

  const budgetsWithMilestones = await Promise.all(
    projBudgets.map(async (b) => {
      const ms = await db.select().from(milestones).where(eq(milestones.budgetId, b.id)).all();
      return {
        ...b,
        milestones: ms,
      };
    })
  );

  return c.json({
    ...proj,
    client: client || null,
    budgets: budgetsWithMilestones,
  });
});

// 3. POST /api/projects — Crea proyecto
projectsApp.post('/', async (c) => {
  const data = await parseBody(c, projectCreateSchema);

  const db = getDb(c);
  // Validar cliente existente
  const [clientExists] = await db.select().from(clients).where(eq(clients.id, data.clientId)).all();
  if (!clientExists) {
    return c.json({ error: 'El cliente especificado no existe' }, 400);
  }

  if (data.hasRecurring === 1) {
    if (!data.recurringRenewalDate || data.recurringRenewalDate.trim() === '') {
      return c.json({ error: 'La fecha de renovación es obligatoria cuando el servicio recurrente está activo' }, 400);
    }
    if (data.recurringAmount === undefined || data.recurringAmount === null || data.recurringAmount <= 0) {
      return c.json({ error: 'El monto recurrente es obligatorio cuando el servicio recurrente está activo' }, 400);
    }
  }

  const nowIso = new Date().toISOString();
  const newId = crypto.randomUUID();

  const newProject = {
    id: newId,
    clientId: data.clientId,
    title: data.title,
    category: data.category,
    status: data.status,
    productionUrl: data.productionUrl || null,
    productionStatus: data.productionStatus,
    codeRepoUrl: data.codeRepoUrl || null,
    resourcesUrl: data.resourcesUrl || null,
    hasRecurring: data.hasRecurring,
    recurringAmount: data.hasRecurring ? data.recurringAmount || null : null,
    recurringCurrency: data.recurringCurrency,
    recurringPeriod: data.recurringPeriod,
    recurringRenewalDate: data.hasRecurring ? data.recurringRenewalDate || null : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(projects).values(newProject);
  return c.json(newProject, 201);
});

// 4. PUT /api/projects/:id — Actualización y Cancelación No Destructiva (RN-05)
projectsApp.put('/:id', async (c) => {
  const rawId = c.req.param('id');
  const id = requireId(rawId, 'Identificador de proyecto inválido o malformado.');

  const data = await parseBody(c, projectUpdateSchema);

  const db = getDb(c);
  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  const updateData = buildProjectUpdate(data, existing, nowIso);

  await db.update(projects).set(updateData).where(eq(projects.id, id));

  // RN-05: Si el estado cambia a CANCELLED, cancelar hitos PENDING preservando los PAID
  if (data.status === 'CANCELLED') {
    const projBudgets = await db.select().from(budgets).where(eq(budgets.projectId, id)).all();
    for (const b of projBudgets) {
      await db
        .update(milestones)
        .set({
          status: 'CANCELLED',
          updatedAt: nowIso,
        })
        .where(and(eq(milestones.budgetId, b.id), eq(milestones.status, 'PENDING')));
    }
  }

  const [updated] = await db.select().from(projects).where(eq(projects.id, id)).all();
  return c.json(updated);
});

// 4b. PATCH /api/projects/:id — Soft edit de metadatos (RN-07, RN-08)
projectsApp.patch('/:id', async (c) => {
  const rawId = c.req.param('id');
  const id = requireId(rawId, 'Identificador de proyecto inválido o malformado.');

  const data = await parseBody(c, projectSoftEditSchema);

  const db = getDb(c);
  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  if (existing.status === 'CANCELLED') {
    return c.json({ error: 'Un proyecto cancelado no se puede editar' }, 409);
  }

  const effectiveHasRecurring = data.hasRecurring !== undefined ? data.hasRecurring : existing.hasRecurring;
  if (effectiveHasRecurring === 1) {
    const effectiveRenewalDate = data.recurringRenewalDate !== undefined ? data.recurringRenewalDate : existing.recurringRenewalDate;
    if (!effectiveRenewalDate || effectiveRenewalDate.trim() === '') {
      return c.json({ error: 'La fecha de renovación es obligatoria cuando el servicio recurrente está activo' }, 400);
    }
    const effectiveAmount = data.recurringAmount !== undefined ? data.recurringAmount : existing.recurringAmount;
    if (effectiveAmount === undefined || effectiveAmount === null || effectiveAmount <= 0) {
      return c.json({ error: 'El monto recurrente es obligatorio cuando el servicio recurrente está activo' }, 400);
    }
  }

  const nowIso = new Date().toISOString();
  const updateData = buildProjectUpdate(data, existing, nowIso);

  await db.update(projects).set(updateData).where(eq(projects.id, id));

  const [updated] = await db.select().from(projects).where(eq(projects.id, id)).all();
  return c.json(updated);
});

// Helper para calcular siguiente fecha de renovación
export function calculateNextRenewalDate(currentDateString: string, period: 'MONTHLY' | 'ANNUALLY'): string {
  const [year, month, day] = currentDateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (period === 'MONTHLY') {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function handleProjectRenewal(c: any, projectId: string) {
  const db = getDb(c);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).all();
  if (!project) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  if (project.hasRecurring !== 1 || !project.recurringRenewalDate) {
    return c.json({ error: 'El proyecto no tiene un servicio recurrente configurado con fecha de renovación.' }, 400);
  }

  const nextDateString = calculateNextRenewalDate(project.recurringRenewalDate, project.recurringPeriod as 'MONTHLY' | 'ANNUALLY');
  const nowIso = new Date().toISOString();

  await db
    .update(projects)
    .set({
      recurringRenewalDate: nextDateString,
      updatedAt: nowIso,
    })
    .where(eq(projects.id, projectId));

  return c.json({
    ok: true,
    message: `Renovación registrada exitosamente. Próxima fecha: ${nextDateString}`,
    nextRenewalDate: nextDateString,
  });
}

// 5. POST /api/projects/:id/renew — Suma un período de renovación (+1 mes o +1 año) (RN-08)
projectsApp.post('/:id/renew', async (c) => {
  const rawId = c.req.param('id');
  const id = requireId(rawId, 'Identificador de proyecto inválido o malformado.');
  return handleProjectRenewal(c, id);
});

export default projectsApp;
