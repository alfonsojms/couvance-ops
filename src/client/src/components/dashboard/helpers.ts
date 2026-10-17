// Reglas puras del Radar: sin React ni red, para poder probarlas aisladas.
import type { PaidMilestone, PendingMilestone } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export type DashboardSubTab = 'pending' | 'history';

export interface PayAllModalData {
  budgetId: string;
  projectTitle: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  milestonesCount: number;
}

export interface UrgencyInfo {
  variant: 'danger' | 'warning' | 'neutral';
  label: string;
  cardBorderClass: string;
  isOverdue: boolean;
}

export function getMilestoneUrgency(dueDateStr?: string | null): UrgencyInfo {
  if (!dueDateStr) {
    return {
      variant: 'neutral',
      label: 'Sin fecha límite',
      cardBorderClass: 'border-neutral-800 hover:border-neutral-700',
      isOverdue: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split('-');
  let due: Date;
  if (parts.length === 3) {
    due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    due = new Date(dueDateStr);
  }
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      variant: 'danger',
      label: `Vencido hace ${absDays} ${absDays === 1 ? 'día' : 'días'}`,
      cardBorderClass: 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50',
      isOverdue: true,
    };
  } else if (diffDays === 0) {
    return {
      variant: 'warning',
      label: 'Vence hoy',
      cardBorderClass: 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50',
      isOverdue: false,
    };
  } else if (diffDays <= 2) {
    return {
      variant: 'warning',
      label: `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
      cardBorderClass: 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50',
      isOverdue: false,
    };
  } else {
    return {
      variant: 'neutral',
      label: `Vence: ${formatDate(dueDateStr)}`,
      cardBorderClass: 'border-neutral-800 hover:border-neutral-700',
      isOverdue: false,
    };
  }
}

// Resumen para el modal "Cobrar Todo": suma los hitos pendientes del mismo presupuesto.
export function buildPayAllSummary(
  pending: PendingMilestone[],
  m: PendingMilestone
): PayAllModalData {
  const related = pending.filter((item) => item.budgetId === m.budgetId);
  const total = related.reduce((acc, curr) => acc + curr.amount, 0);
  return {
    budgetId: m.budgetId,
    projectTitle: m.projectTitle,
    clientName: m.clientName,
    totalAmount: total,
    currency: m.currency,
    milestonesCount: related.length,
  };
}

// Filtro del historial por cliente, proyecto, hito o categoría (sin distinguir mayúsculas).
export function filterPaidMilestones(paid: PaidMilestone[], search: string): PaidMilestone[] {
  if (!search.trim()) return paid;
  const q = search.toLowerCase().trim();
  return paid.filter(
    (m) =>
      m.clientName.toLowerCase().includes(q) ||
      m.projectTitle.toLowerCase().includes(q) ||
      m.milestoneTitle.toLowerCase().includes(q) ||
      m.projectCategory.toLowerCase().includes(q)
  );
}

export function sumAmounts(items: { amount: number }[]): number {
  return items.reduce((acc, curr) => acc + curr.amount, 0);
}
