import { systemClock, type ServiceClock } from '../../shared/clock';
import { groupBy } from '../../shared/collections';
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
      // Agrupado una sola vez: cada fila se visita una vez, no una vez por cliente.
      const projectsByClient = groupBy(sources.projects, (p) => p.clientId);
      const budgetsByProject = groupBy(sources.budgets, (b) => b.projectId);
      const milestonesByBudget = groupBy(sources.milestones, (m) => m.budgetId);

      return sources.clients.map((client) => {
        const clientProjects = projectsByClient.get(client.id) || [];
        const clientMilestones = clientProjects.flatMap((p) =>
          (budgetsByProject.get(p.id) || []).flatMap((b) => milestonesByBudget.get(b.id) || [])
        );
        return { ...client, projectsCount: clientProjects.length, ...sumMilestones(clientMilestones) };
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
