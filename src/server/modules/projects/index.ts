import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb, projects, clients, budgets, milestones } from '../../db';

const projectsApp = new Hono();

const projectCategorySchema = z.enum(['LANDING', 'ECOMMERCE', 'CORPORATE', 'WEBAPP']);
const projectStatusSchema = z.enum(['PROSPECT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const productionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const recurringPeriodSchema = z.enum(['MONTHLY', 'ANNUALLY']);

const projectCreateSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  title: z.string().min(1, 'El título del proyecto es obligatorio'),
  category: projectCategorySchema,
  status: projectStatusSchema.default('PROSPECT'),
  productionUrl: z.string().url('URL de producción inválida').optional().nullable().or(z.literal('')),
  productionStatus: productionStatusSchema.default('ACTIVE'),
  codeRepoUrl: z.string().url('URL de repositorio inválida').optional().nullable().or(z.literal('')),
  resourcesUrl: z.string().url('URL de recursos inválida').optional().nullable().or(z.literal('')),
  hasRecurring: z.number().int().min(0).max(1).default(0),
  recurringAmount: z.number().nonnegative().optional().nullable(),
  recurringCurrency: z.string().default('USD'),
  recurringPeriod: recurringPeriodSchema.default('ANNUALLY'),
  recurringRenewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable().or(z.literal('')),
});

const projectUpdateSchema = projectCreateSchema.partial();

// 1. GET /api/projects — Listado general de proyectos con filtros
projectsApp.get('/', async (c) => {
  const statusFilter = c.req.query('status');
  const db = getDb(c);

  const allProjects = await db.select().from(projects).all();
  const filtered = statusFilter
    ? allProjects.filter((p) => p.status.toUpperCase() === statusFilter.toUpperCase())
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
  const id = c.req.param('id');
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
  const body = await c.req.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  // Validar cliente existente
  const [clientExists] = await db.select().from(clients).where(eq(clients.id, parsed.data.clientId)).all();
  if (!clientExists) {
    return c.json({ error: 'El cliente especificado no existe' }, 400);
  }

  const nowIso = new Date().toISOString();
  const newId = crypto.randomUUID();

  const newProject = {
    id: newId,
    clientId: parsed.data.clientId,
    title: parsed.data.title.trim(),
    category: parsed.data.category,
    status: parsed.data.status,
    productionUrl: parsed.data.productionUrl?.trim() || null,
    productionStatus: parsed.data.productionStatus,
    codeRepoUrl: parsed.data.codeRepoUrl?.trim() || null,
    resourcesUrl: parsed.data.resourcesUrl?.trim() || null,
    hasRecurring: parsed.data.hasRecurring,
    recurringAmount: parsed.data.hasRecurring ? parsed.data.recurringAmount || null : null,
    recurringCurrency: parsed.data.recurringCurrency,
    recurringPeriod: parsed.data.recurringPeriod,
    recurringRenewalDate: parsed.data.hasRecurring ? parsed.data.recurringRenewalDate || null : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(projects).values(newProject);
  return c.json(newProject, 201);
});

// 4. PUT /api/projects/:id — Actualización y Cancelación No Destructiva (RN-05)
projectsApp.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  const updateData: Partial<typeof projects.$inferInsert> = {
    updatedAt: nowIso,
  };

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.productionUrl !== undefined) updateData.productionUrl = parsed.data.productionUrl?.trim() || null;
  if (parsed.data.productionStatus !== undefined) updateData.productionStatus = parsed.data.productionStatus;
  if (parsed.data.codeRepoUrl !== undefined) updateData.codeRepoUrl = parsed.data.codeRepoUrl?.trim() || null;
  if (parsed.data.resourcesUrl !== undefined) updateData.resourcesUrl = parsed.data.resourcesUrl?.trim() || null;
  if (parsed.data.hasRecurring !== undefined) {
    updateData.hasRecurring = parsed.data.hasRecurring;
    if (parsed.data.hasRecurring === 0) {
      updateData.recurringAmount = null;
      updateData.recurringRenewalDate = null;
    }
  }
  if (parsed.data.recurringAmount !== undefined && (parsed.data.hasRecurring ?? existing.hasRecurring) === 1) {
    updateData.recurringAmount = parsed.data.recurringAmount;
  }
  if (parsed.data.recurringCurrency !== undefined) updateData.recurringCurrency = parsed.data.recurringCurrency;
  if (parsed.data.recurringPeriod !== undefined) updateData.recurringPeriod = parsed.data.recurringPeriod;
  if (parsed.data.recurringRenewalDate !== undefined) updateData.recurringRenewalDate = parsed.data.recurringRenewalDate || null;

  await db.update(projects).set(updateData).where(eq(projects.id, id));

  // RN-05: Si el estado cambia a CANCELLED, cancelar hitos PENDING preservando los PAID
  if (parsed.data.status === 'CANCELLED') {
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

export default projectsApp;
