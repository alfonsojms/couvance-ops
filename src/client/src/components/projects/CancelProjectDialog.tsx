import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ProjectListItem } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';

interface CancelProjectDialogProps {
  project: ProjectListItem | null;
  cancelling: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

/** Confirmación de cancelación no destructiva (RN-05: preserva los pagos cobrados). */
export const CancelProjectDialog: React.FC<CancelProjectDialogProps> = ({
  project,
  cancelling,
  onDismiss,
  onConfirm,
}) => (
  <Dialog
    open={Boolean(project)}
    onOpenChange={(open) => {
      if (!open) onDismiss();
    }}
  >
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
      <DialogHeader>
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <DialogTitle>Cancelar Proyecto</DialogTitle>
        </div>
        <DialogDescription>
          {project ? (
            <span>
              ¿Estás seguro de que deseas cancelar el proyecto{' '}
              <strong className="text-neutral-100">{project.title}</strong>?
            </span>
          ) : null}
        </DialogDescription>
      </DialogHeader>

      <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-850 text-xs text-neutral-400 space-y-2">
        <p className="text-neutral-300 font-medium">Consecuencias de la cancelación:</p>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400">
          <li>Todos los hitos de cobro en estado pendiente se cancelarán.</li>
          <li>
            Los pagos cobrados previamente (
            <strong className="text-emerald-400">{formatCurrency(project?.totalPaid || 0)}</strong>) se conservarán
            intactos en el historial.
          </li>
          <li>El proyecto se marcará como cancelado y no se mostrará en el Showcase.</li>
        </ul>
      </div>

      <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          onClick={onDismiss}
          className="w-full xs:w-auto"
        >
          Mantener Proyecto
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          touchFriendly
          isLoading={cancelling}
          onClick={onConfirm}
          className="w-full xs:w-auto"
        >
          Confirmar Cancelación
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
