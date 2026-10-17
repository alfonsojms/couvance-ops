import { Hono } from 'hono';
import { eq, desc, sql, and, ne, isNotNull } from 'drizzle-orm';
import { getDb, milestones, budgets, projects, clients, type SqliteDb } from '../../db';
import { renewProjectResponse } from '../projects';

const financeApp = new Hono();

// Helper para calcular diferencia de días con soporte de zona horaria local
export function getDaysUntil(dateString: string): number {
  if (!dateString || typeof dateString !== 'string') return 999;
  const parts = dateString.split('-');
  if (parts.length < 3) {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return 999;
    const now = new Date();
    parsed.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.round((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return 999;
  const target = new Date(year, month - 1, day);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// 1. GET /api/finance/radar — Radar de cobranzas WhatsApp y recurrentes a 30 días (RN-08, RN-09)
financeApp.get('/radar', async (c) => {
  try {
    const db = getDb(c) as SqliteDb;

    // 1. Hitos PENDING con sus presupuestos, proyectos y clientes mediante INNER JOIN relacional
    const pendingDTO = await db
      .select({
        id: milestones.id,
        budgetId: milestones.budgetId,
        projectId: projects.id,
        milestoneTitle: milestones.title,
        amount: milestones.amount,
        percentage: milestones.percentage,
        currency: budgets.currency,
        dueDate: milestones.dueDate,
        status: milestones.status,
        clientName: clients.name,
        clientPhone: clients.phone,
        projectTitle: projects.title,
      })
      .from(milestones)
      .innerJoin(budgets, eq(milestones.budgetId, budgets.id))
      .innerJoin(projects, eq(budgets.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(milestones.status, 'PENDING'));

    pendingDTO.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return String(a.dueDate).localeCompare(String(b.dueDate));
    });

    // 2. Servicios recurrentes (has_recurring = 1) activos vinculados a cliente mediante INNER JOIN
    const recurringProjects = await db
      .select({
        projectId: projects.id,
        projectTitle: projects.title,
        clientName: clients.name,
        clientPhone: clients.phone,
        recurringAmount: projects.recurringAmount,
        recurringCurrency: projects.recurringCurrency,
        recurringPeriod: projects.recurringPeriod,
        recurringRenewalDate: projects.recurringRenewalDate,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.hasRecurring, 1),
          ne(projects.status, 'CANCELLED'),
          isNotNull(projects.recurringRenewalDate)
        )
      );

    const recurringDTO = recurringProjects
      .filter((p) => {
        if (!p.recurringRenewalDate) return false;
        const days = getDaysUntil(p.recurringRenewalDate);
        return days <= 30;
      })
      .map((p) => {
        const daysRemaining = p.recurringRenewalDate ? getDaysUntil(p.recurringRenewalDate) : 0;
        return {
          projectId: p.projectId,
          projectTitle: p.projectTitle,
          clientName: p.clientName || 'Cliente sin nombre',
          clientPhone: p.clientPhone || null,
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
  } catch (error: any) {
    console.error('🔥 [Finance Radar Error]:', error);
    return c.json({ error: error.message || 'Error al obtener radar de cobranzas' }, 500);
  }
});

// 2. GET /api/finance/history — Historial de cobros y trazabilidad de ingresos (RN-08)
financeApp.get('/history', async (c) => {
  try {
    const db = getDb(c) as SqliteDb;

    const effectivePaidAt = sql<string>`COALESCE(${milestones.paidAt}, ${milestones.updatedAt}, ${milestones.createdAt})`;

    const historyDTO = await db
      .select({
        id: milestones.id,
        budgetId: milestones.budgetId,
        projectId: projects.id,
        projectTitle: projects.title,
        projectCategory: projects.category,
        clientId: clients.id,
        clientName: clients.name,
        clientPhone: clients.phone,
        milestoneTitle: milestones.title,
        amount: milestones.amount,
        percentage: milestones.percentage,
        currency: budgets.currency,
        paidAt: effectivePaidAt,
        dueDate: milestones.dueDate,
      })
      .from(milestones)
      .innerJoin(budgets, eq(milestones.budgetId, budgets.id))
      .innerJoin(projects, eq(budgets.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(milestones.status, 'PAID'))
      .orderBy(desc(effectivePaidAt));

    const totalCollected = historyDTO.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return c.json({
      history: historyDTO,
      totalCollected,
      totalCount: historyDTO.length,
    });
  } catch (error: any) {
    console.error('🔥 [Finance History Error]:', error);
    return c.json({ error: error.message || 'Error al obtener historial de cobros' }, 500);
  }
});

// 3. POST /api/finance/projects/:id/renew y POST /api/finance/:id/renew — Alias de la renovación de proyectos (RN-08)
financeApp.post('/projects/:id/renew', async (c) => renewProjectResponse(c, c.req.param('id')));

financeApp.post('/:id/renew', async (c) => renewProjectResponse(c, c.req.param('id')));

// 3. GET /api/finance/metrics — Métricas globales de caja (RN-08)
financeApp.get('/metrics', async (c) => {
  try {
    const db = getDb(c);

    const allMilestones = (await db.select().from(milestones).all()) || [];
    const allProjects = (await db.select().from(projects).all()) || [];

    let totalInTheStreet = 0; // PENDING
    let totalCollected = 0; // PAID

    for (const m of allMilestones) {
      if (m.status === 'PENDING') {
        totalInTheStreet += Number(m.amount) || 0;
      } else if (m.status === 'PAID') {
        totalCollected += Number(m.amount) || 0;
      }
    }

    let totalActiveRecurring = 0;
    let monthlyRecurring = 0;
    let annuallyRecurring = 0;
    let activeRecurringCount = 0;

    for (const p of allProjects) {
      if (p.hasRecurring === 1 && p.status !== 'CANCELLED' && p.recurringAmount) {
        const recAmount = Number(p.recurringAmount) || 0;
        totalActiveRecurring += recAmount;
        activeRecurringCount++;
        if (p.recurringPeriod === 'MONTHLY') {
          monthlyRecurring += recAmount;
        } else {
          annuallyRecurring += recAmount;
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
  } catch (error: any) {
    console.error('🔥 [Finance Metrics Error]:', error);
    return c.json({ error: error.message || 'Error al obtener métricas financieras' }, 500);
  }
});

export default financeApp;
