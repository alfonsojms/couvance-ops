import { eq } from 'drizzle-orm';
import { budgets, clients, milestones, projects, type AppDatabase } from '../../db';
import type { ClientChanges } from './domain';

export type ClientRow = typeof clients.$inferSelect;

/** Acceso a datos de clientes. */
export function createClientsRepository(db: AppDatabase) {
  const findClient = async (id: string): Promise<ClientRow | undefined> =>
    (await db.select().from(clients).where(eq(clients.id, id)).all())[0];

  return {
    findClient,

    /** Todas las filas necesarias para el listado con saldos (cuatro consultas, sin N+1). */
    async loadBalanceSources() {
      return {
        clients: await db.select().from(clients).all(),
        projects: await db.select().from(projects).all(),
        budgets: await db.select().from(budgets).all(),
        milestones: await db.select().from(milestones).all(),
      };
    },

    async countProjects(clientId: string): Promise<number> {
      return (await db.select().from(projects).where(eq(projects.clientId, clientId)).all()).length;
    },

    async insertClient(row: ClientRow): Promise<void> {
      await db.insert(clients).values(row);
    },

    async updateClient(id: string, changes: ClientChanges): Promise<void> {
      await db.update(clients).set(changes).where(eq(clients.id, id));
    },

    async deleteClient(id: string): Promise<void> {
      await db.delete(clients).where(eq(clients.id, id));
    },
  };
}

export type ClientsRepository = ReturnType<typeof createClientsRepository>;
