import { and, eq, inArray } from 'drizzle-orm';
import { budgets, milestones, projects, type AppDatabase } from '../../db';
import { runAtomic } from '../../db/atomic';

export type BudgetRow = typeof budgets.$inferSelect;
export type MilestoneRow = typeof milestones.$inferSelect;
export type BudgetWithMilestones = BudgetRow & { milestones: MilestoneRow[] };

/** Acceso a datos de presupuestos e hitos. Las escrituras de varias filas o tablas son atómicas. */
export function createBudgetsRepository(db: AppDatabase) {
  const findBudget = async (id: string): Promise<BudgetRow | undefined> =>
    (await db.select().from(budgets).where(eq(budgets.id, id)).all())[0];

  // `.all()` es síncrono en better-sqlite3 y asíncrono en D1: siempre se espera con `await`.
  const listMilestones = async (budgetId: string): Promise<MilestoneRow[]> =>
    await db.select().from(milestones).where(eq(milestones.budgetId, budgetId)).all();

  const insertMilestones = (rows: MilestoneRow[]) => rows.map((row) => db.insert(milestones).values(row));

  return {
    findBudget,
    listMilestones,

    async projectExists(projectId: string): Promise<boolean> {
      const rows = await db.select().from(projects).where(eq(projects.id, projectId)).all();
      return rows.length > 0;
    },

    async findMilestone(id: string): Promise<MilestoneRow | undefined> {
      return (await db.select().from(milestones).where(eq(milestones.id, id)).all())[0];
    },

    /** Presupuestos de un proyecto con sus hitos, en dos consultas (sin N+1). */
    async listBudgetsWithMilestones(projectId: string): Promise<BudgetWithMilestones[]> {
      const projectBudgets = await db.select().from(budgets).where(eq(budgets.projectId, projectId)).all();
      if (projectBudgets.length === 0) return [];

      const rows = await db
        .select()
        .from(milestones)
        .where(
          inArray(
            milestones.budgetId,
            projectBudgets.map((b) => b.id)
          )
        )
        .all();
      return projectBudgets.map((b) => ({ ...b, milestones: rows.filter((m) => m.budgetId === b.id) }));
    },

    /** Inserta el presupuesto y todos sus hitos de forma atómica. */
    async insertBudgetWithMilestones(budget: BudgetRow, milestoneRows: MilestoneRow[]): Promise<void> {
      await runAtomic(db, [db.insert(budgets).values(budget), ...insertMilestones(milestoneRows)]);
    },

    /** Actualiza el presupuesto y reemplaza sus hitos de forma atómica (nunca queda sin hitos a mitad de camino). */
    async replaceBudget(
      id: string,
      fields: Pick<BudgetRow, 'title' | 'totalAmount' | 'currency' | 'updatedAt'>,
      milestoneRows: MilestoneRow[]
    ): Promise<void> {
      await runAtomic(db, [
        db.update(budgets).set(fields).where(eq(budgets.id, id)),
        db.delete(milestones).where(eq(milestones.budgetId, id)),
        ...insertMilestones(milestoneRows),
      ]);
    },

    /** RN-03: presupuesto APPROVED, proyecto IN_PROGRESS y hitos DRAFT → PENDING en una sola unidad atómica. */
    async approve(budget: BudgetRow, nowIso: string): Promise<void> {
      await runAtomic(db, [
        db.update(budgets).set({ status: 'APPROVED', updatedAt: nowIso }).where(eq(budgets.id, budget.id)),
        db.update(projects).set({ status: 'IN_PROGRESS', updatedAt: nowIso }).where(eq(projects.id, budget.projectId)),
        db
          .update(milestones)
          .set({ status: 'PENDING', updatedAt: nowIso })
          .where(and(eq(milestones.budgetId, budget.id), eq(milestones.status, 'DRAFT'))),
      ]);
    },

    async reject(id: string, nowIso: string): Promise<void> {
      await db.update(budgets).set({ status: 'REJECTED', updatedAt: nowIso }).where(eq(budgets.id, id));
    },

    async markMilestonePaid(id: string, nowIso: string): Promise<void> {
      await db.update(milestones).set({ status: 'PAID', paidAt: nowIso, updatedAt: nowIso }).where(eq(milestones.id, id));
    },

    /** RN-04: un solo UPDATE marca PAID todos los hitos PENDING del presupuesto. */
    async markPendingMilestonesPaid(budgetId: string, nowIso: string): Promise<void> {
      await db
        .update(milestones)
        .set({ status: 'PAID', paidAt: nowIso, updatedAt: nowIso })
        .where(and(eq(milestones.budgetId, budgetId), eq(milestones.status, 'PENDING')));
    },
  };
}

export type BudgetsRepository = ReturnType<typeof createBudgetsRepository>;
