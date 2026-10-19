import { memo } from 'react';
import { Check } from 'lucide-react';
import type { RecurringAlert } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { WhatsAppButton } from '../WhatsAppButton';
import { Button, Badge, Card, CardPanel } from '../ui';

interface RecurringAlertCardProps {
  rec: RecurringAlert;
  processingId: string | null;
  onRenew: (projectId: string) => void;
}

// Vercel React Best Practice: Memoized subcomponent to avoid cascading re-renders
export const RecurringAlertCard = memo<RecurringAlertCardProps>(({ rec, processingId, onRenew }) => {
  const renewalPeriodLabel = rec.recurringPeriod === 'MONTHLY' ? 'mes' : 'año';
  const renewalMsg = `Hola ${rec.clientName}, te escribimos de Couvance para avisarte que tu servicio de hosting y mantenimiento de ${rec.projectTitle} está próximo a renovar por ${formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} (${rec.recurringPeriod === 'MONTHLY' ? 'mensual' : 'anual'}). ¡Avisanos cuando puedas para coordinar!`;
  const isRenewing = processingId === `renew-${rec.projectId}`;

  return (
    <Card
      className={`p-4 flex flex-col justify-between gap-3 content-visibility-auto ${
        rec.isOverdue ? 'border-rose-500/30 bg-rose-950/10' : 'border-amber-500/30 bg-amber-950/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-neutral-200 block truncate">{rec.projectTitle}</span>
          <span className="text-xs text-neutral-400 block truncate">{rec.clientName}</span>
        </div>

        <Badge variant={rec.isOverdue ? 'danger' : 'warning'} showDot>
          {rec.isOverdue
            ? `Vencido hace ${Math.abs(rec.daysRemaining)} ${Math.abs(rec.daysRemaining) === 1 ? 'día' : 'días'}`
            : rec.daysRemaining === 0
              ? 'Vence hoy'
              : `Vence en ${rec.daysRemaining} días`}
        </Badge>
      </div>

      <CardPanel className="flex items-center justify-between text-xs text-neutral-300">
        <span className="font-semibold">
          {formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} / {renewalPeriodLabel}
        </span>
        <span className="text-neutral-400">Fecha: {formatDate(rec.recurringRenewalDate)}</span>
      </CardPanel>

      {/* Desacoplamiento Cromático y distribución responsiva */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 pt-1">
        <WhatsAppButton
          phone={rec.clientPhone}
          message={renewalMsg}
          label="Avisar WhatsApp"
          size="sm"
          touchFriendly
          className="w-full justify-center"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          disabled={isRenewing}
          isLoading={isRenewing}
          onClick={() => onRenew(rec.projectId)}
          title={`Cobrar y renovar servicio (+1 ${renewalPeriodLabel})`}
          className="w-full justify-center text-xs"
        >
          <Check className="w-4 h-4 text-[#BDEF00] shrink-0" />
          <span>Renovar (+1 {renewalPeriodLabel})</span>
        </Button>
      </div>
    </Card>
  );
});
RecurringAlertCard.displayName = 'RecurringAlertCard';
