import { memo } from 'react';
import { Calendar, Check, Zap } from 'lucide-react';
import type { PendingMilestone } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { WhatsAppButton } from '../WhatsAppButton';
import { Button, Badge, Card } from '../ui';
import { getMilestoneUrgency } from './helpers';

interface PendingMilestoneCardProps {
  m: PendingMilestone;
  processingId: string | null;
  onPay: (id: string) => void;
  onOpenPayAll: (m: PendingMilestone) => void;
}

// Vercel React Best Practice: Memoized subcomponent to isolate pending milestone updates
export const PendingMilestoneCard = memo<PendingMilestoneCardProps>(
  ({ m, processingId, onPay, onOpenPayAll }) => {
    const urgency = getMilestoneUrgency(m.dueDate);
    const waMessage = `Hola ${m.clientName}, te escribimos de Couvance para recordarte sobre el hito "${m.milestoneTitle}" correspondiente al proyecto ${m.projectTitle} por un total de ${formatCurrency(m.amount, m.currency)}. ¡Quedamos atentos a tu comprobante!`;
    const isPaying = processingId === m.id;
    const isBudgetBusy = processingId?.startsWith('budget-') || false;

    return (
      <Card
        className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-colors content-visibility-auto ${urgency.cardBorderClass}`}
      >
        {/* Info Proyecto y Cliente */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-neutral-100 truncate">
              {m.projectTitle}
            </span>
            <Badge variant="neutral">
              {m.percentage}%
            </Badge>
            <Badge
              variant={urgency.variant}
              showDot={urgency.variant !== 'neutral'}
            >
              {urgency.variant === 'neutral' ? (
                <Calendar className="w-3 h-3 mr-1 inline-block" />
              ) : null}
              {urgency.label}
            </Badge>
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-2 truncate">
            <span>{m.clientName}</span>
            <span>•</span>
            <span className="text-neutral-300 font-medium truncate">{m.milestoneTitle}</span>
          </div>
        </div>

        {/* Monto y Botones Operativos con Ergonomía Móvil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full md:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60">
          <div className="flex items-baseline justify-between sm:justify-end gap-2 shrink-0">
            <span className="sm:hidden text-xs text-neutral-400">Total a cobrar:</span>
            <div className="font-mono text-lg sm:text-xl font-bold text-neutral-100">
              {formatCurrency(m.amount, m.currency)}
            </div>
          </div>

          {/* 3 Botones Operativos: Grid 3 cols en móvil para pulsar con 1 pulgar */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Botón WhatsApp (#25D366) */}
            <WhatsAppButton
              phone={m.clientPhone}
              message={waMessage}
              label="Cobrar"
              size="sm"
              touchFriendly
              className="w-full sm:w-auto justify-center px-2 sm:px-3 text-xs"
            />

            {/* Botón Cobrado Individual */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              touchFriendly
              disabled={isPaying}
              isLoading={isPaying}
              onClick={() => onPay(m.id)}
              title="Marcar hito como cobrado"
              className="w-full sm:w-auto justify-center px-2 sm:px-3 text-xs shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-[#BDEF00] shrink-0" />
              <span>Cobrado</span>
            </Button>

            {/* Botón Cobro Express "Cobrar Todo" */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              touchFriendly
              disabled={isBudgetBusy}
              onClick={() => onOpenPayAll(m)}
              title="Liquidar todos los hitos pendientes de este presupuesto"
              className="w-full sm:w-auto justify-center px-2 sm:px-3 text-xs shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Cobrar Todo</span>
            </Button>
          </div>
        </div>
      </Card>
    );
  }
);
PendingMilestoneCard.displayName = 'PendingMilestoneCard';
