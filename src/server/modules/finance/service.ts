import { systemClock, type ServiceClock } from '../../shared/clock';
import { sumMilestones } from '../projects/domain';
import { compareByDueDate, getDaysUntil, RENEWAL_ALERT_WINDOW_DAYS, summarizeRecurring } from './domain';
import type { FinanceRepository } from './repository';

/** Casos de uso de finanzas (radar, historial, métricas). Solo lectura. */
export function createFinanceService(repo: FinanceRepository, clock: ServiceClock = systemClock) {
  return {
    /** RN-08: hitos PENDING por vencimiento y recurrentes que vencen en 30 días o menos, más urgentes primero. */
    async getRadar() {
      const today = new Date(clock.now());
      const pendingMilestones = (await repo.listPendingMilestones()).sort(compareByDueDate);

      const recurringAlerts = (await repo.listRecurringProjects())
        .filter((p) => p.recurringRenewalDate && getDaysUntil(p.recurringRenewalDate, today) <= RENEWAL_ALERT_WINDOW_DAYS)
        .map((p) => {
          const daysRemaining = p.recurringRenewalDate ? getDaysUntil(p.recurringRenewalDate, today) : 0;
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
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      return { pendingMilestones, recurringAlerts };
    },

    /** Historial de cobros con el total cobrado. */
    async getHistory() {
      const history = await repo.listPaidMilestones();
      const totalCollected = history.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      return { history, totalCollected, totalCount: history.length };
    },

    /** Métricas globales de caja: en la calle (PENDING), cobrado (PAID), recurrentes y proyectos. */
    async getMetrics() {
      const allProjects = await repo.listAllProjects();
      const { totalPaid, totalPending } = sumMilestones(await repo.listAllMilestones());

      return {
        totalInTheStreet: totalPending,
        totalPending,
        totalCollected: totalPaid,
        ...summarizeRecurring(allProjects),
        activeProjectsCount: allProjects.filter((p) => p.status === 'IN_PROGRESS').length,
        totalProjectsCount: allProjects.length,
      };
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
