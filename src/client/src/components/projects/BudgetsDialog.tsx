import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui';

interface BudgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
  children: React.ReactNode;
}

/** Modal de cotizaciones del proyecto; el historial y el formulario llegan como hijos. */
export const BudgetsDialog: React.FC<BudgetsDialogProps> = ({ open, onOpenChange, projectTitle, children }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>Cotizaciones — {projectTitle}</DialogTitle>
        <DialogDescription>Crea presupuestos con presets automáticos y apruébalos con un solo clic.</DialogDescription>
      </DialogHeader>

      {children}
    </DialogContent>
  </Dialog>
);
