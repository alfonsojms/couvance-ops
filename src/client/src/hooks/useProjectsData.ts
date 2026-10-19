import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { clientsApi, projectsApi } from '../lib/resources';
import type { ClientWithTotals, ProjectListItem } from '../lib/types';
import { errorMessage } from '../lib/errors';
import { useAsyncData } from './useAsyncData';

interface ProjectsPageData {
  projects: ProjectListItem[];
  clients: ClientWithTotals[];
}

const emptyProjectsPageData: ProjectsPageData = { projects: [], clients: [] };

// Vercel React Best Practice: Promise.all to eliminate network waterfall
async function fetchProjectsPageData(): Promise<ProjectsPageData> {
  const [projects, clients] = await Promise.all([projectsApi.list(), clientsApi.list()]);
  return { projects, clients };
}

/** Listado de proyectos y clientes, con las acciones que cambian el estado de un proyecto. */
export function useProjectsData() {
  const {
    data: { projects, clients },
    loading,
    reload: loadProjects,
  } = useAsyncData(fetchProjectsPageData, emptyProjectsPageData, 'Error al cargar proyectos');

  // Confirmación de cancelación de proyecto
  const [projectToCancel, setProjectToCancel] = useState<ProjectListItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Marcar como Completado
  const completeProject = useCallback(
    async (projectId: string) => {
      try {
        await projectsApi.setStatus(projectId, 'COMPLETED');
        toast.success('Proyecto marcado como completado');
        loadProjects();
      } catch (err) {
        toast.error(errorMessage(err, 'Error al completar proyecto'));
      }
    },
    [loadProjects],
  );

  // Confirmar Cancelación del Proyecto (No destructiva, preserva pagos cobrados)
  const confirmCancelProject = async () => {
    if (!projectToCancel) return;

    setCancelling(true);
    try {
      await projectsApi.setStatus(projectToCancel.id, 'CANCELLED');
      toast.success('Proyecto cancelado. Los pagos previos se mantuvieron intactos.');
      setProjectToCancel(null);
      loadProjects();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al cancelar proyecto'));
    } finally {
      setCancelling(false);
    }
  };

  return {
    projects,
    clients,
    loading,
    loadProjects,
    completeProject,
    projectToCancel,
    setProjectToCancel,
    cancelling,
    confirmCancelProject,
  };
}
