import React from 'react';
import type { ProjectStatus } from '../../lib/types';

export type ProjectStatusFilter = 'ALL' | ProjectStatus;

const STATUS_FILTERS: { id: ProjectStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'PROSPECT', label: 'Prospectos' },
  { id: 'IN_PROGRESS', label: 'En Progreso' },
  { id: 'COMPLETED', label: 'Completados' },
  { id: 'CANCELLED', label: 'Cancelados' },
];

interface ProjectStatusFiltersProps {
  value: ProjectStatusFilter;
  onChange: (value: ProjectStatusFilter) => void;
}

/** Barra de filtros por estado con scroll horizontal suave en móvil. */
export const ProjectStatusFilters: React.FC<ProjectStatusFiltersProps> = ({ value, onChange }) => (
  <div
    className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0"
    aria-label="Filtros por estado"
  >
    {STATUS_FILTERS.map((st) => (
      <button
        key={st.id}
        type="button"
        onClick={() => onChange(st.id)}
        className={`min-h-[40px] sm:min-h-[32px] px-3 py-1 rounded-md text-xs font-medium transition-all select-none touch-manipulation shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] ${
          value === st.id
            ? 'bg-neutral-900 text-white border border-[#004BFF]/60 shadow-[0_0_10px_rgba(0,75,255,0.15)]'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
        }`}
      >
        {st.label}
      </button>
    ))}
  </div>
);
