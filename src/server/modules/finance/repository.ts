import { and, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { asQueryDb, budgets, clients, milestones, projects, type AppDatabase } from '../../db';

/** Acceso a datos de finanzas: consultas de solo lectura con joins hito → presupuesto → proyecto → cliente. */
export function createFinanceRepository(db: AppDatabase) {
  const q = asQueryDb(db);

  return {
    /** Hitos PENDING con moneda, proyecto y cliente (INNER JOIN). */
    async listPendingMilestones() {
      return await q
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
        .where(eq(milestones.status, 'PENDING'))
        .all();
    },

    /** Proyectos no cancelados con servicio recurrente y fecha de renovación, con su cliente. */
    async listRecurringProjects() {
      return await q
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
        .where(and(eq(projects.hasRecurring, 1), ne(projects.status, 'CANCELLED'), isNotNull(projects.recurringRenewalDate)))
        .all();
    },

    /** Hitos PAID del más reciente al más antiguo; sin `paid_at` se usa la última actualización. */
    async listPaidMilestones() {
      const effectivePaidAt = sql<string>`COALESCE(${milestones.paidAt}, ${milestones.updatedAt}, ${milestones.createdAt})`;
      return await q
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
        .orderBy(desc(effectivePaidAt))
        .all();
    },

    async listAllMilestones() {
      return await db.select().from(milestones).all();
    },

    async listAllProjects() {
      return await db.select().from(projects).all();
    },
  };
}

export type FinanceRepository = ReturnType<typeof createFinanceRepository>;
