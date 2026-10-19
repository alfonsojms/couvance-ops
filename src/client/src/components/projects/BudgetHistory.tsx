import React from 'react';
import { CheckCircle, Copy } from 'lucide-react';
import type { BudgetWithMilestones } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { Button, Badge, BadgeStatus } from '../ui';

interface BudgetHistoryProps {
  budgets: BudgetWithMilestones[];
  approvingBudgetId: string | null;
  onCopySummary: (budget: BudgetWithMilestones) => void;
  onApprove: (budgetId: string) => void;
}

/** Historial de presupuestos del proyecto con sus hitos y acciones. */
export const BudgetHistory: React.FC<BudgetHistoryProps> = ({
  budgets,
  approvingBudgetId,
  onCopySummary,
  onApprove,
}) => (
  <div className="space-y-3 mb-5">
    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Historial de Presupuestos</h4>

    {budgets.length === 0 ? (
      <p className="text-xs text-neutral-500 italic p-3 rounded-lg bg-neutral-950/40 border border-neutral-850">
        No hay presupuestos creados aún para este proyecto.
      </p>
    ) : (
      <div className="space-y-3">
        {budgets.map((b) => (
          <div key={b.id} className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-neutral-100 block sm:inline truncate">{b.title}</span>
                <span className="text-xs text-neutral-400 font-mono sm:ml-2 block sm:inline">
                  {formatCurrency(b.totalAmount, b.currency)}
                </span>
              </div>
              <Badge status={b.status as BadgeStatus} />
            </div>

            {/* Hitos */}
            {b.milestones && b.milestones.length > 0 ? (
              <div className="space-y-1.5 text-xs font-mono">
                {b.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded border border-neutral-850 gap-2"
                  >
                    <span className="truncate">
                      {m.title} ({m.percentage}%)
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-neutral-200 font-semibold">{formatCurrency(m.amount, b.currency)}</span>
                      <Badge status={m.status as BadgeStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Botones de acción del presupuesto */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between pt-2 border-t border-neutral-800/60 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                touchFriendly
                onClick={() => onCopySummary(b)}
                className="text-xs text-neutral-300 hover:text-neutral-100 justify-center xs:justify-start"
              >
                <Copy className="w-3.5 h-3.5 mr-1 text-neutral-400 shrink-0" />
                <span>Copiar resumen para cliente</span>
              </Button>

              {b.status === 'DRAFT' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  touchFriendly
                  isLoading={approvingBudgetId === b.id}
                  onClick={() => onApprove(b.id)}
                  className="bg-[#BDEF00] hover:bg-[#cbff00] text-neutral-950 font-semibold shadow-[0_0_12px_rgba(189,239,0,0.25)] border-[#BDEF00]/40 justify-center"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>Aprobar Presupuesto</span>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
