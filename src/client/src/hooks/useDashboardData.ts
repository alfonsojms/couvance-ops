import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { budgetsApi, financeApi, milestonesApi, projectsApi } from '../lib/resources';
import type {
  FinancialMetrics,
  PaidMilestone,
  PendingMilestone,
  RecurringAlert,
} from '../lib/types';
import { buildPayAllSummary, type PayAllModalData } from '../components/dashboard/helpers';

// Datos y acciones del Radar: carga de métricas/radar/historial y cobros/renovaciones.
export function useDashboardData() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [pendingMilestones, setPendingMilestones] = useState<PendingMilestone[]>([]);
  const [paidMilestones, setPaidMilestones] = useState<PaidMilestone[]>([]);
  const [recurringAlerts, setRecurringAlerts] = useState<RecurringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payAllTarget, setPayAllTarget] = useState<PayAllModalData | null>(null);

  // Vercel React Best Practice: Eliminating waterfalls with Promise.all
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, radarData, historyData] = await Promise.all([
        financeApi.metrics(),
        financeApi.radar(),
        financeApi.history(),
      ]);
      setMetrics(metricsData);
      setPendingMilestones(radarData.pendingMilestones);
      setRecurringAlerts(radarData.recurringAlerts);
      setPaidMilestones(historyData.history || []);
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
  const payMilestone = useCallback(async (id: string) => {
    try {
      setProcessingId(id);
      await milestonesApi.pay(id);
      toast.success('Hito marcado como cobrado.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar cobro');
    } finally {
      setProcessingId(null);
    }
  }, [loadDashboardData]);

  // Abrir modal para Cobro Express "Cobrar Todo". Lee la lista vigente desde el updater
  // para que el callback sea estable y no re-renderice las tarjetas memoizadas.
  const openPayAll = useCallback((m: PendingMilestone) => {
    setPendingMilestones((current) => {
      setPayAllTarget(buildPayAllSummary(current, m));
      return current;
    });
  }, []);

  const closePayAll = useCallback(() => setPayAllTarget(null), []);

  // Confirmar ejecución de "Cobrar Todo"
  const confirmPayAll = async () => {
    if (!payAllTarget) return;
    const targetBudgetId = payAllTarget.budgetId;
    try {
      setProcessingId(`budget-${targetBudgetId}`);
      await budgetsApi.payAll(targetBudgetId);
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
  const renewProject = useCallback(async (projectId: string) => {
    try {
      setProcessingId(`renew-${projectId}`);
      const res = await projectsApi.renew(projectId);
      toast.success(res.message || 'Renovación extendida con éxito.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error al renovar servicio');
    } finally {
      setProcessingId(null);
    }
  }, [loadDashboardData]);

  return {
    metrics,
    pendingMilestones,
    paidMilestones,
    recurringAlerts,
    loading,
    processingId,
    payAllTarget,
    reload: loadDashboardData,
    payMilestone,
    openPayAll,
    closePayAll,
    confirmPayAll,
    renewProject,
  };
}
