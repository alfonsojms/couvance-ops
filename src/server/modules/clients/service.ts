import { systemClock, type ServiceClock } from '../../shared/clock';
import { conflict, notFound } from '../../shared/errors';
import { sumMilestones } from '../projects/domain';
import { buildClientUpdate, clientDeletionBlocker, type ClientInput } from './domain';
import type { ClientRow, ClientsRepository } from './repository';
import type { ClientCreateInput } from './schemas';

const CLIENT_NOT_FOUND = 'Cliente no encontrado';

export type ClientListItem = ClientRow & { projectsCount: number; totalPaid: number; totalPending: number };

/** Casos de uso de clientes. No conoce HTTP: lanza DomainError y devuelve datos. */
export function createClientsService(repo: ClientsRepository, clock: ServiceClock = systemClock) {
  async function requireClient(id: string): Promise<ClientRow> {
    const client = await repo.findClient(id);
    if (!client) throw notFound(CLIENT_NOT_FOUND);
    return client;
  }

  return {
    /** Listado con cantidad de proyectos y saldos cobrado/pendiente por cliente. */
    async listClients(): Promise<ClientListItem[]> {
      const sources = await repo.loadBalanceSources();

      return sources.clients.map((client) => {
        const clientProjectIds = new Set(sources.projects.filter((p) => p.clientId === client.id).map((p) => p.id));
        const clientBudgetIds = new Set(sources.budgets.filter((b) => clientProjectIds.has(b.projectId)).map((b) => b.id));
        const { totalPaid, totalPending } = sumMilestones(sources.milestones.filter((m) => clientBudgetIds.has(m.budgetId)));
        return { ...client, projectsCount: clientProjectIds.size, totalPaid, totalPending };
      });
    },

    async createClient(input: ClientCreateInput): Promise<ClientRow> {
      const nowIso = clock.now();
      const client: ClientRow = {
        id: clock.newId(),
        name: input.name.trim(),
        contactName: input.contactName?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await repo.insertClient(client);
      return client;
    },

    async updateClient(id: string, input: ClientInput): Promise<ClientRow> {
      await requireClient(id);
      await repo.updateClient(id, buildClientUpdate(input, clock.now()));
      return requireClient(id);
    },

    /** RN-06: borra solo clientes sin proyectos (si no, 409). */
    async deleteClient(id: string): Promise<void> {
      await requireClient(id);
      const blocker = clientDeletionBlocker(await repo.countProjects(id));
      if (blocker) throw conflict(blocker);
      await repo.deleteClient(id);
    },
  };
}

export type ClientsService = ReturnType<typeof createClientsService>;
