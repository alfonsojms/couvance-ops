// Reglas de negocio puras de proyectos: sin Hono, sin Drizzle, sin reloj ni IDs propios.

export type ProjectStatus = 'PROSPECT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RecurringPeriod = 'MONTHLY' | 'ANNUALLY';

/** Campos editables de un proyecto, ya validados por Zod. */
export interface ProjectInput {
  title?: string;
  category?: string;
  status?: string;
  productionUrl?: string | null;
  productionStatus?: string;
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring?: number;
  recurringAmount?: number | null;
  recurringCurrency?: string;
  recurringPeriod?: string;
  recurringRenewalDate?: string | null;
}

/** Cambios a persistir sobre un proyecto existente. */
export interface ProjectChanges {
  updatedAt: string;
  title?: string;
  category?: string;
  status?: string;
  productionUrl?: string | null;
  productionStatus?: string;
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring?: number;
  recurringAmount?: number | null;
  recurringCurrency?: string;
  recurringPeriod?: string;
  recurringRenewalDate?: string | null;
}

export const RENEWAL_DATE_REQUIRED = 'La fecha de renovación es obligatoria cuando el servicio recurrente está activo';
export const RECURRING_AMOUNT_REQUIRED = 'El monto recurrente es obligatorio cuando el servicio recurrente está activo';

/**
 * Un servicio recurrente activo necesita fecha de renovación y monto mayor a 0.
 * Devuelve el mensaje de la primera regla incumplida, o null si es válido.
 */
export function recurringServiceViolation(
  hasRecurring: number | undefined,
  renewalDate: string | null | undefined,
  amount: number | null | undefined
): string | null {
  if (hasRecurring !== 1) return null;
  if (!renewalDate || renewalDate.trim() === '') return RENEWAL_DATE_REQUIRED;
  if (amount === undefined || amount === null || amount <= 0) return RECURRING_AMOUNT_REQUIRED;
  return null;
}

/**
 * Traduce una edición parcial a los cambios a persistir. Desactivar el recurrente limpia monto y fecha;
 * el monto solo se guarda si el recurrente queda activo.
 */
export function buildProjectUpdate(data: ProjectInput, existing: { hasRecurring: number }, nowIso: string): ProjectChanges {
  const updateData: ProjectChanges = {
    updatedAt: nowIso,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.productionUrl !== undefined) updateData.productionUrl = data.productionUrl || null;
  if (data.productionStatus !== undefined) updateData.productionStatus = data.productionStatus;
  if (data.codeRepoUrl !== undefined) updateData.codeRepoUrl = data.codeRepoUrl || null;
  if (data.resourcesUrl !== undefined) updateData.resourcesUrl = data.resourcesUrl || null;
  if (data.hasRecurring !== undefined) {
    updateData.hasRecurring = data.hasRecurring;
    if (data.hasRecurring === 0) {
      updateData.recurringAmount = null;
      updateData.recurringRenewalDate = null;
    }
  }
  if (data.recurringAmount !== undefined && (data.hasRecurring ?? existing.hasRecurring) === 1) {
    updateData.recurringAmount = data.recurringAmount;
  }
  if (data.recurringCurrency !== undefined) updateData.recurringCurrency = data.recurringCurrency;
  if (data.recurringPeriod !== undefined) updateData.recurringPeriod = data.recurringPeriod;
  if (data.recurringRenewalDate !== undefined) {
    updateData.recurringRenewalDate = data.recurringRenewalDate || null;
  }

  return updateData;
}

/** RN-08: siguiente fecha de renovación (YYYY-MM-DD) sumando un mes o un año. */
export function calculateNextRenewalDate(currentDateString: string, period: RecurringPeriod): string {
  const [year, month, day] = currentDateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (period === 'MONTHLY') {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface ProjectTotals {
  totalBudgeted: number;
  totalPaid: number;
  totalPending: number;
}

export interface BudgetForTotals {
  status: string;
  totalAmount: number;
  milestones: Array<{ status: string; amount: number }>;
}

/**
 * Totales de un proyecto: presupuestado (presupuestos DRAFT, SENT o APPROVED),
 * cobrado (hitos PAID) y pendiente (hitos PENDING).
 */
export function computeProjectTotals(projectBudgets: BudgetForTotals[]): ProjectTotals {
  let totalBudgeted = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const b of projectBudgets) {
    for (const m of b.milestones) {
      if (m.status === 'PAID') {
        totalPaid += m.amount;
      } else if (m.status === 'PENDING') {
        totalPending += m.amount;
      }
    }
    if (b.status === 'APPROVED' || b.status === 'DRAFT' || b.status === 'SENT') {
      totalBudgeted += b.totalAmount;
    }
  }

  return { totalBudgeted, totalPaid, totalPending };
}

/** RN-07: solo proyectos COMPLETED, en producción ACTIVE y con URL de producción no vacía. */
export function isShowcaseEligible(project: { status: string; productionStatus: string; productionUrl: string | null }): boolean {
  return (
    project.status === 'COMPLETED' &&
    project.productionStatus === 'ACTIVE' &&
    Boolean(project.productionUrl && project.productionUrl.trim().length > 0)
  );
}
