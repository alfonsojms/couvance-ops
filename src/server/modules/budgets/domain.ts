// Reglas de negocio puras de presupuestos e hitos: sin Hono, sin Drizzle, sin reloj ni IDs propios.

export type BudgetStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type MilestoneStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

export interface MilestonePlanItem {
  title: string;
  percentage: number;
  dueDate?: string | null;
}

export interface ComputedMilestone {
  title: string;
  percentage: number;
  amount: number;
  dueDate: string | null;
}

/**
 * RN-01: montos enteros por hito. Cada hito se redondea sobre su porcentaje y el último absorbe
 * el residuo, de modo que la suma de montos es exactamente `totalAmount`.
 */
export function calculateMilestonesAmounts(totalAmount: number, items: MilestonePlanItem[]): ComputedMilestone[] {
  let accumulatedAmount = 0;

  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    let amount: number;

    if (isLast) {
      amount = totalAmount - accumulatedAmount;
    } else {
      amount = Math.round((totalAmount * item.percentage) / 100);
      accumulatedAmount += amount;
    }

    return {
      title: item.title,
      percentage: item.percentage,
      amount,
      dueDate: item.dueDate || null,
    };
  });
}

/** Solo un presupuesto en borrador se puede editar. */
export function canEditBudget(status: string): boolean {
  return status === 'DRAFT';
}

/** S8: aprobar o rechazar solo es válido desde DRAFT o SENT. */
export function canDecideBudget(status: string): boolean {
  return status === 'DRAFT' || status === 'SENT';
}

/**
 * S8: qué hacer al cobrar un hito según su estado actual.
 * - `pay`: PENDING pasa a PAID.
 * - `already-paid`: idempotente; se devuelve tal cual, sin tocar la fecha de cobro original.
 * - `not-approved` / `cancelled`: no se puede cobrar.
 */
export type MilestonePaymentDecision = 'pay' | 'already-paid' | 'not-approved' | 'cancelled';

export function decideMilestonePayment(status: string): MilestonePaymentDecision {
  switch (status) {
    case 'PENDING':
      return 'pay';
    case 'PAID':
      return 'already-paid';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'not-approved';
  }
}
