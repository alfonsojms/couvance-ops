import { describe, it, expect } from 'vitest';
import { calculatePresetMilestones, buildBudgetSummary } from '../src/client/src/components/projects/budgetPresets';
import {
  buildProjectPatch,
  projectFormValuesFrom,
  validateProjectForm,
  emptyProjectFormValues,
} from '../src/client/src/components/projects/projectFormModel';
import type { BudgetWithMilestones, ProjectFormData } from '../src/client/src/lib/types';

describe('budgetPresets', () => {
  it('el último hito absorbe el residuo para sumar exactamente el total (RN-01)', () => {
    const milestones = calculatePresetMilestones('40-30-30', 1001);
    expect(milestones.map((m) => m.amount)).toEqual([400, 300, 301]);
    expect(milestones.reduce((s, m) => s + m.amount, 0)).toBe(1001);
  });

  it('redondea el total y nunca produce montos negativos', () => {
    expect(calculatePresetMilestones('50-50', 99.6).map((m) => m.amount)).toEqual([50, 50]);
    expect(calculatePresetMilestones('100', -5).map((m) => m.amount)).toEqual([0]);
  });

  it('arma el resumen de la cotización para el cliente', () => {
    const budget = {
      title: 'Web',
      totalAmount: 1000,
      currency: 'USD',
      milestones: [{ title: 'Anticipo', percentage: 100, amount: 1000 }],
    } as BudgetWithMilestones;
    expect(buildBudgetSummary(budget, 'Acme')).toBe(
      [
        '*Cotización: Web*',
        'Proyecto: Acme',
        'Total: $1,000',
        '',
        '*Distribución de pagos acordada:*',
        '• Anticipo (100%): $1,000',
        '',
        '¡Quedamos a tu disposición para dar inicio!',
      ].join('\n')
    );
  });
});

describe('projectFormModel', () => {
  const initial: ProjectFormData = {
    id: 'p1',
    clientId: 'c1',
    title: 'Sitio',
    category: 'LANDING',
    productionUrl: 'https://a.com',
    productionStatus: 'ACTIVE',
    hasRecurring: 1,
    recurringAmount: 50,
    recurringCurrency: 'USD',
    recurringPeriod: 'ANNUALLY',
    recurringRenewalDate: '2026-12-01',
  };

  it('sin cambios el diff queda vacío', () => {
    expect(buildProjectPatch(projectFormValuesFrom(initial), initial)).toEqual({});
  });

  it('el diff incluye solo los campos modificados', () => {
    const values = { ...projectFormValuesFrom(initial), productionUrl: '  ', recurringAmount: '75.5' };
    expect(buildProjectPatch(values, initial)).toEqual({ productionUrl: null, recurringAmount: 75.5 });
  });

  it('valida nombre, cliente en creación y recurrencia', () => {
    const empty = emptyProjectFormValues([]);
    expect(validateProjectForm(empty, 'create')).toBe('El nombre del proyecto es obligatorio');
    expect(validateProjectForm({ ...empty, title: 'X' }, 'create')).toBe('Selecciona un cliente para el proyecto');
    expect(validateProjectForm({ ...empty, title: 'X', hasRecurring: true, recurringAmount: '0' }, 'edit')).toBe(
      'El monto recurrente es obligatorio cuando la recurrencia está activa'
    );
  });
});
