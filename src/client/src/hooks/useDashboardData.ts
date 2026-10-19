import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { budgetsApi, financeApi, milestonesApi, projectsApi } from '../lib/resources';
import type { FinancialMetrics, PaidMilestone, PendingMilestone, RecurringAlert } from '../lib/types';
import { buildPayAllSummary } from '../components/dashboard/helpers';
import { errorMessage } from '../lib/errors';
import { useAsyncData } from './useAsyncData';

interface DashboardData {
  metrics: FinancialMetrics | null;
  pendingMilestones: PendingMilestone[];
  paidMilestones: PaidMilestone[];
  recurringAlerts: RecurringAlert[];
}

const emptyDashboardData: DashboardData = {
  metrics: null,
  pendingMilestones: [],
  paidMilestones: [],
  recurringAlerts: [],
};

// Vercel React Best Practice: Eliminating waterfalls with Promise.all
async function fetchDashboardData(): Promise<DashboardData> {
  const [metrics, radar, history] = await Promise.all([financeApi.metrics(), financeApi.radar(), financeApi.history()]);
  return {
    metrics,
    pendingMilestones: radar.pendingMilestones,
    recurringAlerts: radar.recurringAlerts,
    paidMilestones: history.history || [],
  };
}

// Datos y acciones del Radar: carga de métricas/radar/historial y cobros/renovaciones.
export function useDashboardData() {
  const {
    data: { metrics, pendingMilestones, paidMilestones, recurringAlerts },
    loading,
    reload: loadDashboardData,
  } = useAsyncData(fetchDashboardData, emptyDashboardData, 'Error al cargar el Radar de finanzas');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payAllMilestone, setPayAllMilestone] = useState<PendingMilestone | null>(null);

  // Resumen del modal "Cobrar Todo", derivado de la lista vigente de hitos pendientes.
  const payAllTarget = useMemo(
    () => (payAllMilestone ? buildPayAllSummary(pendingMilestones, payAllMilestone) : null),
    [pendingMilestones, payAllMilestone],
  );

  // Cobro individual de hito
  const payMilestone = useCallback(
    async (id: string) => {
      try {
        setProcessingId(id);
        await milestonesApi.pay(id);
        toast.success('Hito marcado como cobrado.');
        loadDashboardData();
      } catch (err) {
        toast.error(errorMessage(err, 'Error al registrar cobro'));
      } finally {
        setProcessingId(null);
      }
    },
    [loadDashboardData],
  );

  // Abrir modal para Cobro Express "Cobrar Todo". Callback estable para no re-renderizar
  // las tarjetas memoizadas; el resumen se deriva en payAllTarget.
  const openPayAll = useCallback((m: PendingMilestone) => setPayAllMilestone(m), []);

  const closePayAll = useCallback(() => setPayAllMilestone(null), []);

  // Confirmar ejecución de "Cobrar Todo"
  const confirmPayAll = async () => {
    if (!payAllTarget) return;
    const targetBudgetId = payAllTarget.budgetId;
    try {
      setProcessingId(`budget-${targetBudgetId}`);
      await budgetsApi.payAll(targetBudgetId);
      toast.success('Todos los hitos del presupuesto fueron liquidados.');
      setPayAllMilestone(null);
      loadDashboardData();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al liquidar hitos'));
    } finally {
      setProcessingId(null);
    }
  };

  // Cobrar y renovar hosting/mantenimiento recurrente (+1 mes o +1 año)
  const renewProject = useCallback(
    async (projectId: string) => {
      try {
        setProcessingId(`renew-${projectId}`);
        const res = await projectsApi.renew(projectId);
        toast.success(res.message || 'Renovación extendida con éxito.');
        loadDashboardData();
      } catch (err) {
        toast.error(errorMessage(err, 'Error al renovar servicio'));
      } finally {
        setProcessingId(null);
      }
    },
    [loadDashboardData],
  );

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
