import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { budgets, clients, milestones, projects, type AppDatabase } from '../../db';
import { runAtomic } from '../../db/atomic';
import { createBudgetsRepository } from '../budgets/repository';
import type { ProjectChanges } from './domain';

export type ProjectRow = typeof projects.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;

/** Acceso a datos de proyectos. La cancelación en cascada es atómica. */
export function createProjectsRepository(db: AppDatabase) {
  const budgetsRepo = createBudgetsRepository(db);

  return {
    async findProject(id: string): Promise<ProjectRow | undefined> {
      return (await db.select().from(projects).where(eq(projects.id, id)).all())[0];
    },

    async findClient(id: string): Promise<ClientRow | undefined> {
      return (await db.select().from(clients).where(eq(clients.id, id)).all())[0];
    },

    async listProjects(): Promise<ProjectRow[]> {
      return await db.select().from(projects).all();
    },

    async listClients(): Promise<ClientRow[]> {
      return await db.select().from(clients).all();
    },

    async listAllBudgets() {
      return await db.select().from(budgets).all();
    },

    async listAllMilestones() {
      return await db.select().from(milestones).all();
    },

    /** Presupuestos del proyecto con sus hitos (la misma carga que expone el módulo de presupuestos). */
    listBudgetsWithMilestones: budgetsRepo.listBudgetsWithMilestones,

    /** Proyectos que pasan el filtro SQL del showcase (RN-07); el servicio aplica la regla completa. */
    async listShowcaseCandidates(): Promise<ProjectRow[]> {
      return await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.status, 'COMPLETED'),
            eq(projects.productionStatus, 'ACTIVE'),
            isNotNull(projects.productionUrl),
            ne(projects.productionUrl, '')
          )
        )
        .all();
    },

    async insertProject(row: ProjectRow): Promise<void> {
      await db.insert(projects).values(row);
    },

    async updateProject(id: string, changes: ProjectChanges): Promise<void> {
      await db.update(projects).set(changes).where(eq(projects.id, id));
    },

    /** RN-05: actualiza el proyecto y cancela sus hitos PENDING (nunca los PAID) en una sola unidad atómica. */
    async updateAndCancelPendingMilestones(id: string, changes: ProjectChanges): Promise<void> {
      // Subconsulta en SQL: sobre la unión D1Db | SqliteDb, `select({...})` con argumentos no tipa.
      const belongsToProject = sql`${milestones.budgetId} IN (SELECT ${budgets.id} FROM ${budgets} WHERE ${budgets.projectId} = ${id})`;
      await runAtomic(db, [
        db.update(projects).set(changes).where(eq(projects.id, id)),
        db
          .update(milestones)
          .set({ status: 'CANCELLED', updatedAt: changes.updatedAt })
          .where(and(belongsToProject, eq(milestones.status, 'PENDING'))),
      ]);
    },

    async updateRenewalDate(id: string, renewalDate: string, nowIso: string): Promise<void> {
      await db.update(projects).set({ recurringRenewalDate: renewalDate, updatedAt: nowIso }).where(eq(projects.id, id));
    },
  };
}

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
