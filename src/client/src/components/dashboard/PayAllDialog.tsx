import { Zap } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import {
  Button,
  CardPanel,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui';
import type { PayAllModalData } from './helpers';

interface PayAllDialogProps {
  target: PayAllModalData | null;
  isProcessing: boolean | undefined;
  onClose: () => void;
  onConfirm: () => void;
}

// Modal de Confirmación para "Cobrar Todo"
export function PayAllDialog({ target, isProcessing, onClose, onConfirm }: PayAllDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Zap className="w-5 h-5 shrink-0" />
            <DialogTitle>¿Confirmar liquidación total del presupuesto?</DialogTitle>
          </div>
          <DialogDescription>
            Esta acción marcará de forma inmediata todos los hitos pendientes de este presupuesto como cobrados, registrando la fecha de pago de hoy.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <CardPanel className="space-y-2 mb-2">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-neutral-400">Proyecto:</span>
              <span className="font-semibold text-neutral-100 truncate ml-2">{target.projectTitle}</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-neutral-400">Cliente:</span>
              <span className="text-neutral-200 truncate ml-2">{target.clientName}</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-neutral-400">Hitos a liquidar:</span>
              <span className="font-mono text-neutral-200">{target.milestonesCount} pendientes</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-neutral-800">
              <span className="text-neutral-300 font-medium">Monto Total a Cobrar:</span>
              <span className="font-mono font-bold text-base text-[#BDEF00]">
                {formatCurrency(target.totalAmount, target.currency)}
              </span>
            </div>
          </CardPanel>
        ) : null}

        <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
          <Button
            type="button"
            variant="ghost"
            touchFriendly
            onClick={onClose}
            className="w-full xs:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            touchFriendly
            isLoading={isProcessing}
            onClick={onConfirm}
            className="w-full xs:w-auto"
          >
            Confirmar Cobro Total
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
