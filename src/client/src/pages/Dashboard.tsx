import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { WhatsAppButton } from '../components/WhatsAppButton';

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

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [pendingMilestones, setPendingMilestones] = useState<PendingMilestoneDTO[]>([]);
  const [recurringAlerts, setRecurringAlerts] = useState<RecurringAlertDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  // Operación Cobro Express "Cobrar Todo" (RN-04)
  const handlePayAllBudget = async (budgetId: string) => {
    try {
      setProcessingId(`budget-${budgetId}`);
      await api.post(`/api/budgets/${budgetId}/pay-all`);
      toast.success('Todos los hitos del presupuesto fueron liquidados.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al liquidar hitos');
    } finally {
      setProcessingId(null);
    }
  };

  // Cobrar y renovar hosting/mantenimiento recurrente (RN-08)
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
        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Métricas Principales (Anti-AI Slop: limpias, sin gradientes pesados) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">Total en la Calle (Pendiente)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100">
            {formatCurrency(metrics?.totalInTheStreet || 0)}
          </div>
          <span className="text-[11px] text-neutral-500">Hitos activos por cobrar</span>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">Total Cobrado (Histórico)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100">
            {formatCurrency(metrics?.totalCollected || 0)}
          </div>
          <span className="text-[11px] text-neutral-500">Ingresos efectivos registrados</span>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">Proyectos en Progreso</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100">
            {metrics?.activeProjectsCount || 0}
          </div>
          <span className="text-[11px] text-neutral-500">
            de {metrics?.totalProjectsCount || 0} proyectos registrados
          </span>
        </div>
      </div>

      {/* Alerta Preventiva de Recurrentes a 30 Días (RN-08) */}
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
              const renewalMsg = `Hola ${rec.clientName}, te escribimos de Kodex para avisarte que tu servicio de hosting y mantenimiento de ${rec.projectTitle} está próximo a renovar por ${formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} (${rec.recurringPeriod === 'MONTHLY' ? 'mensual' : 'anual'}). ¡Avisanos cuando puedas para coordinar!`;

              return (
                <div
                  key={rec.projectId}
                  className={`p-4 rounded-xl border ${
                    rec.isOverdue
                      ? 'bg-red-950/20 border-red-900/60'
                      : 'bg-amber-950/20 border-amber-900/60'
                  } flex flex-col justify-between gap-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">
                        {rec.projectTitle}
                      </span>
                      <span className="text-xs text-neutral-400">{rec.clientName}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono ${
                        rec.isOverdue
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {rec.isOverdue
                        ? `Vencido hace ${Math.abs(rec.daysRemaining)}d`
                        : `Vence en ${rec.daysRemaining}d`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                    <span>
                      {formatCurrency(rec.recurringAmount || 0, rec.recurringCurrency)} /{' '}
                      {rec.recurringPeriod === 'MONTHLY' ? 'mes' : 'año'}
                    </span>
                    <span>Fecha: {formatDate(rec.recurringRenewalDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <WhatsAppButton
                      phone={rec.clientPhone}
                      message={renewalMsg}
                      label="Avisar por WhatsApp"
                      size="sm"
                      className="flex-1 justify-center"
                    />

                    <button
                      type="button"
                      disabled={processingId === `renew-${rec.projectId}`}
                      onClick={() => handleRenewProject(rec.projectId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-neutral-800 border border-neutral-700 text-neutral-100 hover:bg-neutral-700 active:scale-95 transition-all select-none disabled:opacity-50"
                      title="Registrar cobro y avanzar siguiente ciclo de renovación"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cobrado</span>
                    </button>
                  </div>
                </div>
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
          <span className="text-[11px] text-neutral-500 font-mono">
            Ordenados por fecha de vencimiento
          </span>
        </div>

        {pendingMilestones.length === 0 ? (
          <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">¡Cero cuentas pendientes!</p>
            <p className="text-xs text-neutral-500 mt-1">
              Todos los hitos aprobados han sido cobrados con éxito.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMilestones.map((m) => {
              const waMessage = `Hola ${m.clientName}, te escribimos de Kodex para recordarte sobre el hito "${m.milestoneTitle}" correspondiente al proyecto ${m.projectTitle} por un total de ${formatCurrency(m.amount, m.currency)}. ¡Quedamos atentos a tu comprobante!`;

              return (
                <div
                  key={m.id}
                  className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-neutral-700"
                >
                  {/* Info Proyecto y Cliente */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-100">
                        {m.projectTitle}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                        {m.percentage}%
                      </span>
                    </div>

                    <div className="text-xs text-neutral-400 flex items-center gap-2">
                      <span>{m.clientName}</span>
                      <span>•</span>
                      <span className="text-neutral-300 font-medium">{m.milestoneTitle}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Vence: {formatDate(m.dueDate)}</span>
                    </div>
                  </div>

                  {/* Monto y Botones Operativos Móvil Primero */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end md:self-auto w-full md:w-auto">
                    <div className="text-right font-mono text-lg font-bold text-neutral-100 shrink-0">
                      {formatCurrency(m.amount, m.currency)}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Botón WhatsApp con Fallback */}
                      <WhatsAppButton
                        phone={m.clientPhone}
                        message={waMessage}
                        label="Cobrar"
                        size="sm"
                        className="flex-1 sm:flex-none justify-center"
                      />

                      {/* Botón Cobrado Individual */}
                      <button
                        type="button"
                        disabled={processingId === m.id}
                        onClick={() => handlePayMilestone(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 hover:border-emerald-700 active:scale-95 transition-all select-none disabled:opacity-50"
                        title="Marcar como cobrado"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cobrado</span>
                      </button>

                      {/* Botón Cobro Express "Cobrar Todo" */}
                      <button
                        type="button"
                        disabled={processingId === `budget-${m.budgetId}`}
                        onClick={() => handlePayAllBudget(m.budgetId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 hover:text-neutral-100 active:scale-95 transition-all select-none disabled:opacity-50"
                        title="Liquidar todos los hitos pendientes de este presupuesto (RN-04)"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Cobrar Todo</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
