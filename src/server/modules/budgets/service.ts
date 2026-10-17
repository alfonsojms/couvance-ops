import { conflict, invalid, notFound } from '../../shared/errors';
import {
  calculateMilestonesAmounts,
  canDecideBudget,
  canEditBudget,
  decideMilestonePayment,
  type ComputedMilestone,
} from './domain';
import type { BudgetRow, BudgetsRepository, BudgetWithMilestones, MilestoneRow } from './repository';
import type { BudgetCreateInput } from './schemas';

export interface ServiceClock {
  now: () => string;
  newId: () => string;
}

const systemClock: ServiceClock = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};

const BUDGET_NOT_FOUND = 'Presupuesto no encontrado';

/** Casos de uso de presupuestos e hitos. No conoce HTTP: lanza DomainError y devuelve datos. */
export function createBudgetsService(repo: BudgetsRepository, clock: ServiceClock = systemClock) {
  function buildMilestoneRows(budgetId: string, computed: ComputedMilestone[], nowIso: string): MilestoneRow[] {
    return computed.map((m) => ({
      id: clock.newId(),
      budgetId,
      title: m.title.trim(),
      percentage: m.percentage,
      amount: m.amount,
      dueDate: m.dueDate,
      status: 'DRAFT',
      paidAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
  }

  async function requireBudget(id: string): Promise<BudgetRow> {
    const budget = await repo.findBudget(id);
    if (!budget) throw notFound(BUDGET_NOT_FOUND);
    return budget;
  }

  return {
    /** Crea el presupuesto y sus hitos en DRAFT, con montos enteros (RN-01). */
    async createBudget(projectId: string, input: BudgetCreateInput): Promise<BudgetWithMilestones> {
      if (!(await repo.projectExists(projectId))) throw notFound('Proyecto no encontrado');

      const nowIso = clock.now();
      const budget: BudgetRow = {
        id: clock.newId(),
        projectId,
        title: input.title.trim(),
        totalAmount: input.totalAmount,
        currency: input.currency,
        status: 'DRAFT',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const milestoneRows = buildMilestoneRows(budget.id, calculateMilestonesAmounts(input.totalAmount, input.milestones), nowIso);

      await repo.insertBudgetWithMilestones(budget, milestoneRows);
      return { ...budget, milestones: milestoneRows };
    },

    listProjectBudgets(projectId: string): Promise<BudgetWithMilestones[]> {
      return repo.listBudgetsWithMilestones(projectId);
    },

    async getBudget(id: string): Promise<BudgetWithMilestones> {
      const budget = await requireBudget(id);
      return { ...budget, milestones: await repo.listMilestones(id) };
    },

    /** Edita un presupuesto en DRAFT reemplazando sus hitos de forma atómica. */
    async updateBudget(id: string, input: BudgetCreateInput): Promise<BudgetWithMilestones> {
      const existing = await requireBudget(id);
      if (!canEditBudget(existing.status)) {
        throw invalid('Solo se pueden editar presupuestos en estado DRAFT (Borrador).');
      }

      const nowIso = clock.now();
      const fields = { title: input.title, totalAmount: input.totalAmount, currency: input.currency, updatedAt: nowIso };
      const milestoneRows = buildMilestoneRows(id, calculateMilestonesAmounts(input.totalAmount, input.milestones), nowIso);

      await repo.replaceBudget(id, fields, milestoneRows);
      return { ...existing, ...fields, milestones: milestoneRows };
    },

    /** RN-03 + S8: aprueba en un solo paso atómico, solo desde DRAFT o SENT. */
    async approveBudget(id: string): Promise<BudgetWithMilestones> {
      const budget = await requireBudget(id);
      if (!canDecideBudget(budget.status)) {
        throw conflict(
          `No se puede aprobar un presupuesto en estado ${budget.status}. Solo se aprueban presupuestos en DRAFT o SENT.`
        );
      }

      await repo.approve(budget, clock.now());
      return { ...(await requireBudget(id)), milestones: await repo.listMilestones(id) };
    },

    /** S8: rechaza solo desde DRAFT o SENT. */
    async rejectBudget(id: string): Promise<BudgetRow> {
      const budget = await requireBudget(id);
      if (!canDecideBudget(budget.status)) {
        throw conflict(
          `No se puede rechazar un presupuesto en estado ${budget.status}. Solo se rechazan presupuestos en DRAFT o SENT.`
        );
      }

      await repo.reject(id, clock.now());
      return requireBudget(id);
    },

    /** S8: cobra un hito PENDING; un hito ya PAID se devuelve intacto (idempotente). */
    async payMilestone(id: string): Promise<MilestoneRow> {
      const milestone = await repo.findMilestone(id);
      if (!milestone) throw notFound('Hito no encontrado');

      switch (decideMilestonePayment(milestone.status)) {
        case 'cancelled':
          throw conflict('No es posible cobrar un hito que ha sido cancelado.');
        case 'not-approved':
          throw conflict('No es posible cobrar un hito de un presupuesto que aún no fue aprobado.');
        case 'already-paid':
          return milestone;
        case 'pay': {
          await repo.markMilestonePaid(id, clock.now());
          const updated = await repo.findMilestone(id);
          return updated ?? milestone;
        }
      }
    },

    /** RN-04: marca PAID todos los hitos PENDING del presupuesto. */
    async payAllPending(budgetId: string): Promise<MilestoneRow[]> {
      await requireBudget(budgetId);
      await repo.markPendingMilestonesPaid(budgetId, clock.now());
      return repo.listMilestones(budgetId);
    },
  };
}

export type BudgetsService = ReturnType<typeof createBudgetsService>;
