import React, { useState } from 'react';
import { toast } from 'sonner';
import { clientsApi } from '../lib/resources';
import type { Client } from '../lib/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Textarea,
} from './ui';
import { errorMessage } from '../lib/errors';
import { useChanged } from '../hooks/useChanged';

export type ClientFormItem = Client;

export interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: ClientFormItem | null;
  onSuccess?: (client: Client) => void;
}

export const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ open, onOpenChange, mode, initial, onSuccess }) => {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cada apertura precarga el cliente (edición) o limpia el formulario (creación)
  const formInputsChanged = useChanged([open, mode, initial]);
  if (formInputsChanged && open) {
    const source = mode === 'edit' && initial ? initial : null;
    setName(source?.name || '');
    setContactName(source?.contactName || '');
    setPhone(source?.phone || '');
    setEmail(source?.email || '');
    setNotes(source?.notes || '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del cliente o empresa es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        contactName: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      if (mode === 'create') {
        const created = await clientsApi.create(payload);
        toast.success('Cliente registrado exitosamente');
        onSuccess?.(created);
      } else if (mode === 'edit' && initial) {
        const updated = await clientsApi.update(initial.id, payload);
        toast.success('Cliente actualizado exitosamente');
        onSuccess?.(updated);
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, 'Error al guardar cliente'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Alta Rápida de Cliente' : 'Editar Cliente'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra un nuevo cliente u organización para cotizar o asignar proyectos.'
              : 'Modifica los datos de contacto y notas del cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <FormField id="client-form-name" label="Nombre o Empresa" required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Estudio Jurídico Morales"
              autoFocus
            />
          </FormField>

          <FormField id="client-form-contact" label="Persona de Contacto (Opcional)">
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ej: Carlos Morales"
            />
          </FormField>

          <FormField id="client-form-phone" label="Teléfono / WhatsApp Internacional (Opcional)">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +5491123456789"
              className="font-mono"
            />
          </FormField>

          <FormField id="client-form-email" label="Email (Opcional)">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </FormField>

          <FormField id="client-form-notes" label="Notas Adicionales (Opcional)">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de pago, horarios o requerimientos..."
            />
          </FormField>

          <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
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
              {mode === 'create' ? 'Guardar Cliente' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
