import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clientsApi } from '../lib/resources';
import type { ClientWithTotals } from '../lib/types';

// Carga del directorio de clientes, con recarga manual.
export function useClientsList() {
  const [clients, setClients] = useState<ClientWithTotals[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clientsApi.list();
      setClients(data);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return { clients, loading, loadClients };
}

// Flujo de eliminación: confirmación, bloqueo preventivo si hay proyectos y manejo del 409.
export function useClientDeletion(onDeleted: () => void) {
  const [clientToDelete, setClientToDelete] = useState<ClientWithTotals | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const openDeleteConfirmation = useCallback((client: ClientWithTotals) => {
    setClientToDelete(client);
    setConflictMessage(null);
  }, []);

  const closeDeleteConfirmation = useCallback(() => {
    setClientToDelete(null);
    setConflictMessage(null);
  }, []);

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    // Validación preventiva en cliente antes de llamada
    if (clientToDelete.projectsCount > 0) {
      setConflictMessage(
        `No es posible eliminar a "${clientToDelete.name}" porque tiene ${clientToDelete.projectsCount} proyecto(s) vinculado(s). Para preservar la integridad contable, primero reasigna o elimina los proyectos asociados.`
      );
      return;
    }

    setDeleting(true);
    try {
      await clientsApi.remove(clientToDelete.id);
      toast.success('Cliente eliminado');
      setClientToDelete(null);
      onDeleted();
    } catch (err: any) {
      // Manejo constructivo de 409 Conflict
      const errorMsg =
        err.message ||
        'No se pudo eliminar el cliente porque posee proyectos asociados o historial contable activo.';
      setConflictMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  return {
    clientToDelete,
    deleting,
    conflictMessage,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    confirmDelete,
  };
}
