import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb, milestones, budgets, projects, clients } from '../../db';
import { handleProjectRenewal } from '../projects';

const financeApp = new Hono();

// Helper para calcular diferencia de días con soporte de zona horaria local
export function getDaysUntil(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
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

  // 1. Hitos PENDING ordenados por due_date ASC (con fechas vencidas y próximas primero, sin fecha al final)
  const pendingMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.status, 'PENDING'))
    .all();

  pendingMilestones.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

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

  // 2. Servicios recurrentes (has_recurring = 1) que vencen en 30 días o menos (RN-08)
  const recurringProjects = allProjects.filter((p) => {
    if (p.hasRecurring !== 1 || !p.recurringRenewalDate) return false;
    if (p.status === 'CANCELLED') return false;
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

  // Ordenar alertas recurrentes por urgencia (menor días restantes primero)
  recurringDTO.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return c.json({
    pendingMilestones: pendingDTO,
    recurringAlerts: recurringDTO,
  });
});

// 2. POST /api/finance/projects/:id/renew y POST /api/finance/:id/renew — Suma un período (+1 mes o +1 año)
financeApp.post('/projects/:id/renew', async (c) => {
  const id = c.req.param('id');
  return handleProjectRenewal(c, id);
});

financeApp.post('/:id/renew', async (c) => {
  const id = c.req.param('id');
  return handleProjectRenewal(c, id);
});

// 3. GET /api/finance/metrics — Métricas globales de caja (RN-08)
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

  let totalActiveRecurring = 0;
  let monthlyRecurring = 0;
  let annuallyRecurring = 0;
  let activeRecurringCount = 0;

  for (const p of allProjects) {
    if (p.hasRecurring === 1 && p.status !== 'CANCELLED' && p.recurringAmount) {
      totalActiveRecurring += p.recurringAmount;
      activeRecurringCount++;
      if (p.recurringPeriod === 'MONTHLY') {
        monthlyRecurring += p.recurringAmount;
      } else {
        annuallyRecurring += p.recurringAmount;
      }
    }
  }

  const activeProjectsCount = allProjects.filter((p) => p.status === 'IN_PROGRESS').length;
  const totalProjectsCount = allProjects.length;

  return c.json({
    totalInTheStreet,
    totalPending: totalInTheStreet,
    totalCollected,
    totalActiveRecurring,
    monthlyRecurring,
    annuallyRecurring,
    activeRecurringCount,
    activeProjectsCount,
    totalProjectsCount,
  });
});

export default financeApp;
