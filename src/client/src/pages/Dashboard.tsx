import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Check,
  Calendar,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { WhatsAppButton } from '../components/WhatsAppButton';
import {
  Button,
  Badge,
  Card,
  CardPanel,
  MetricCard,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui';

interface PendingMilestoneDTO {
  id: string;
  budgetId: string;
  projectId: string;
  milestoneTitle: string;
  amount: number;
  percentage: number;
  currency: string;
  dueDate?: string | null;
  status: string;
  clientName: string;
  clientPhone?: string | null;
  projectTitle: string;
}

interface RecurringAlertDTO {
  projectId: string;
  projectTitle: string;
  clientName: string;
  clientPhone?: string | null;
  recurringAmount?: number | null;
  recurringCurrency: string;
  recurringPeriod: string;
  recurringRenewalDate: string;
  daysRemaining: number;
  isOverdue: boolean;
}

interface FinancialMetrics {
  totalInTheStreet: number;
  totalCollected: number;
  activeProjectsCount: number;
  totalProjectsCount: number;
}

interface PayAllModalData {
  budgetId: string;
  projectTitle: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  milestonesCount: number;
}

interface UrgencyInfo {
  variant: 'danger' | 'warning' | 'neutral';
  label: string;
  cardBorderClass: string;
  isOverdue: boolean;
}

function getMilestoneUrgency(dueDateStr?: string | null): UrgencyInfo {
  if (!dueDateStr) {
    return {
      variant: 'neutral',
      label: 'Sin fecha límite',
      cardBorderClass: 'border-neutral-800 hover:border-neutral-700',
      isOverdue: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split('-');
  let due: Date;
  if (parts.length === 3) {
    due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    due = new Date(dueDateStr);
  }
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      variant: 'danger',
      label: `Vencido hace ${absDays} ${absDays === 1 ? 'día' : 'días'}`,
      cardBorderClass: 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50',
      isOverdue: true,
    };
  } else if (diffDays === 0) {
    return {
      variant: 'warning',
      label: 'Vence hoy',
      cardBorderClass: 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50',
      isOverdue: false,
    };
  } else if (diffDays <= 2) {
    return {
      variant: 'warning',
      label: `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
      cardBorderClass: 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50',
      isOverdue: false,
    };
  } else {
    return {
      variant: 'neutral',
      label: `Vence: ${formatDate(dueDateStr)}`,
      cardBorderClass: 'border-neutral-800 hover:border-neutral-700',
      isOverdue: false,
    };
  }
}

// Vercel React Best Practice: Memoized subcomponent to avoid cascading re-renders
const RecurringAlertCard = memo<{
  rec: RecurringAlertDTO;
  processingId: string | null;
  onRenew: (projectId: string) => void;
}>(({ rec, processingId, onRenew }) => {
  const renewalPeriodLabel = rec.recurringPeriod === 'MONTHLY' ? 'mes' : 'año';
  const renewalMsg = `Hola ${rec.clientName}, te escribimos de Couvance para avisarte que tu servicio de hosting y mantenimiento de ${rec.projectTitle} está próximo a renovar por ${formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} (${rec.recurringPeriod === 'MONTHLY' ? 'mensual' : 'anual'}). ¡Avisanos cuando puedas para coordinar!`;
  const isRenewing = processingId === `renew-${rec.projectId}`;

  return (
    <Card
      className={`p-4 flex flex-col justify-between gap-3 content-visibility-auto ${
        rec.isOverdue
          ? 'border-rose-500/30 bg-rose-950/10'
          : 'border-amber-500/30 bg-amber-950/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-neutral-200 block truncate">
            {rec.projectTitle}
          </span>
          <span className="text-xs text-neutral-400 block truncate">{rec.clientName}</span>
        </div>

        <Badge variant={rec.isOverdue ? 'danger' : 'warning'} showDot>
          {rec.isOverdue
            ? `Vencido hace ${Math.abs(rec.daysRemaining)} ${
                Math.abs(rec.daysRemaining) === 1 ? 'día' : 'días'
              }`
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

// Vercel React Best Practice: Memoized subcomponent to isolate pending milestone updates
const PendingMilestoneCard = memo<{
  m: PendingMilestoneDTO;
  processingId: string | null;
  onPay: (id: string) => void;
  onOpenPayAll: (m: PendingMilestoneDTO) => void;
}>(({ m, processingId, onPay, onOpenPayAll }) => {
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
});
PendingMilestoneCard.displayName = 'PendingMilestoneCard';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [pendingMilestones, setPendingMilestones] = useState<PendingMilestoneDTO[]>([]);
  const [recurringAlerts, setRecurringAlerts] = useState<RecurringAlertDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payAllTarget, setPayAllTarget] = useState<PayAllModalData | null>(null);

  // Vercel React Best Practice: Eliminating waterfalls with Promise.all
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, radarData] = await Promise.all([
        api.get<FinancialMetrics>('/api/finance/metrics'),
        api.get<{ pendingMilestones: PendingMilestoneDTO[]; recurringAlerts: RecurringAlertDTO[] }>('/api/finance/radar'),
      ]);
      setMetrics(metricsData);
      setPendingMilestones(radarData.pendingMilestones);
      setRecurringAlerts(radarData.recurringAlerts);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar el Radar de finanzas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Cobro individual de hito
  const handlePayMilestone = useCallback(async (id: string) => {
    try {
      setProcessingId(id);
      await api.patch(`/api/milestones/${id}/pay`);
      toast.success('Hito marcado como cobrado.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar cobro');
    } finally {
      setProcessingId(null);
    }
  }, [loadDashboardData]);

  // Abrir modal para Cobro Express "Cobrar Todo"
  const handleOpenPayAllModal = useCallback((m: PendingMilestoneDTO) => {
    setPendingMilestones((current) => {
      const related = current.filter((item) => item.budgetId === m.budgetId);
      const total = related.reduce((acc, curr) => acc + curr.amount, 0);
      setPayAllTarget({
        budgetId: m.budgetId,
        projectTitle: m.projectTitle,
        clientName: m.clientName,
        totalAmount: total,
        currency: m.currency,
        milestonesCount: related.length,
      });
      return current;
    });
  }, []);

  // Confirmar ejecución de "Cobrar Todo"
  const handleConfirmPayAll = async () => {
    if (!payAllTarget) return;
    const targetBudgetId = payAllTarget.budgetId;
    try {
      setProcessingId(`budget-${targetBudgetId}`);
      await api.post(`/api/budgets/${targetBudgetId}/pay-all`);
      toast.success('Todos los hitos del presupuesto fueron liquidados.');
      setPayAllTarget(null);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al liquidar hitos');
    } finally {
      setProcessingId(null);
    }
  };

  // Cobrar y renovar hosting/mantenimiento recurrente (+1 mes o +1 año)
  const handleRenewProject = useCallback(async (projectId: string) => {
    try {
      setProcessingId(`renew-${projectId}`);
      const res = await api.post<{ ok: boolean; message: string }>(`/api/projects/${projectId}/renew`);
      toast.success(res.message || 'Renovación extendida con éxito.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al renovar servicio');
    } finally {
      setProcessingId(null);
    }
  }, [loadDashboardData]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Responsiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Radar de Cobranzas y Flujo de Caja
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#BDEF00]/10 text-[#d4ff33] border border-[#BDEF00]/30 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BDEF00] animate-pulse" />
              EN VIVO
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Control de cuentas por cobrar, renovaciones preventivas y cobro express por WhatsApp
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          onClick={loadDashboardData}
          disabled={loading}
          isLoading={loading}
          className="self-start sm:self-auto"
        >
          {!loading ? <RefreshCw className="w-3.5 h-3.5" /> : null}
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Métricas Principales: Jerarquía de Tesorería */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          title="Total en la Calle (Pendiente)"
          value={
            <span className="text-2xl xs:text-3xl sm:text-4xl text-amber-400 font-extrabold tracking-tight">
              {formatCurrency(metrics?.totalInTheStreet || 0)}
            </span>
          }
          subtitle="Hitos activos pendientes de cobro"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          className="border-amber-500/30 bg-amber-500/5 relative overflow-hidden ring-1 ring-amber-500/20 shadow-sm"
        />

        <MetricCard
          title="Total Cobrado (Histórico)"
          value={
            <span className="text-2xl xs:text-3xl sm:text-4xl text-[#d4ff33] font-extrabold tracking-tight">
              {formatCurrency(metrics?.totalCollected || 0)}
            </span>
          }
          subtitle="Ingresos efectivos registrados"
          icon={<DollarSign className="w-5 h-5 text-[#BDEF00]" />}
          className="border-[#BDEF00]/25 bg-[#BDEF00]/5 ring-1 ring-[#BDEF00]/15"
        />

        <MetricCard
          title="Proyectos en Progreso"
          value={
            <span className="text-2xl xs:text-3xl sm:text-4xl text-white font-extrabold tracking-tight">
              {metrics?.activeProjectsCount ?? 0}
            </span>
          }
          subtitle={`de ${metrics?.totalProjectsCount ?? 0} proyectos registrados`}
          icon={<TrendingUp className="w-5 h-5 text-[#004BFF]" />}
          className="border-[#004BFF]/25 bg-[#004BFF]/5 ring-1 ring-[#004BFF]/15"
        />
      </div>

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
                onRenew={handleRenewProject}
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
                onPay={handlePayMilestone}
                onOpenPayAll={handleOpenPayAllModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmación para "Cobrar Todo" */}
      <Dialog
        open={Boolean(payAllTarget)}
        onOpenChange={(open) => !open && setPayAllTarget(null)}
      >
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Zap className="w-5 h-5 shrink-0" />
              <DialogTitle>¿Confirmar liquidación total del presupuesto?</DialogTitle>
            </div>
            <DialogDescription>
              Esta acción marcará de forma inmediata todos los hitos pendientes de este presupuesto como cobrados, registrando la fecha de pago de hoy.
            </DialogDescription>
          </DialogHeader>

          {payAllTarget ? (
            <CardPanel className="space-y-2 mb-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Proyecto:</span>
                <span className="font-semibold text-neutral-100 truncate ml-2">{payAllTarget.projectTitle}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Cliente:</span>
                <span className="text-neutral-200 truncate ml-2">{payAllTarget.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Hitos a liquidar:</span>
                <span className="font-mono text-neutral-200">{payAllTarget.milestonesCount} pendientes</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-neutral-800">
                <span className="text-neutral-300 font-medium">Monto Total a Cobrar:</span>
                <span className="font-mono font-bold text-base text-[#BDEF00]">
                  {formatCurrency(payAllTarget.totalAmount, payAllTarget.currency)}
                </span>
              </div>
            </CardPanel>
          ) : null}

          <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
            <Button
              type="button"
              variant="ghost"
              touchFriendly
              onClick={() => setPayAllTarget(null)}
              className="w-full xs:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              touchFriendly
              isLoading={processingId?.startsWith('budget-')}
              onClick={handleConfirmPayAll}
              className="w-full xs:w-auto"
            >
              Confirmar Cobro Total
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
