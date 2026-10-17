import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface ProjectsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onCreateProject: () => void;
}

/** Cabecera de la página con refresco y alta de proyecto. */
export const ProjectsHeader: React.FC<ProjectsHeaderProps> = ({ loading, onRefresh, onCreateProject }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-800 pb-4">
    <div>
      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-100">
        Control de Proyectos & Cotizaciones
      </h1>
      <p className="text-xs text-neutral-400">
        Trilogía de enlaces operativos, cotizador con presets automáticos y aprobación inmediata
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
        aria-label="Actualizar proyectos"
        title="Refrescar lista"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </Button>

      <Button
        type="button"
        variant="primary"
        size="sm"
        touchFriendly
        onClick={onCreateProject}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        <span>Nuevo Proyecto</span>
      </Button>
    </div>
  </div>
);
