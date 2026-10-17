import React from 'react';
import { FileText } from 'lucide-react';
import type { ProjectListItem } from '../../lib/types';
import { ProjectCardItem, type ProjectCardProps } from './ProjectCard';

interface ProjectListProps extends Omit<ProjectCardProps, 'p'> {
  projects: ProjectListItem[];
  loading: boolean;
  /** Distingue el mensaje vacío entre "sin proyectos" y "sin resultados del filtro". */
  isFiltered: boolean;
}

/** Grilla de tarjetas de proyecto o estado vacío. */
export const ProjectList: React.FC<ProjectListProps> = ({ projects, loading, isFiltered, ...cardActions }) =>
  projects.length === 0 && !loading ? (
    <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-10 sm:p-12 text-center">
      <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
      <p className="text-sm text-neutral-300 font-medium">No se encontraron proyectos</p>
      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
        {!isFiltered
          ? 'Comienza registrando tu primer proyecto con el botón superior.'
          : 'No hay proyectos en la categoría seleccionada.'}
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
      {projects.map((p) => (
        <ProjectCardItem key={p.id} p={p} {...cardActions} />
      ))}
    </div>
  );
