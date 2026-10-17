import type { BudgetWithMilestones } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';

export type BudgetPreset = '50-50' | '40-30-30' | '100';

export interface PresetMilestone {
  title: string;
  percentage: number;
  amount: number;
}

const PRESET_MILESTONES: Record<BudgetPreset, { title: string; percentage: number }[]> = {
  '50-50': [
    { title: '50% Anticipo de inicio', percentage: 50 },
    { title: '50% Entrega y lanzamiento final', percentage: 50 },
  ],
  '40-30-30': [
    { title: '40% Anticipo inicial', percentage: 40 },
    { title: '30% Aprobación de diseño y maquetación', percentage: 30 },
    { title: '30% Entrega final y pase a producción', percentage: 30 },
  ],
  '100': [{ title: '100% Pago único total', percentage: 100 }],
};

/**
 * Hitos del preset con montos enteros (RN-01): cada hito redondea su porcentaje
 * y el último absorbe el residuo para que la suma sea exactamente el total.
 */
export function calculatePresetMilestones(preset: BudgetPreset, budgetTotal: number): PresetMilestone[] {
  const total = Math.max(0, Math.round(budgetTotal || 0));
  const raw = PRESET_MILESTONES[preset];

  let sum = 0;
  return raw.map((item, index) => {
    let amount = Math.round((total * item.percentage) / 100);
    if (index === raw.length - 1) {
      amount = total - sum; // El último hito absorbe la diferencia exacta
    } else {
      sum += amount;
    }
    return { ...item, amount };
  });
}

/** Texto del resumen de la cotización que se copia para enviar al cliente. */
export function buildBudgetSummary(budget: BudgetWithMilestones, projectTitle: string): string {
  const lines = [
    `*Cotización: ${budget.title}*`,
    `Proyecto: ${projectTitle}`,
    `Total: ${formatCurrency(budget.totalAmount, budget.currency)}`,
    '',
    '*Distribución de pagos acordada:*',
  ];

  if (budget.milestones && budget.milestones.length > 0) {
    for (const m of budget.milestones) {
      lines.push(`• ${m.title} (${m.percentage}%): ${formatCurrency(m.amount, budget.currency)}`);
    }
  }

  lines.push('');
  lines.push('¡Quedamos a tu disposición para dar inicio!');
  return lines.join('\n');
}
