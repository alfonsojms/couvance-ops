import React from 'react';
import type { PaidMilestone } from '../lib/types';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardHistorySearch, useDashboardSubTab } from '../hooks/useDashboardView';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { MetricsRow } from '../components/dashboard/MetricsRow';
import { SubTabBar } from '../components/dashboard/SubTabBar';
import { PendingView } from '../components/dashboard/PendingView';
import { HistoryView } from '../components/dashboard/HistoryView';
import { PayAllDialog } from '../components/dashboard/PayAllDialog';

export type PaidMilestoneDTO = PaidMilestone;

export interface DashboardProps {
  initialSubTab?: 'pending' | 'history';
  onSubTabChange?: (tab: 'pending' | 'history') => void;
}

// Contenedor del Radar: conecta los hooks de datos y de vista con los componentes presentacionales.
export const Dashboard: React.FC<DashboardProps> = ({ initialSubTab = 'pending', onSubTabChange }) => {
  const { activeSubTab, switchSubTab } = useDashboardSubTab(initialSubTab, onSubTabChange);
  const data = useDashboardData();
  const { historySearch, setHistorySearch, filteredPaidMilestones, filteredTotalCollected } = useDashboardHistorySearch(
    data.paidMilestones,
  );

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <DashboardHeader loading={data.loading} onRefresh={data.reload} />

      <MetricsRow metrics={data.metrics} activeSubTab={activeSubTab} onSwitchSubTab={switchSubTab} />

      <SubTabBar
        activeSubTab={activeSubTab}
        pendingCount={data.pendingMilestones.length}
        paidCount={data.paidMilestones.length}
        onSwitchSubTab={switchSubTab}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
      />

      {activeSubTab === 'pending' ? (
        <PendingView
          recurringAlerts={data.recurringAlerts}
          pendingMilestones={data.pendingMilestones}
          processingId={data.processingId}
          onRenew={data.renewProject}
          onPay={data.payMilestone}
          onOpenPayAll={data.openPayAll}
        />
      ) : null}

      {activeSubTab === 'history' ? (
        <HistoryView
          milestones={filteredPaidMilestones}
          totalAmount={filteredTotalCollected}
          historySearch={historySearch}
        />
      ) : null}

      <PayAllDialog
        target={data.payAllTarget}
        isProcessing={data.processingId?.startsWith('budget-')}
        onClose={data.closePayAll}
        onConfirm={data.confirmPayAll}
      />
    </div>
  );
};
