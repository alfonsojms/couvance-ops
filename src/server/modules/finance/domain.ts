// Reglas de negocio puras de finanzas: sin Hono, sin Drizzle; la fecha de hoy llega como parámetro.

/** Días entre hoy y `dateString` (YYYY-MM-DD o fecha parseable), en hora local. 999 si la fecha no es válida. */
export function getDaysUntil(dateString: string, today: Date): number {
  if (!dateString || typeof dateString !== 'string') return 999;
  const now = new Date(today.getTime());
  now.setHours(0, 0, 0, 0);

  const parts = dateString.split('-');
  if (parts.length < 3) {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return 999;
    parsed.setHours(0, 0, 0, 0);
    return Math.round((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return 999;
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** RN-08: los recurrentes entran al radar cuando vencen en 30 días o menos (incluye vencidos). */
export const RENEWAL_ALERT_WINDOW_DAYS = 30;

/** RN-08: hitos por `dueDate` ascendente; los que no tienen fecha van al final. */
export function compareByDueDate(a: { dueDate: string | null }, b: { dueDate: string | null }): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return String(a.dueDate).localeCompare(String(b.dueDate));
}

export interface RecurringSource {
  hasRecurring: number;
  status: string;
  recurringAmount: number | null;
  recurringPeriod: string;
}

/** Ingresos recurrentes activos (proyectos no cancelados con monto), separados por período. */
export function summarizeRecurring(items: RecurringSource[]) {
  let totalActiveRecurring = 0;
  let monthlyRecurring = 0;
  let annuallyRecurring = 0;
  let activeRecurringCount = 0;

  for (const p of items) {
    if (p.hasRecurring === 1 && p.status !== 'CANCELLED' && p.recurringAmount) {
      const recAmount = Number(p.recurringAmount) || 0;
      totalActiveRecurring += recAmount;
      activeRecurringCount++;
      if (p.recurringPeriod === 'MONTHLY') {
        monthlyRecurring += recAmount;
      } else {
        annuallyRecurring += recAmount;
      }
    }
  }

  return { totalActiveRecurring, monthlyRecurring, annuallyRecurring, activeRecurringCount };
}
