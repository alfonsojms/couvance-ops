import React from 'react';
import { AlertTriangle, FolderKanban } from 'lucide-react';
import type { ClientWithTotals } from '../../lib/types';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';

interface DeleteClientDialogProps {
  client: ClientWithTotals | null;
  deleting: boolean;
  conflictMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// Modal de Confirmación de Eliminación
export const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  client,
  deleting,
  conflictMessage,
  onClose,
  onConfirm,
}) => (
  <Dialog
    open={Boolean(client)}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
      <DialogHeader>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <DialogTitle>Eliminar Cliente</DialogTitle>
        </div>
        <DialogDescription>
          {client ? (
            <span>
              ¿Estás seguro de que deseas eliminar permanentemente a{' '}
              <strong className="text-neutral-100">{client.name}</strong>?
            </span>
          ) : null}
        </DialogDescription>
      </DialogHeader>

      {/* Advertencia / Manejo amigable de proyectos asociados o error 409 */}
      {client && client.projectsCount > 0 ? (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/60 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <FolderKanban className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Cliente con proyectos activos ({client.projectsCount})</span>
          </div>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Por protección e integridad contable, no es posible eliminar clientes que tengan proyectos registrados. Para
            poder eliminar este cliente, primero debes archivar o reasignar todos sus proyectos vinculados.
          </p>
        </div>
      ) : conflictMessage ? (
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 text-rose-200 text-xs space-y-1">
          <span className="font-semibold block">Conflicto de integridad (409)</span>
          <p className="text-[11px] text-rose-300/80">{conflictMessage}</p>
        </div>
      ) : (
        <p className="text-xs text-neutral-400">
          Esta acción eliminará la ficha del cliente. Esta operación no se puede deshacer.
        </p>
      )}

      <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          onClick={onClose}
          className="w-full xs:w-auto"
        >
          Cerrar
        </Button>
        {client && client.projectsCount === 0 ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            touchFriendly
            isLoading={deleting}
            onClick={onConfirm}
            className="w-full xs:w-auto"
          >
            Eliminar Cliente
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
