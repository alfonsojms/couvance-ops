import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import type { FinancialMetrics } from '../../lib/types';
import { cn, formatCurrency } from '../../lib/utils';
import { MetricCard } from '../ui';
import type { DashboardSubTab } from './helpers';

interface MetricsRowProps {
  metrics: FinancialMetrics | null;
  activeSubTab: DashboardSubTab;
  onSwitchSubTab: (tab: DashboardSubTab) => void;
}

// Métricas Principales: Jerarquía de Tesorería interactiva
export function MetricsRow({ metrics, activeSubTab, onSwitchSubTab }: MetricsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <button
        type="button"
        aria-label="Ver hitos pendientes en la calle"
        onClick={() => onSwitchSubTab('pending')}
        className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl transition-all"
      >
        <MetricCard
          title="Total en la Calle (Pendiente)"
          value={
            <span className="text-2xl xs:text-3xl sm:text-4xl text-amber-400 font-extrabold tracking-tight">
              {formatCurrency(metrics?.totalInTheStreet || 0)}
            </span>
          }
          subtitle={activeSubTab === 'pending' ? '● Viendo pendientes ahora' : 'Clic para ver pendientes →'}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          className={cn(
            'border-amber-500/30 bg-amber-500/5 relative overflow-hidden transition-all cursor-pointer h-full',
            activeSubTab === 'pending'
              ? 'ring-2 ring-amber-500/60 shadow-md shadow-amber-500/10'
              : 'hover:border-amber-500/50 hover:bg-amber-500/10 ring-1 ring-amber-500/20 opacity-85 hover:opacity-100',
          )}
        />
      </button>

      <button
        type="button"
        aria-label="Ver historial de cobros registrados"
        onClick={() => onSwitchSubTab('history')}
        className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BDEF00]/50 rounded-xl transition-all"
      >
        <MetricCard
          title="Total Cobrado (Histórico)"
          value={
            <span className="text-2xl xs:text-3xl sm:text-4xl text-[#d4ff33] font-extrabold tracking-tight">
              {formatCurrency(metrics?.totalCollected || 0)}
            </span>
          }
          subtitle={activeSubTab === 'history' ? '● Viendo historial ahora' : 'Clic para ver desglose →'}
          icon={<DollarSign className="w-5 h-5 text-[#BDEF00]" />}
          className={cn(
            'border-[#BDEF00]/25 bg-[#BDEF00]/5 relative overflow-hidden transition-all cursor-pointer h-full',
            activeSubTab === 'history'
              ? 'ring-2 ring-[#BDEF00]/60 shadow-md shadow-[#BDEF00]/10'
              : 'hover:border-[#BDEF00]/50 hover:bg-[#BDEF00]/10 ring-1 ring-[#BDEF00]/15 opacity-85 hover:opacity-100',
          )}
        />
      </button>

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
  );
}
