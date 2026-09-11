import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, clients, projects, budgets, milestones } from '../../db';

const clientsApp = new Hono();

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre o empresa es obligatorio'),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

// 1. GET /api/clients — Listado de clientes con conteo de proyectos y saldos
clientsApp.get('/', async (c) => {
  const db = getDb(c);
  const allClients = await db.select().from(clients).all();
  const allProjects = await db.select().from(projects).all();
  const allBudgets = await db.select().from(budgets).all();
  const allMilestones = await db.select().from(milestones).all();

  // Mapear presupuestos por proyecto
  const projectBudgetsMap = new Map<string, string[]>();
  for (const b of allBudgets) {
    const list = projectBudgetsMap.get(b.projectId) || [];
    list.push(b.id);
    projectBudgetsMap.set(b.projectId, list);
  }

  // Mapear hitos por presupuesto
  const budgetMilestonesMap = new Map<string, typeof allMilestones>();
  for (const m of allMilestones) {
    const list = budgetMilestonesMap.get(m.budgetId) || [];
    list.push(m);
    budgetMilestonesMap.set(m.budgetId, list);
  }

  // Mapear proyectos por cliente y computar saldos
  const result = allClients.map((client) => {
    const clientProjects = allProjects.filter((p) => p.clientId === client.id);
    let totalPaid = 0;
    let totalPending = 0;

    for (const proj of clientProjects) {
      const bIds = projectBudgetsMap.get(proj.id) || [];
      for (const bId of bIds) {
        const ms = budgetMilestonesMap.get(bId) || [];
        for (const m of ms) {
          if (m.status === 'PAID') {
            totalPaid += m.amount;
          } else if (m.status === 'PENDING') {
            totalPending += m.amount;
          }
        }
      }
    }

    return {
      ...client,
      projectsCount: clientProjects.length,
      totalPaid,
      totalPending,
    };
  });

  return c.json(result);
});

// 2. POST /api/clients — Crea nuevo cliente
clientsApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const nowIso = new Date().toISOString();
  const newId = crypto.randomUUID();

  const newClient = {
    id: newId,
    name: parsed.data.name.trim(),
    contactName: parsed.data.contactName?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    email: parsed.data.email?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(clients).values(newClient);
  return c.json(newClient, 201);
});

// 3. PUT /api/clients/:id — Actualiza cliente
clientsApp.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const [existing] = await db.select().from(clients).where(eq(clients.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Cliente no encontrado' }, 404);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(clients)
    .set({
      name: parsed.data.name.trim(),
      contactName: parsed.data.contactName?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      updatedAt: nowIso,
    })
    .where(eq(clients.id, id));

  const [updated] = await db.select().from(clients).where(eq(clients.id, id)).all();
  return c.json(updated);
});

// 4. DELETE /api/clients/:id — Eliminación con protección 409 (RN-06)
clientsApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [existing] = await db.select().from(clients).where(eq(clients.id, id)).all();
  if (!existing) {
    return c.json({ error: 'Cliente no encontrado' }, 404);
  }

  // Verificar si tiene proyectos asociados (RN-06)
  const clientProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.clientId, id))
    .all();

  const projectCount = clientProjects.length;
  if (projectCount > 0) {
    return c.json(
      {
        error: `No es posible eliminar el cliente porque posee ${projectCount} proyecto(s) asociado(s). Para preservar el histórico contable y de cotizaciones, mantenga el cliente en el sistema.`,
      },
      409
    );
  }

  await db.delete(clients).where(eq(clients.id, id));
  return c.json({ ok: true, message: 'Cliente eliminado exitosamente.' });
});

export default clientsApp;
