import React, { useEffect, useState, useCallback } from 'react';
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

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [pendingMilestones, setPendingMilestones] = useState<PendingMilestoneDTO[]>([]);
  const [recurringAlerts, setRecurringAlerts] = useState<RecurringAlertDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payAllTarget, setPayAllTarget] = useState<PayAllModalData | null>(null);

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
  const handlePayMilestone = async (id: string) => {
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
  };

  // Abrir modal para Cobro Express "Cobrar Todo"
  const handleOpenPayAllModal = (m: PendingMilestoneDTO) => {
    const related = pendingMilestones.filter((item) => item.budgetId === m.budgetId);
    const total = related.reduce((acc, curr) => acc + curr.amount, 0);
    setPayAllTarget({
      budgetId: m.budgetId,
      projectTitle: m.projectTitle,
      clientName: m.clientName,
      totalAmount: total,
      currency: m.currency,
      milestonesCount: related.length,
    });
  };

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
  const handleRenewProject = async (projectId: string) => {
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
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Radar de Cobranzas y Flujo de Caja
          </h1>
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
          {!loading && <RefreshCw className="w-3.5 h-3.5" />}
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Métricas Principales: Jerarquía de Tesorería ("Total en la Calle" como métrica reina) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total en la Calle (Pendiente)"
          value={
            <span className="text-3xl sm:text-4xl text-amber-400 font-extrabold tracking-tight">
              {formatCurrency(metrics?.totalInTheStreet || 0)}
            </span>
          }
          subtitle="Hitos activos pendientes de cobro"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          className="border-amber-500/30 bg-amber-500/5 relative overflow-hidden ring-1 ring-amber-500/20 shadow-sm"
        />

        <MetricCard
          title="Total Cobrado (Histórico)"
          value={formatCurrency(metrics?.totalCollected || 0)}
          subtitle="Ingresos efectivos registrados"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          title="Proyectos en Progreso"
          value={metrics?.activeProjectsCount ?? 0}
          subtitle={`de ${metrics?.totalProjectsCount ?? 0} proyectos registrados`}
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
        />
      </div>

      {/* Alertas Preventivas de Renovación Recurrente a 30 Días */}
      {recurringAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Renovaciones de Hosting / Mantenimiento (&lt; 30 días)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recurringAlerts.map((rec) => {
              const renewalPeriodLabel = rec.recurringPeriod === 'MONTHLY' ? 'mes' : 'año';
              const renewalMsg = `Hola ${rec.clientName}, te escribimos de Couvance para avisarte que tu servicio de hosting y mantenimiento de ${rec.projectTitle} está próximo a renovar por ${formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} (${rec.recurringPeriod === 'MONTHLY' ? 'mensual' : 'anual'}). ¡Avisanos cuando puedas para coordinar!`;

              return (
                <Card
                  key={rec.projectId}
                  className={`p-4 flex flex-col justify-between gap-3 ${
                    rec.isOverdue
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : 'border-amber-500/30 bg-amber-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">
                        {rec.projectTitle}
                      </span>
                      <span className="text-xs text-neutral-400">{rec.clientName}</span>
                    </div>

                    <Badge
                      variant={rec.isOverdue ? 'danger' : 'warning'}
                      showDot
                    >
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

                  {/* Desacoplamiento Cromático: WhatsApp en verde oficial y Cobro en neutro */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                    <WhatsAppButton
                      phone={rec.clientPhone}
                      message={renewalMsg}
                      label="Avisar por WhatsApp"
                      size="sm"
                      touchFriendly
                      className="flex-1 justify-center"
                    />

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      touchFriendly
                      disabled={processingId === `renew-${rec.projectId}`}
                      isLoading={processingId === `renew-${rec.projectId}`}
                      onClick={() => handleRenewProject(rec.projectId)}
                      title={`Cobrar y renovar servicio (+1 ${renewalPeriodLabel})`}
                      className="shrink-0"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Cobrar y Renovar (+1 {renewalPeriodLabel})</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Radar de Hitos Pendientes de Cobro */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Hitos Pendientes de Cobro ({pendingMilestones.length})
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            Ordenados por fecha de vencimiento
          </span>
        </div>

        {pendingMilestones.length === 0 ? (
          <Card className="p-8 text-center bg-neutral-900/30 border-neutral-800/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">¡Cero cuentas pendientes!</p>
            <p className="text-xs text-neutral-500 mt-1">
              Todos los hitos aprobados han sido cobrados con éxito.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingMilestones.map((m) => {
              const urgency = getMilestoneUrgency(m.dueDate);
              const waMessage = `Hola ${m.clientName}, te escribimos de Couvance para recordarte sobre el hito "${m.milestoneTitle}" correspondiente al proyecto ${m.projectTitle} por un total de ${formatCurrency(m.amount, m.currency)}. ¡Quedamos atentos a tu comprobante!`;

              return (
                <Card
                  key={m.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${urgency.cardBorderClass}`}
                >
                  {/* Info Proyecto y Cliente */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-neutral-100">
                        {m.projectTitle}
                      </span>
                      <Badge variant="neutral">
                        {m.percentage}%
                      </Badge>
                      <Badge
                        variant={urgency.variant}
                        showDot={urgency.variant !== 'neutral'}
                      >
                        {urgency.variant === 'neutral' && (
                          <Calendar className="w-3 h-3 mr-1 inline-block" />
                        )}
                        {urgency.label}
                      </Badge>
                    </div>

                    <div className="text-xs text-neutral-400 flex items-center gap-2">
                      <span>{m.clientName}</span>
                      <span>•</span>
                      <span className="text-neutral-300 font-medium">{m.milestoneTitle}</span>
                    </div>
                  </div>

                  {/* Monto y Botones Operativos con Desacoplamiento Cromático */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end md:self-auto w-full md:w-auto">
                    <div className="text-right font-mono text-xl font-bold text-neutral-100 shrink-0">
                      {formatCurrency(m.amount, m.currency)}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Botón WhatsApp con Verde Oficial (#25D366) */}
                      <WhatsAppButton
                        phone={m.clientPhone}
                        message={waMessage}
                        label="Cobrar"
                        size="sm"
                        touchFriendly
                        className="flex-1 sm:flex-none justify-center"
                      />

                      {/* Botón Cobrado Individual (Neutro Secundario con icono Check) */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        touchFriendly
                        disabled={processingId === m.id}
                        isLoading={processingId === m.id}
                        onClick={() => handlePayMilestone(m.id)}
                        title="Marcar hito como cobrado"
                        className="shrink-0"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Cobrado</span>
                      </Button>

                      {/* Botón Cobro Express "Cobrar Todo" con apertura de diálogo */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        touchFriendly
                        disabled={processingId?.startsWith('budget-')}
                        onClick={() => handleOpenPayAllModal(m)}
                        title="Liquidar todos los hitos pendientes de este presupuesto"
                        className="shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
                      >
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Cobrar Todo</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmación para "Cobrar Todo" (Previene errores táctiles) */}
      <Dialog
        open={Boolean(payAllTarget)}
        onOpenChange={(open) => !open && setPayAllTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Zap className="w-5 h-5 shrink-0" />
              <DialogTitle>¿Confirmar liquidación total del presupuesto?</DialogTitle>
            </div>
            <DialogDescription>
              Esta acción marcará de forma inmediata todos los hitos pendientes de este presupuesto como cobrados, registrando la fecha de pago de hoy.
            </DialogDescription>
          </DialogHeader>

          {payAllTarget && (
            <CardPanel className="space-y-2 mb-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Proyecto:</span>
                <span className="font-semibold text-neutral-100">{payAllTarget.projectTitle}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Cliente:</span>
                <span className="text-neutral-200">{payAllTarget.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-neutral-400">Hitos a liquidar:</span>
                <span className="font-mono text-neutral-200">{payAllTarget.milestonesCount} pendientes</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-neutral-800">
                <span className="text-neutral-300 font-medium">Monto Total a Cobrar:</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  {formatCurrency(payAllTarget.totalAmount, payAllTarget.currency)}
                </span>
              </div>
            </CardPanel>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              touchFriendly
              onClick={() => setPayAllTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              touchFriendly
              isLoading={processingId?.startsWith('budget-')}
              onClick={handleConfirmPayAll}
            >
              Confirmar Cobro Total
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
