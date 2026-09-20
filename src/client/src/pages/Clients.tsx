import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Trash2,
  RefreshCw,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { WhatsAppButton } from '../components/WhatsAppButton';
import {
  Button,
  Card,
  CardPanel,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Textarea,
} from '../components/ui';

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

  // Modal de confirmación de eliminación accesible (sin window.confirm)
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

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
      toast.success('Cliente registrado exitosamente');
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

  const openDeleteConfirmation = (client: ClientItem) => {
    setClientToDelete(client);
    setConflictMessage(null);
  };

  const handleConfirmDelete = async () => {
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
      await api.del(`/api/clients/${clientToDelete.id}`);
      toast.success('Cliente eliminado');
      setClientToDelete(null);
      loadClients();
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadClients}
            disabled={loading}
            aria-label="Actualizar lista de clientes"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            touchFriendly
            onClick={() => setOpenModal(true)}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            <span>Nuevo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Grid de Clientes */}
      {clients.length === 0 && !loading ? (
        <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-12 text-center">
          <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-300 font-medium">No hay clientes registrados aún</p>
          <p className="text-xs text-neutral-500 mt-1">
            Comienza agregando el primer cliente con el botón "Nuevo Cliente".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const contactMsg = `Hola ${c.name}, te escribimos de Couvance. ¿Cómo estás?`;

            return (
              <Card
                key={c.id}
                className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-100">{c.name}</h3>
                      {c.contactName && (
                        <span className="text-xs text-neutral-400 block">
                          Contacto: {c.contactName}
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteConfirmation(c)}
                      aria-label={`Eliminar cliente ${c.name}`}
                      title="Eliminar cliente"
                      className="text-neutral-500 hover:text-rose-400 hover:bg-neutral-800/80 p-1.5 h-8 w-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Info de contacto */}
                  <div className="space-y-1 text-xs text-neutral-400">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                    )}

                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
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
                  <CardPanel className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Proyectos</span>
                      <span className="text-neutral-200 font-semibold">{c.projectsCount}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Pendiente</span>
                      <span className="text-amber-400 font-semibold">
                        {formatCurrency(c.totalPending)}
                      </span>
                    </div>
                  </CardPanel>
                </div>

                {/* Botón WhatsApp con touch target */}
                <div className="pt-2 border-t border-neutral-800">
                  <WhatsAppButton
                    phone={c.phone}
                    message={contactMsg}
                    label="Abrir WhatsApp"
                    size="sm"
                    className="w-full justify-center min-h-[44px] sm:min-h-[34px]"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Alta Rápida de Cliente con Dialog y FormField */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alta Rápida de Cliente</DialogTitle>
            <DialogDescription>
              Registra un nuevo cliente u organización para cotizar o asignar proyectos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-3.5">
            <FormField id="client-name" label="Nombre o Empresa" required>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Estudio Jurídico Morales"
                autoFocus
              />
            </FormField>

            <FormField id="client-contact" label="Persona de Contacto (Opcional)">
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Carlos Morales"
              />
            </FormField>

            <FormField id="client-phone" label="Teléfono / WhatsApp Internacional (Opcional)">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +5491123456789"
                className="font-mono"
              />
            </FormField>

            <FormField id="client-email" label="Email (Opcional)">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@empresa.com"
              />
            </FormField>

            <FormField id="client-notes" label="Notas Adicionales (Opcional)">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de pago, horarios o requerimientos..."
              />
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
              >
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación Accesible (Reemplazo window.confirm & Manejo 409) */}
      <Dialog
        open={Boolean(clientToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setClientToDelete(null);
            setConflictMessage(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle>Eliminar Cliente</DialogTitle>
            </div>
            <DialogDescription>
              {clientToDelete && (
                <span>
                  ¿Estás seguro de que deseas eliminar permanentemente a{' '}
                  <strong className="text-neutral-100">{clientToDelete.name}</strong>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Advertencia / Manejo amigable de proyectos asociados o error 409 */}
          {clientToDelete && clientToDelete.projectsCount > 0 ? (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/60 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <FolderKanban className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Cliente con proyectos activos ({clientToDelete.projectsCount})</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Por protección e integridad contable, no es posible eliminar clientes que tengan
                proyectos registrados. Para poder eliminar este cliente, primero debes archivar o
                reasignar todos sus proyectos vinculados.
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

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setClientToDelete(null);
                setConflictMessage(null);
              }}
            >
              Cerrar
            </Button>
            {clientToDelete && clientToDelete.projectsCount === 0 && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleConfirmDelete}
              >
                Eliminar Cliente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
