import { RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface DashboardHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

// Cabecera Responsiva
export function DashboardHeader({ loading, onRefresh }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Radar de Cobranzas y Flujo de Caja</h1>
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
        onClick={onRefresh}
        disabled={loading}
        isLoading={loading}
        className="self-start sm:self-auto"
      >
        {!loading ? <RefreshCw className="w-3.5 h-3.5" /> : null}
        <span>Actualizar</span>
      </Button>
    </div>
  );
}
