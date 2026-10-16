import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Globe, Code, FolderArchive, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
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
  Select,
} from './ui';
import { ClientFormDialog, ClientFormItem } from './ClientFormDialog';

export interface ProjectClientItem {
  id: string;
  name: string;
}

export interface ProjectFormData {
  id?: string;
  clientId: string;
  title: string;
  category: 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP';
  status?: 'PROSPECT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  productionUrl?: string | null;
  productionStatus?: 'ACTIVE' | 'INACTIVE';
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring?: number;
  recurringAmount?: number | null;
  recurringCurrency?: string;
  recurringPeriod?: 'MONTHLY' | 'ANNUALLY';
  recurringRenewalDate?: string | null;
  client?: ProjectClientItem | null;
  totalBudgeted?: number;
  totalPaid?: number;
  totalPending?: number;
}

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
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState<'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP'>('LANDING');
  const [productionUrl, setProductionUrl] = useState('');
  const [productionStatus, setProductionStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [codeRepoUrl, setCodeRepoUrl] = useState('');
  const [resourcesUrl, setResourcesUrl] = useState('');

  // Recurrencia
  const [hasRecurring, setHasRecurring] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState<string>('');
  const [recurringCurrency, setRecurringCurrency] = useState('USD');
  const [recurringPeriod, setRecurringPeriod] = useState<'MONTHLY' | 'ANNUALLY'>('ANNUALLY');
  const [recurringRenewalDate, setRecurringRenewalDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initial) {
        setTitle(initial.title || '');
        setClientId(initial.clientId || '');
        setCategory(initial.category || 'LANDING');
        setProductionUrl(initial.productionUrl || '');
        setProductionStatus(initial.productionStatus || 'ACTIVE');
        setCodeRepoUrl(initial.codeRepoUrl || '');
        setResourcesUrl(initial.resourcesUrl || '');
        setHasRecurring(initial.hasRecurring === 1);
        setRecurringAmount(
          initial.recurringAmount !== undefined && initial.recurringAmount !== null
            ? String(initial.recurringAmount)
            : ''
        );
        setRecurringCurrency(initial.recurringCurrency || 'USD');
        setRecurringPeriod(initial.recurringPeriod || 'ANNUALLY');
        setRecurringRenewalDate(initial.recurringRenewalDate || '');
      } else {
        setTitle('');
        setClientId(clients.length > 0 ? clients[0].id : '');
        setCategory('LANDING');
        setProductionUrl('');
        setProductionStatus('ACTIVE');
        setCodeRepoUrl('');
        setResourcesUrl('');
        setHasRecurring(false);
        setRecurringAmount('');
        setRecurringCurrency('USD');
        setRecurringPeriod('ANNUALLY');
        setRecurringRenewalDate('');
      }
    }
  }, [open, mode, initial, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }

    if (mode === 'create' && !clientId) {
      toast.error('Selecciona un cliente para el proyecto');
      return;
    }

    if (hasRecurring) {
      const numAmount = parseFloat(recurringAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('El monto recurrente es obligatorio cuando la recurrencia está activa');
        return;
      }
      if (!recurringRenewalDate || recurringRenewalDate.trim() === '') {
        toast.error('La fecha de renovación es obligatoria cuando la recurrencia está activa');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const payload = {
          title: title.trim(),
          clientId,
          category,
          status: 'PROSPECT',
          productionUrl: productionUrl.trim() || null,
          productionStatus,
          codeRepoUrl: codeRepoUrl.trim() || null,
          resourcesUrl: resourcesUrl.trim() || null,
          hasRecurring: hasRecurring ? 1 : 0,
          recurringAmount: hasRecurring && recurringAmount ? parseFloat(recurringAmount) : null,
          recurringCurrency: recurringCurrency.trim() || 'USD',
          recurringPeriod,
          recurringRenewalDate: hasRecurring && recurringRenewalDate ? recurringRenewalDate : null,
        };

        const created = await api.post<ProjectFormData>('/api/projects', payload);
        onSuccess?.(created);
        onOpenChange(false);
      } else if (mode === 'edit' && initial) {
        // Enviar únicamente los campos modificados (diff contra initial)
        const diff: Record<string, any> = {};

        if (title.trim() !== (initial.title || '')) {
          diff.title = title.trim();
        }
        if (category !== initial.category) {
          diff.category = category;
        }

        const cleanProdUrl = productionUrl.trim() || null;
        if (cleanProdUrl !== (initial.productionUrl || null)) {
          diff.productionUrl = cleanProdUrl;
        }

        if (productionStatus !== (initial.productionStatus || 'ACTIVE')) {
          diff.productionStatus = productionStatus;
        }

        const cleanRepoUrl = codeRepoUrl.trim() || null;
        if (cleanRepoUrl !== (initial.codeRepoUrl || null)) {
          diff.codeRepoUrl = cleanRepoUrl;
        }

        const cleanResUrl = resourcesUrl.trim() || null;
        if (cleanResUrl !== (initial.resourcesUrl || null)) {
          diff.resourcesUrl = cleanResUrl;
        }

        const newHasRecurring = hasRecurring ? 1 : 0;
        const initialHasRecurring = initial.hasRecurring === 1 ? 1 : 0;

        if (newHasRecurring !== initialHasRecurring) {
          diff.hasRecurring = newHasRecurring;
        }

        if (hasRecurring) {
          const numAmount = recurringAmount !== '' ? parseFloat(recurringAmount) : null;
          if (numAmount !== (initial.recurringAmount ?? null)) {
            diff.recurringAmount = numAmount;
          }

          const cleanCurrency = recurringCurrency.trim() || 'USD';
          if (cleanCurrency !== (initial.recurringCurrency || 'USD')) {
            diff.recurringCurrency = cleanCurrency;
          }

          if (recurringPeriod !== (initial.recurringPeriod || 'ANNUALLY')) {
            diff.recurringPeriod = recurringPeriod;
          }

          const cleanDate = recurringRenewalDate.trim() || null;
          if (cleanDate !== (initial.recurringRenewalDate || null)) {
            diff.recurringRenewalDate = cleanDate;
          }
        }

        if (Object.keys(diff).length === 0) {
          toast.info('No se detectaron cambios en el proyecto');
          onOpenChange(false);
          return;
        }

        const updated = await api.patch<ProjectFormData>(`/api/projects/${initial.id}`, diff);
        toast.success('Proyecto actualizado exitosamente');
        onSuccess?.(updated);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId) || initial?.client;

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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. SECCIÓN: INFORMACIÓN BÁSICA */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                1. Información Básica
              </h4>

              <FormField id="project-form-title" label="Nombre del Proyecto" required>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Rediseño Web Corporativa"
                  autoFocus
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="project-form-client" label="Cliente Asociado" required>
                  {mode === 'edit' ? (
                    <Input
                      disabled
                      value={selectedClient?.name || 'Cliente asignado'}
                      className="opacity-75 cursor-not-allowed bg-neutral-900 border-neutral-800"
                    />
                  ) : (
                    <div>
                      <Select
                        required
                        value={clientId}
                        onChange={(e) => {
                          if (e.target.value === '__NEW_CLIENT__') {
                            setShowClientModal(true);
                          } else {
                            setClientId(e.target.value);
                          }
                        }}
                      >
                        <option value="">Selecciona un cliente...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="__NEW_CLIENT__">+ Registrar nuevo cliente...</option>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Crear cliente inline</span>
                      </button>
                    </div>
                  )}
                </FormField>

                <FormField id="project-form-category" label="Categoría">
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="LANDING">Landing Page</option>
                    <option value="ECOMMERCE">E-commerce</option>
                    <option value="CORPORATE">Web Corporativa</option>
                    <option value="WEBAPP">Aplicación Web</option>
                  </Select>
                </FormField>
              </div>
            </div>

            {/* 2. SECCIÓN: ENLACES & SHOWCASE */}
            <div className="space-y-3 pt-3 border-t border-neutral-800/80">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>2. Enlaces & Vitrina (Showcase)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FormField
                    id="project-form-prod-url"
                    label={
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-neutral-400" />
                        <span>URL de Producción (Showcase)</span>
                      </span>
                    }
                  >
                    <Input
                      type="url"
                      value={productionUrl}
                      onChange={(e) => setProductionUrl(e.target.value)}
                      placeholder="https://ejemplo.com"
                    />
                  </FormField>
                </div>

                <FormField id="project-form-prod-status" label="Estado en Producción">
                  <Select
                    value={productionStatus}
                    onChange={(e) => setProductionStatus(e.target.value as any)}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo / Pausado</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="project-form-repo-url"
                  label={
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Repositorio de Código (GitHub/GitLab)</span>
                    </span>
                  }
                >
                  <Input
                    type="url"
                    value={codeRepoUrl}
                    onChange={(e) => setCodeRepoUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </FormField>

                <FormField
                  id="project-form-resources-url"
                  label={
                    <span className="flex items-center gap-1.5">
                      <FolderArchive className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Carpeta de Recursos (Drive/Dropbox)</span>
                    </span>
                  }
                >
                  <Input
                    type="url"
                    value={resourcesUrl}
                    onChange={(e) => setResourcesUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </FormField>
              </div>
            </div>

            {/* 3. SECCIÓN: SERVICIO RECURRENTE */}
            <div className="pt-3 border-t border-neutral-800/80">
              <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasRecurring}
                    onChange={(e) => setHasRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900"
                  />
                  <span className="text-xs sm:text-sm font-medium text-neutral-200">
                    Servicio Recurrente Activo (Hosting / Mantenimiento)
                  </span>
                </label>

                {hasRecurring && (
                  <div className="pt-2.5 border-t border-neutral-800/80 space-y-3">
                    <p className="text-[11px] text-neutral-400">
                      Alimentará el Radar de cobranzas preventivas a 30 días (RN-08). Permite montos con decimales.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        id="recurring-amount"
                        label={
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Monto Recurrente</span>
                          </span>
                        }
                        required
                      >
                        <Input
                          type="number"
                          step="any"
                          required={hasRecurring}
                          value={recurringAmount}
                          onChange={(e) => setRecurringAmount(e.target.value)}
                          placeholder="Ej: 50.00"
                        />
                      </FormField>

                      <FormField id="recurring-currency" label="Moneda">
                        <Input
                          value={recurringCurrency}
                          onChange={(e) => setRecurringCurrency(e.target.value)}
                          placeholder="USD"
                        />
                      </FormField>

                      <FormField id="recurring-period" label="Período">
                        <Select
                          value={recurringPeriod}
                          onChange={(e) => setRecurringPeriod(e.target.value as any)}
                        >
                          <option value="MONTHLY">Mensual</option>
                          <option value="ANNUALLY">Anual</option>
                        </Select>
                      </FormField>
                    </div>

                    <FormField
                      id="recurring-renewal-date"
                      label={
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Próxima Fecha de Renovación</span>
                        </span>
                      }
                      required
                    >
                      <Input
                        type="date"
                        required={hasRecurring}
                        value={recurringRenewalDate}
                        onChange={(e) => setRecurringRenewalDate(e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </div>

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
          setClientId(newClient.id);
        }}
      />
    </>
  );
};
