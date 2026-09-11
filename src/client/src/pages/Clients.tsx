import React, { useEffect, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Trash2,
  X,
  RefreshCw,
  FolderKanban,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { WhatsAppButton } from '../components/WhatsAppButton';

interface ClientItem {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  projectsCount: number;
  totalPaid: number;
  totalPending: number;
}

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nuevo cliente
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<ClientItem[]>('/api/clients');
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre o empresa es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/clients', {
        name: name.trim(),
        contactName: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success('Cliente creado exitosamente.');
      setOpenModal(false);
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setNotes('');
      loadClients();
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string, clientName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al cliente "${clientName}"?`)) return;

    try {
      await api.del(`/api/clients/${id}`);
      toast.success('Cliente eliminado');
      loadClients();
    } catch (err: any) {
      // Protección 409 con proyectos asociados (RN-06)
      toast.error(err.message || 'No se pudo eliminar el cliente');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-neutral-300" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-100">
              Directorio de Clientes
            </h1>
          </div>
          <p className="text-xs text-neutral-400">
            Registro ágil sin burocracia, historial de proyectos y control de saldos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadClients}
            disabled={loading}
            className="p-2 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-100"
            title="Refrescar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all select-none"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => {
          const contactMsg = `Hola ${c.name}, te escribimos de Kodex. ¿Cómo estás?`;

          return (
            <div
              key={c.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-100">{c.name}</h3>
                    {c.contactName && (
                      <span className="text-xs text-neutral-400">Contacto: {c.contactName}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c.id, c.name)}
                    title="Eliminar cliente"
                    className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info de contacto */}
                <div className="space-y-1 text-xs text-neutral-400">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{c.phone}</span>
                    </div>
                  )}

                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}

                  {c.notes && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-neutral-500">
                      <FileText className="w-3.5 h-3.5 text-neutral-600 shrink-0 mt-0.5" />
                      <span className="italic line-clamp-2">{c.notes}</span>
                    </div>
                  )}
                </div>

                {/* Métricas del Cliente */}
                <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-850 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-neutral-500 text-[10px] block">Proyectos</span>
                    <span className="text-neutral-200 font-semibold">{c.projectsCount}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[10px] block">Pendiente</span>
                    <span className="text-amber-400 font-semibold">{formatCurrency(c.totalPending)}</span>
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp */}
              <div className="pt-2 border-t border-neutral-800">
                <WhatsAppButton
                  phone={c.phone}
                  message={contactMsg}
                  label="Abrir WhatsApp"
                  size="sm"
                  className="w-full justify-center"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Alta Rápida de Cliente */}
      <Dialog.Root open={openModal} onOpenChange={setOpenModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl z-50 focus:outline-none">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-sm font-semibold text-neutral-100">
                Alta Rápida de Cliente
              </Dialog.Title>
              <Dialog.Close className="p-1 text-neutral-400 hover:text-neutral-100">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nombre o Empresa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Estudio Jurídico Morales"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Persona de Contacto (Opcional)
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ej: Carlos Morales"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Teléfono / WhatsApp Internacional (Opcional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +5491123456789"
                  className="w-full px-3 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Notas Adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones de pago, horarios o requerimientos..."
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
