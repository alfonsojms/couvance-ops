import React from 'react';
import { Users, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface ClientsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}

// Cabecera Responsiva
export const ClientsHeader: React.FC<ClientsHeaderProps> = ({ loading, onRefresh, onCreate }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-800 pb-4">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-[#004BFF]" />
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Directorio de Clientes</h1>
      </div>
      <p className="text-xs text-neutral-400">
        Registro ágil sin burocracia, historial de proyectos y control de saldos
      </p>
    </div>

    <div className="flex items-center gap-2 self-start sm:self-auto">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        touchFriendly
        onClick={onRefresh}
        disabled={loading}
        aria-label="Actualizar lista de clientes"
        title="Refrescar lista"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </Button>

      <Button type="button" variant="primary" size="sm" touchFriendly onClick={onCreate}>
        <UserPlus className="w-3.5 h-3.5 mr-1" />
        <span>Nuevo Cliente</span>
      </Button>
    </div>
  </div>
);

export const ClientsEmptyState: React.FC = () => (
  <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-10 sm:p-12 text-center">
    <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
    <p className="text-sm text-neutral-300 font-medium">No hay clientes registrados aún</p>
    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
      Comienza agregando el primer cliente con el botón "Nuevo Cliente".
    </p>
  </div>
);
