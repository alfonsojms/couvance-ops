import { systemClock, type ServiceClock } from '../../shared/clock';
import { groupBy } from '../../shared/collections';
import { conflict, invalid, notFound } from '../../shared/errors';
import {
  buildProjectUpdate,
  calculateNextRenewalDate,
  computeProjectTotals,
  isShowcaseEligible,
  recurringServiceViolation,
  type ProjectInput,
  type ProjectTotals,
  type RecurringPeriod,
} from './domain';
import type { ClientRow, ProjectRow, ProjectsRepository } from './repository';
import type { ProjectCategory, ProjectCreateInput, ProjectStatusFilter } from './schemas';

const PROJECT_NOT_FOUND = 'Proyecto no encontrado';

export type ProjectListItem = ProjectRow & ProjectTotals & { client: ClientRow | null };

/** Casos de uso de proyectos y showcase. No conoce HTTP: lanza DomainError y devuelve datos. */
export function createProjectsService(repo: ProjectsRepository, clock: ServiceClock = systemClock) {
  async function requireProject(id: string): Promise<ProjectRow> {
    const project = await repo.findProject(id);
    if (!project) throw notFound(PROJECT_NOT_FOUND);
    return project;
  }

  return {
    /** Listado con cliente y totales por proyecto, filtrable por estado. */
    async listProjects(statusFilter: ProjectStatusFilter | null): Promise<ProjectListItem[]> {
      const allProjects = await repo.listProjects();
      const filtered = statusFilter ? allProjects.filter((p) => p.status === statusFilter) : allProjects;

      const clientsById = new Map((await repo.listClients()).map((cl) => [cl.id, cl]));
      const budgetsByProject = groupBy(await repo.listAllBudgets(), (b) => b.projectId);
      const milestonesByBudget = groupBy(await repo.listAllMilestones(), (m) => m.budgetId);

      return filtered.map((proj) => {
        const projectBudgets = (budgetsByProject.get(proj.id) || []).map((b) => ({
          ...b,
          milestones: milestonesByBudget.get(b.id) || [],
        }));
        return { ...proj, client: clientsById.get(proj.clientId) || null, ...computeProjectTotals(projectBudgets) };
      });
    },

    /** Detalle con cliente, presupuestos e hitos. */
    async getProject(id: string) {
      const project = await requireProject(id);
      const client = await repo.findClient(project.clientId);
      return { ...project, client: client || null, budgets: await repo.listBudgetsWithMilestones(id) };
    },

    async createProject(input: ProjectCreateInput): Promise<ProjectRow> {
      if (!(await repo.findClient(input.clientId))) throw invalid('El cliente especificado no existe');

      const violation = recurringServiceViolation(
        input.hasRecurring,
        input.recurringRenewalDate,
        input.recurringAmount,
      );
      if (violation) throw invalid(violation);

      const nowIso = clock.now();
      const project: ProjectRow = {
        id: clock.newId(),
        clientId: input.clientId,
        title: input.title,
        category: input.category,
        status: input.status,
        productionUrl: input.productionUrl || null,
        productionStatus: input.productionStatus,
        codeRepoUrl: input.codeRepoUrl || null,
        resourcesUrl: input.resourcesUrl || null,
        hasRecurring: input.hasRecurring,
        recurringAmount: input.hasRecurring ? input.recurringAmount || null : null,
        recurringCurrency: input.recurringCurrency,
        recurringPeriod: input.recurringPeriod,
        recurringRenewalDate: input.hasRecurring ? input.recurringRenewalDate || null : null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await repo.insertProject(project);
      return project;
    },

    /** PUT: actualización completa. Pasar a CANCELLED cancela los hitos PENDING en la misma unidad atómica (RN-05). */
    async updateProject(id: string, input: ProjectInput): Promise<ProjectRow> {
      const existing = await requireProject(id);
      const changes = buildProjectUpdate(input, existing, clock.now());

      if (input.status === 'CANCELLED') {
        await repo.updateAndCancelPendingMilestones(id, changes);
      } else {
        await repo.updateProject(id, changes);
      }
      return requireProject(id);
    },

    /** PATCH: edición de metadatos; un proyecto cancelado no se edita. */
    async softEditProject(id: string, input: ProjectInput): Promise<ProjectRow> {
      const existing = await requireProject(id);
      if (existing.status === 'CANCELLED') throw conflict('Un proyecto cancelado no se puede editar');

      const violation = recurringServiceViolation(
        input.hasRecurring !== undefined ? input.hasRecurring : existing.hasRecurring,
        input.recurringRenewalDate !== undefined ? input.recurringRenewalDate : existing.recurringRenewalDate,
        input.recurringAmount !== undefined ? input.recurringAmount : existing.recurringAmount,
      );
      if (violation) throw invalid(violation);

      await repo.updateProject(id, buildProjectUpdate(input, existing, clock.now()));
      return requireProject(id);
    },

    /** RN-08: suma un período a la fecha de renovación y devuelve la nueva fecha. */
    async renewProject(id: string): Promise<string> {
      const project = await requireProject(id);
      if (project.hasRecurring !== 1 || !project.recurringRenewalDate) {
        throw invalid('El proyecto no tiene un servicio recurrente configurado con fecha de renovación.');
      }

      const nextRenewalDate = calculateNextRenewalDate(
        project.recurringRenewalDate,
        project.recurringPeriod as RecurringPeriod,
      );
      await repo.updateRenewalDate(id, nextRenewalDate, clock.now());
      return nextRenewalDate;
    },

    /** RN-07: portafolio público, filtrable por categoría. */
    async listShowcase(categoryFilter: ProjectCategory | null) {
      const eligible = (await repo.listShowcaseCandidates()).filter(isShowcaseEligible);
      const filtered = categoryFilter ? eligible.filter((p) => p.category === categoryFilter) : eligible;

      const clientsById = new Map((await repo.listClients()).map((cl) => [cl.id, cl]));
      return filtered.map((proj) => ({ ...proj, clientName: clientsById.get(proj.clientId)?.name || 'Cliente' }));
    },
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;
