import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaidMilestone } from '../lib/types';
import {
  filterPaidMilestones,
  sumAmounts,
  type DashboardSubTab,
} from '../components/dashboard/helpers';

// Pestaña activa del Radar, sincronizada con la prop inicial y notificada al padre.
export function useDashboardSubTab(
  initialSubTab: DashboardSubTab,
  onSubTabChange?: (tab: DashboardSubTab) => void
) {
  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const switchSubTab = useCallback(
    (tab: DashboardSubTab) => {
      setActiveSubTab(tab);
      onSubTabChange?.(tab);
    },
    [onSubTabChange]
  );

  return { activeSubTab, switchSubTab };
}

// Búsqueda del historial de cobros y total de lo filtrado.
export function useDashboardHistorySearch(paidMilestones: PaidMilestone[]) {
  const [historySearch, setHistorySearch] = useState('');

  const filteredPaidMilestones = useMemo(
    () => filterPaidMilestones(paidMilestones, historySearch),
    [paidMilestones, historySearch]
  );

  const filteredTotalCollected = useMemo(
    () => sumAmounts(filteredPaidMilestones),
    [filteredPaidMilestones]
  );

  return { historySearch, setHistorySearch, filteredPaidMilestones, filteredTotalCollected };
}
