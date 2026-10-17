import { budgets, clients, milestones, projects, type AppDatabase } from '../../db';

/** Lectura completa de las tablas de negocio. `auth_config` queda fuera a propósito (RN-10). */
export function createBackupRepository(db: AppDatabase) {
  return {
    async loadBusinessData() {
      return {
        clients: await db.select().from(clients).all(),
        projects: await db.select().from(projects).all(),
        budgets: await db.select().from(budgets).all(),
        milestones: await db.select().from(milestones).all(),
      };
    },
  };
}

export type BackupRepository = ReturnType<typeof createBackupRepository>;
