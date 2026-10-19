import React, { useState } from 'react';
import type { ClientWithTotals } from '../lib/types';
import { useClientDeletion, useClientsList } from '../hooks/useClients';
import { ClientFormDialog } from '../components/ClientFormDialog';
import { ClientCard } from '../components/clients/ClientCard';
import { ClientsEmptyState, ClientsHeader } from '../components/clients/ClientsHeader';
import { DeleteClientDialog } from '../components/clients/DeleteClientDialog';

export const Clients: React.FC = () => {
  const { clients, loading, loadClients } = useClientsList();
  const deletion = useClientDeletion(loadClients);

  // Modales de alta y edición de cliente
  const [openModal, setOpenModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithTotals | null>(null);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <ClientsHeader loading={loading} onRefresh={loadClients} onCreate={() => setOpenModal(true)} />

      {/* Grid de Clientes */}
      {clients.length === 0 && !loading ? (
        <ClientsEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {clients.map((c) => (
            <ClientCard key={c.id} c={c} onOpenEdit={setEditingClient} onOpenDelete={deletion.openDeleteConfirmation} />
          ))}
        </div>
      )}

      {/* Modal Alta Rápida de Cliente */}
      <ClientFormDialog open={openModal} onOpenChange={setOpenModal} mode="create" onSuccess={loadClients} />

      {/* Modal Edición de Cliente */}
      <ClientFormDialog
        open={Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
        mode="edit"
        initial={editingClient}
        onSuccess={loadClients}
      />

      <DeleteClientDialog
        client={deletion.clientToDelete}
        deleting={deletion.deleting}
        conflictMessage={deletion.conflictMessage}
        onClose={deletion.closeDeleteConfirmation}
        onConfirm={deletion.confirmDelete}
      />
    </div>
  );
};
