import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { PendingMilestone, RecurringAlert } from '../../lib/types';
import { Card } from '../ui';
import { PendingMilestoneCard } from './PendingMilestoneCard';
import { RecurringAlertCard } from './RecurringAlertCard';

interface PendingViewProps {
  recurringAlerts: RecurringAlert[];
  pendingMilestones: PendingMilestone[];
  processingId: string | null;
  onRenew: (projectId: string) => void;
  onPay: (id: string) => void;
  onOpenPayAll: (m: PendingMilestone) => void;
}

// Vista 1: Pendientes (En la calle)
export function PendingView({
  recurringAlerts,
  pendingMilestones,
  processingId,
  onRenew,
  onPay,
  onOpenPayAll,
}: PendingViewProps) {
  return (
    <>
      {/* Alertas Preventivas de Renovación Recurrente a 30 Días */}
      {recurringAlerts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Renovaciones de Hosting / Mantenimiento (&lt; 30 días)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recurringAlerts.map((rec) => (
              <RecurringAlertCard
                key={rec.projectId}
                rec={rec}
                processingId={processingId}
                onRenew={onRenew}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Radar de Hitos Pendientes de Cobro */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Hitos Pendientes de Cobro ({pendingMilestones.length})
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            Ordenados por fecha de vencimiento
          </span>
        </div>

        {pendingMilestones.length === 0 ? (
          <Card className="p-8 text-center bg-neutral-900/30 border-neutral-800/80">
            <CheckCircle2 className="w-8 h-8 text-[#BDEF00]/80 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">¡Cero cuentas pendientes!</p>
            <p className="text-xs text-neutral-500 mt-1">
              Todos los hitos aprobados han sido cobrados con éxito.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {pendingMilestones.map((m) => (
              <PendingMilestoneCard
                key={m.id}
                m={m}
                processingId={processingId}
                onPay={onPay}
                onOpenPayAll={onOpenPayAll}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
