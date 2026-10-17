import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPayAllSummary,
  filterPaidMilestones,
  getMilestoneUrgency,
  sumAmounts,
} from '../src/client/src/components/dashboard/helpers';
import type { PaidMilestone, PendingMilestone } from '../src/client/src/lib/types';

const pending = (over: Partial<PendingMilestone>): PendingMilestone =>
  ({
    id: 'm1',
    budgetId: 'b1',
    projectId: 'p1',
    projectTitle: 'Web Corporativa',
    clientName: 'ACME',
    milestoneTitle: 'Anticipo',
    amount: 100,
    currency: 'USD',
    percentage: 50,
    dueDate: null,
    clientPhone: null,
    ...over,
  }) as PendingMilestone;

const paid = (over: Partial<PaidMilestone>): PaidMilestone =>
  ({
    id: 'x1',
    budgetId: 'b1',
    milestoneTitle: 'Anticipo',
    projectTitle: 'Web Corporativa',
    projectCategory: 'WEB',
    clientName: 'ACME',
    amount: 100,
    currency: 'USD',
    percentage: 50,
    paidAt: '2026-10-01',
    ...over,
  }) as PaidMilestone;

describe('getMilestoneUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 15, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('sin fecha es neutral', () => {
    expect(getMilestoneUrgency(null)).toMatchObject({ variant: 'neutral', label: 'Sin fecha límite', isOverdue: false });
  });

  it('marca vencidos con singular y plural', () => {
    expect(getMilestoneUrgency('2026-10-16')).toMatchObject({ variant: 'danger', label: 'Vencido hace 1 día', isOverdue: true });
    expect(getMilestoneUrgency('2026-10-14').label).toBe('Vencido hace 3 días');
  });

  it('avisa hoy y los próximos 2 días', () => {
    expect(getMilestoneUrgency('2026-10-17')).toMatchObject({ variant: 'warning', label: 'Vence hoy' });
    expect(getMilestoneUrgency('2026-10-18').label).toBe('Vence en 1 día');
    expect(getMilestoneUrgency('2026-10-19').label).toBe('Vence en 2 días');
  });

  it('más allá de 2 días es neutral', () => {
    expect(getMilestoneUrgency('2026-10-20')).toMatchObject({ variant: 'neutral', isOverdue: false });
    expect(getMilestoneUrgency('2026-10-20').label).toMatch(/^Vence: /);
  });
});

describe('buildPayAllSummary', () => {
  it('suma solo los hitos pendientes del mismo presupuesto', () => {
    const list = [
      pending({ id: 'a', amount: 100 }),
      pending({ id: 'b', amount: 250 }),
      pending({ id: 'c', budgetId: 'b2', amount: 999 }),
    ];
    expect(buildPayAllSummary(list, list[0])).toEqual({
      budgetId: 'b1',
      projectTitle: 'Web Corporativa',
      clientName: 'ACME',
      totalAmount: 350,
      currency: 'USD',
      milestonesCount: 2,
    });
  });
});

describe('filterPaidMilestones', () => {
  const list = [
    paid({ id: '1', clientName: 'ACME', amount: 10 }),
    paid({ id: '2', clientName: 'Globex', projectTitle: 'App Móvil', milestoneTitle: 'Final', projectCategory: 'APP', amount: 20 }),
  ];

  it('sin búsqueda devuelve la misma lista', () => {
    expect(filterPaidMilestones(list, '   ')).toBe(list);
  });

  it('busca por cliente, proyecto, hito o categoría sin distinguir mayúsculas', () => {
    expect(filterPaidMilestones(list, ' globex ').map((m) => m.id)).toEqual(['2']);
    expect(filterPaidMilestones(list, 'app móvil').map((m) => m.id)).toEqual(['2']);
    expect(filterPaidMilestones(list, 'final').map((m) => m.id)).toEqual(['2']);
    expect(filterPaidMilestones(list, 'web').map((m) => m.id)).toEqual(['1']);
    expect(sumAmounts(filterPaidMilestones(list, 'a'))).toBe(30);
  });
});
