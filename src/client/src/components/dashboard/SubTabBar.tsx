import { Clock, Receipt, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui';
import type { DashboardSubTab } from './helpers';

interface SubTabBarProps {
  activeSubTab: DashboardSubTab;
  pendingCount: number;
  paidCount: number;
  onSwitchSubTab: (tab: DashboardSubTab) => void;
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
}

// Subtab Switcher: En la calle vs Historial de Cobros (con buscador del historial)
export function SubTabBar({
  activeSubTab,
  pendingCount,
  paidCount,
  onSwitchSubTab,
  historySearch,
  onHistorySearchChange,
}: SubTabBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
      <div
        role="tablist"
        aria-label="Vistas de radar y cobros"
        className="inline-flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-lg self-start"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'pending'}
          aria-label={`Pestaña En la calle (${pendingCount} pendientes)`}
          onClick={() => onSwitchSubTab('pending')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all touch-manipulation',
            activeSubTab === 'pending'
              ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold border border-amber-500/30'
              : 'text-neutral-400 hover:text-neutral-200',
          )}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>En la calle ({pendingCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'history'}
          aria-label={`Pestaña Historial de Cobros (${paidCount} cobrados)`}
          onClick={() => onSwitchSubTab('history')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all touch-manipulation',
            activeSubTab === 'history'
              ? 'bg-neutral-800 text-[#d4ff33] shadow-sm font-semibold border border-[#BDEF00]/30'
              : 'text-neutral-400 hover:text-neutral-200',
          )}
        >
          <Receipt className="w-3.5 h-3.5 text-[#BDEF00]" />
          <span>Historial de Cobros ({paidCount})</span>
        </button>
      </div>

      {activeSubTab === 'history' && paidCount > 0 && (
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por cliente o proyecto..."
            value={historySearch}
            onChange={(e) => onHistorySearchChange(e.target.value)}
            className="pl-8 text-xs h-8 bg-neutral-900/80 border-neutral-800 focus:border-neutral-700"
          />
          {historySearch ? (
            <button
              type="button"
              onClick={() => onHistorySearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono"
            >
              ✕
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
