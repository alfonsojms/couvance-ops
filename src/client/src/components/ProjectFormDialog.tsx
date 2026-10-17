import React, { useState } from 'react';
import type { ClientRef, ProjectFormData } from '../lib/types';
import { useProjectForm } from '../hooks/useProjectForm';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui';
import { ClientFormDialog, ClientFormItem } from './ClientFormDialog';
import { ProjectBasicInfoSection } from './projects/ProjectBasicInfoSection';
import { ProjectLinksSection } from './projects/ProjectLinksSection';
import { ProjectRecurringSection } from './projects/ProjectRecurringSection';

export type { ProjectFormData };
export type ProjectClientItem = ClientRef;

export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: ProjectFormData | null;
  clients: ProjectClientItem[];
  onRefreshClients?: () => Promise<void> | void;
  onSuccess?: (project: ProjectFormData) => void;
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initial,
  clients,
  onRefreshClients,
  onSuccess,
}) => {
  const { values, setField, submitting, submit, selectedClient } = useProjectForm({
    open,
    onOpenChange,
    mode,
    initial,
    clients,
    onSuccess,
  });
  const [showClientModal, setShowClientModal] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Crear Nuevo Proyecto' : `Editar Proyecto — ${initial?.title}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Configura el proyecto, enlaces de producción y recurrencia.'
                : 'Modifica metadatos, repositorios y servicios de hosting/mantenimiento.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="space-y-5"
          >
            <ProjectBasicInfoSection
              mode={mode}
              values={values}
              onFieldChange={setField}
              clients={clients}
              selectedClientName={selectedClient?.name}
              onRequestNewClient={() => setShowClientModal(true)}
            />

            <ProjectLinksSection values={values} onFieldChange={setField} />

            <ProjectRecurringSection values={values} onFieldChange={setField} />

            <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                touchFriendly
                onClick={() => onOpenChange(false)}
                className="w-full xs:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                touchFriendly
                isLoading={submitting}
                className="w-full xs:w-auto"
              >
                {mode === 'create' ? 'Crear Proyecto' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Alta Rápida de Cliente Inline */}
      <ClientFormDialog
        open={showClientModal}
        onOpenChange={setShowClientModal}
        mode="create"
        onSuccess={async (newClient: ClientFormItem) => {
          if (onRefreshClients) {
            await onRefreshClients();
          }
          setField('clientId', newClient.id);
        }}
      />
    </>
  );
};
