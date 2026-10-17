import { Receipt } from 'lucide-react';
import type { PaidMilestone } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { Card } from '../ui';
import { PaidMilestoneCard } from './PaidMilestoneCard';

interface HistoryViewProps {
  milestones: PaidMilestone[];
  totalAmount: number;
  historySearch: string;
}

// Vista 2: Historial de Cobros (Desglose de Ganancias)
export function HistoryView({ milestones, totalAmount, historySearch }: HistoryViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#BDEF00]" />
          <h2 className="text-sm font-semibold text-neutral-200">
            Historial de Cobros Registrados ({milestones.length})
          </h2>
        </div>
        {historySearch ? (
          <span className="text-[11px] text-neutral-400 font-mono">
            Filtrado: {formatCurrency(totalAmount)} ({milestones.length} hitos)
          </span>
        ) : (
          <span className="text-[11px] text-neutral-500 font-mono">
            Ordenados por fecha de cobro más reciente
          </span>
        )}
      </div>

      {milestones.length === 0 ? (
        <Card className="p-8 text-center bg-neutral-900/30 border-neutral-800/80">
          <Receipt className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-300 font-medium">
            {historySearch ? 'No se encontraron cobros con ese filtro' : 'Aún no hay cobros registrados'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {historySearch
              ? 'Probá buscando con otro nombre de cliente o proyecto.'
              : 'Cuando marques un hito como cobrado aparecerá detallado acá con su fecha e importe.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {milestones.map((m) => (
            <PaidMilestoneCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
