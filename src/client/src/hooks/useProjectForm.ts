import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { projectsApi } from '../lib/resources';
import type { ClientRef, ProjectFormData } from '../lib/types';
import {
  buildProjectCreateInput,
  buildProjectPatch,
  emptyProjectFormValues,
  projectFormValuesFrom,
  validateProjectForm,
  type ProjectFormFieldSetter,
  type ProjectFormValues,
} from '../components/projects/projectFormModel';
import { errorMessage } from '../lib/errors';
import { useChanged } from './useChanged';

interface UseProjectFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: ProjectFormData | null;
  clients: ClientRef[];
  onSuccess?: (project: ProjectFormData) => void;
}

/** Estado y envío del formulario de proyecto: crea con POST o edita con PATCH solo del diff. */
export function useProjectForm({ open, onOpenChange, mode, initial, clients, onSuccess }: UseProjectFormOptions) {
  const [values, setValues] = useState<ProjectFormValues>(() => emptyProjectFormValues([]));
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback<ProjectFormFieldSetter>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Cada apertura precarga el proyecto (edición) o reinicia el formulario (creación)
  const formInputsChanged = useChanged([open, mode, initial, clients]);
  if (formInputsChanged && open) {
    setValues(mode === 'edit' && initial ? projectFormValuesFrom(initial) : emptyProjectFormValues(clients));
  }

  const submit = async () => {
    const validationError = validateProjectForm(values, mode);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const created = await projectsApi.create(buildProjectCreateInput(values));
        onSuccess?.(created);
        onOpenChange(false);
      } else if (mode === 'edit' && initial) {
        // Enviar únicamente los campos modificados (diff contra initial)
        const diff = buildProjectPatch(values, initial);

        if (Object.keys(diff).length === 0) {
          toast.info('No se detectaron cambios en el proyecto');
          onOpenChange(false);
          return;
        }

        const updated = await projectsApi.softEdit(initial.id!, diff);
        toast.success('Proyecto actualizado exitosamente');
        onSuccess?.(updated);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Error al guardar proyecto'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === values.clientId) || initial?.client;

  return { values, setField, submitting, submit, selectedClient };
}
