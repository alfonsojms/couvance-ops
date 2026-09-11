import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { getDb, milestones, budgets, projects, clients } from '../../db';

const financeApp = new Hono();

// Helper para calcular diferencia de días
function getDaysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 1. GET /api/finance/radar — Radar de cobranzas WhatsApp y recurrentes a 30 días (RN-08, RN-09)
financeApp.get('/radar', async (c) => {
  const db = getDb(c);

  const allClients = await db.select().from(clients).all();
  const clientsMap = new Map(allClients.map((cl) => [cl.id, cl]));

  const allProjects = await db.select().from(projects).all();
  const projectsMap = new Map(allProjects.map((p) => [p.id, p]));

  const allBudgets = await db.select().from(budgets).all();
  const budgetsMap = new Map(allBudgets.map((b) => [b.id, b]));

  // 1. Hitos PENDING ordenados por due_date ASC
  const pendingMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.status, 'PENDING'))
    .orderBy(asc(milestones.dueDate))
    .all();

  const pendingDTO = pendingMilestones.map((m) => {
    const budget = budgetsMap.get(m.budgetId);
    const project = budget ? projectsMap.get(budget.projectId) : undefined;
    const client = project ? clientsMap.get(project.clientId) : undefined;

    return {
      id: m.id,
      budgetId: m.budgetId,
      projectId: project?.id || '',
      milestoneTitle: m.title,
      amount: m.amount,
      percentage: m.percentage,
      currency: budget?.currency || 'USD',
      dueDate: m.dueDate,
      status: m.status,
      clientName: client?.name || 'Cliente sin nombre',
      clientPhone: client?.phone || null,
      projectTitle: project?.title || 'Proyecto sin título',
    };
  });

  // 2. Servicios recurrentes (has_recurring = 1) que vencen en 30 días o menos
  const recurringProjects = allProjects.filter((p) => {
    if (p.hasRecurring !== 1 || !p.recurringRenewalDate) return false;
    const days = getDaysUntil(p.recurringRenewalDate);
    return days <= 30;
  });

  const recurringDTO = recurringProjects.map((p) => {
    const client = clientsMap.get(p.clientId);
    const daysRemaining = p.recurringRenewalDate ? getDaysUntil(p.recurringRenewalDate) : 0;

    return {
      projectId: p.id,
      projectTitle: p.title,
      clientName: client?.name || 'Cliente sin nombre',
      clientPhone: client?.phone || null,
      recurringAmount: p.recurringAmount,
      recurringCurrency: p.recurringCurrency,
      recurringPeriod: p.recurringPeriod,
      recurringRenewalDate: p.recurringRenewalDate,
      daysRemaining,
      isOverdue: daysRemaining < 0,
    };
  });

  return c.json({
    pendingMilestones: pendingDTO,
    recurringAlerts: recurringDTO,
  });
});

// 2. POST /api/projects/:id/renew — Suma un período de renovación (+1 mes o +1 año)
financeApp.post('/projects/:id/renew', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c);

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).all();
  if (!project) {
    return c.json({ error: 'Proyecto no encontrado' }, 404);
  }

  if (project.hasRecurring !== 1 || !project.recurringRenewalDate) {
    return c.json({ error: 'El proyecto no tiene un servicio recurrente configurado con fecha de renovación.' }, 400);
  }

  const currentDate = new Date(project.recurringRenewalDate);
  const nextDate = new Date(currentDate);

  if (project.recurringPeriod === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  const nextDateString = nextDate.toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  await db
    .update(projects)
    .set({
      recurringRenewalDate: nextDateString,
      updatedAt: nowIso,
    })
    .where(eq(projects.id, id));

  return c.json({
    ok: true,
    message: `Renovación registrada exitosamente. Próxima fecha: ${nextDateString}`,
    nextRenewalDate: nextDateString,
  });
});

// 3. GET /api/finance/metrics — Métricas globales de caja
financeApp.get('/metrics', async (c) => {
  const db = getDb(c);

  const allMilestones = await db.select().from(milestones).all();
  const allProjects = await db.select().from(projects).all();

  let totalInTheStreet = 0; // PENDING
  let totalCollected = 0; // PAID

  for (const m of allMilestones) {
    if (m.status === 'PENDING') {
      totalInTheStreet += m.amount;
    } else if (m.status === 'PAID') {
      totalCollected += m.amount;
    }
  }

  const activeProjectsCount = allProjects.filter((p) => p.status === 'IN_PROGRESS').length;
  const totalProjectsCount = allProjects.length;

  return c.json({
    totalInTheStreet,
    totalCollected,
    activeProjectsCount,
    totalProjectsCount,
  });
});

export default financeApp;
