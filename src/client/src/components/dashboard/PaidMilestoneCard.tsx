import { memo } from 'react';
import { Calendar } from 'lucide-react';
import type { PaidMilestone } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Badge, Card } from '../ui';

// Vercel React Best Practice: Memoized subcomponent to isolate paid milestone rendering
export const PaidMilestoneCard = memo<{ m: PaidMilestone }>(({ m }) => {
  return (
    <Card className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700/80 transition-colors content-visibility-auto">
      {/* Info Proyecto y Cliente */}
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-neutral-100 truncate">{m.projectTitle}</span>
          <Badge variant="neutral">{m.projectCategory}</Badge>
          <Badge variant="neutral">{m.percentage}%</Badge>
          <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-neutral-500 inline-block" />
            Cobrado: {formatDate(m.paidAt)}
          </span>
        </div>

        <div className="text-xs text-neutral-400 flex items-center gap-2 truncate">
          <span className="text-neutral-300 font-medium truncate">{m.clientName}</span>
          <span>•</span>
          <span className="text-neutral-400 truncate">{m.milestoneTitle}</span>
        </div>
      </div>

      {/* Monto Cobrado en Electric Lime */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60 shrink-0">
        <span className="sm:hidden text-xs text-neutral-500">Monto Cobrado:</span>
        <div className="text-right">
          <div className="font-mono text-lg sm:text-xl font-bold text-[#d4ff33] tracking-tight">
            +{formatCurrency(m.amount, m.currency)}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Ingreso efectivo</div>
        </div>
      </div>
    </Card>
  );
});
PaidMilestoneCard.displayName = 'PaidMilestoneCard';
