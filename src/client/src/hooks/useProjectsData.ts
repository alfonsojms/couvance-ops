import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clientsApi, projectsApi } from '../lib/resources';
import type { ClientWithTotals, ProjectListItem } from '../lib/types';

/** Listado de proyectos y clientes, con las acciones que cambian el estado de un proyecto. */
export function useProjectsData() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [clients, setClients] = useState<ClientWithTotals[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirmación de cancelación de proyecto
  const [projectToCancel, setProjectToCancel] = useState<ProjectListItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Vercel React Best Practice: Promise.all to eliminate network waterfall
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const [projData, clientData] = await Promise.all([projectsApi.list(), clientsApi.list()]);
      setProjects(projData);
      setClients(clientData);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Marcar como Completado
  const completeProject = useCallback(
    async (projectId: string) => {
      try {
        await projectsApi.setStatus(projectId, 'COMPLETED');
        toast.success('Proyecto marcado como completado');
        loadProjects();
      } catch (err: any) {
        toast.error(err.message || 'Error al completar proyecto');
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
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar proyecto');
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
