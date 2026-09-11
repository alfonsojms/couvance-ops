import React, { useEffect, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  FolderPlus,
  ExternalLink,
  Github,
  FolderArchive,
  CheckCircle,
  XCircle,
  Copy,
  Plus,
  X,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency, formatDate, copyToClipboard } from '../lib/utils';

interface ClientItem {
  id: string;
  name: string;
}

interface MilestoneItem {
  id: string;
  budgetId: string;
  title: string;
  percentage: number;
  amount: number;
  dueDate?: string | null;
  status: string;
  paidAt?: string | null;
}

interface BudgetItem {
  id: string;
  projectId: string;
  title: string;
  totalAmount: number;
  currency: string;
  status: string;
  milestones?: MilestoneItem[];
}

interface ProjectItem {
  id: string;
  clientId: string;
  title: string;
  category: 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP';
  status: 'PROSPECT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  productionUrl?: string | null;
  productionStatus: 'ACTIVE' | 'INACTIVE';
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring: number;
  recurringAmount?: number | null;
  recurringCurrency: string;
  recurringPeriod: 'MONTHLY' | 'ANNUALLY';
  recurringRenewalDate?: string | null;
  client?: ClientItem | null;
  totalBudgeted: number;
  totalPaid: number;
  totalPending: number;
}

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal nuevo proyecto
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCategory, setNewCategory] = useState<'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP'>('LANDING');
  const [newResourcesUrl, setNewResourcesUrl] = useState('');
  const [submittingProject, setSubmittingProject] = useState(false);

  // Modal presupuestos / cotización
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [projectBudgets, setProjectBudgets] = useState<BudgetItem[]>([]);
  const [budgetTitle, setBudgetTitle] = useState('Desarrollo Web Integral');
  const [budgetTotal, setBudgetTotal] = useState<number>(1000);
  const [preset, setPreset] = useState<'50-50' | '40-30-30' | '100'>('50-50');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const [projData, clientData] = await Promise.all([
        api.get<ProjectItem[]>('/api/projects'),
        api.get<ClientItem[]>('/api/clients'),
      ]);
      setProjects(projData);
      setClients(clientData);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  // Crear nuevo proyecto
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newClientId) {
      toast.error('Complete el título y seleccione un cliente');
      return;
    }

    setSubmittingProject(true);
    try {
      await api.post('/api/projects', {
        title: newTitle,
        clientId: newClientId,
        category: newCategory,
        status: 'PROSPECT',
        resourcesUrl: newResourcesUrl || null,
      });
      toast.success('Proyecto creado en estado Prospecto.');
      setCreateProjectOpen(false);
      setNewTitle('');
      setNewResourcesUrl('');
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear proyecto');
    } finally {
      setSubmittingProject(false);
    }
  };

  // Abrir modal de presupuestos
  const handleOpenBudgets = async (project: ProjectItem) => {
    setSelectedProject(project);
    setBudgetModalOpen(true);
    try {
      const data = await api.get<BudgetItem[]>(`/api/projects/${project.id}/budgets`);
      setProjectBudgets(data);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar presupuestos del proyecto');
    }
  };

  // Generar hitos según preset
  const getPresetMilestones = () => {
    if (preset === '50-50') {
      return [
        { title: '50% Anticipo de inicio', percentage: 50 },
        { title: '50% Entrega y lanzamiento final', percentage: 50 },
      ];
    }
    if (preset === '40-30-30') {
      return [
        { title: '40% Anticipo inicial', percentage: 40 },
        { title: '30% Aprobación de diseño y maquetación', percentage: 30 },
        { title: '30% Entrega final y pase a producción', percentage: 30 },
      ];
    }
    return [{ title: '100% Pago único total', percentage: 100 }];
  };

  // Crear presupuesto
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const milestonesInput = getPresetMilestones();
      await api.post(`/api/projects/${selectedProject.id}/budgets`, {
        title: budgetTitle,
        totalAmount: Math.round(budgetTotal),
        currency: 'USD',
        milestones: milestonesInput,
      });
      toast.success('Presupuesto creado en estado Borrador.');
      const data = await api.get<BudgetItem[]>(`/api/projects/${selectedProject.id}/budgets`);
      setProjectBudgets(data);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear presupuesto');
    }
  };

  // Aprobación Atómica en 1 Clic (RN-03)
  const handleApproveBudget = async (budgetId: string) => {
    try {
      await api.post(`/api/budgets/${budgetId}/approve`);
      toast.success('¡Presupuesto Aprobado! Proyecto en Progreso e hitos programados.');
      if (selectedProject) {
        const data = await api.get<BudgetItem[]>(`/api/projects/${selectedProject.id}/budgets`);
        setProjectBudgets(data);
      }
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar presupuesto');
    }
  };

  // Copiar Resumen para Chat (RF-3.4 / RN-09)
  const handleCopyBudgetSummary = (b: BudgetItem) => {
    const lines = [
      `*Cotización: ${b.title}*`,
      `Proyecto: ${selectedProject?.title || ''}`,
      `Total: ${formatCurrency(b.totalAmount, b.currency)}`,
      '',
      '*Desglose de pagos acordado:*',
    ];

    if (b.milestones && b.milestones.length > 0) {
      for (const m of b.milestones) {
        lines.push(`• ${m.title} (${m.percentage}%): ${formatCurrency(m.amount, b.currency)}`);
      }
    }

    lines.push('');
    lines.push('¡Quedamos a tu disposición para iniciar!');
    copyToClipboard(lines.join('\n'), 'Resumen copiado para WhatsApp');
  };

  // Cambiar estado a Cancelado (RN-05) o Completado
  const handleUpdateStatus = async (projectId: string, newStatus: ProjectItem['status']) => {
    try {
      await api.put(`/api/projects/${projectId}`, { status: newStatus });
      toast.success(`Estado actualizado a ${newStatus}`);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Control de Proyectos & Cotizaciones
          </h1>
          <p className="text-xs text-neutral-400">
            Trilogía de enlaces, esquemas de cobro 50/50 o 40/30/30 y aprobación atómica en 1 clic
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateProjectOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros por Estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['ALL', 'PROSPECT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all select-none ${
              statusFilter === st
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            {st === 'ALL' ? 'Todos' : st}
          </button>
        ))}
      </div>

      {/* Listado de Proyectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((p) => {
          const isCancelled = p.status === 'CANCELLED';

          return (
            <div
              key={p.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isCancelled
                  ? 'bg-neutral-950/50 border-neutral-900 opacity-60'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="space-y-3">
                {/* Categoría y Estado */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {p.category}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                      p.status === 'IN_PROGRESS'
                        ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                        : p.status === 'COMPLETED'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : p.status === 'CANCELLED'
                        ? 'bg-neutral-900 text-neutral-400 border-neutral-800 line-through'
                        : 'bg-amber-950/60 text-amber-300 border-amber-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Título y Cliente */}
                <div>
                  <h3
                    className={`font-semibold text-sm text-neutral-100 ${
                      isCancelled ? 'line-through text-neutral-400' : ''
                    }`}
                  >
                    {p.title}
                  </h3>
                  <span className="text-xs text-neutral-400">{p.client?.name || 'Cliente'}</span>
                </div>

                {/* Resumen Financiero del Proyecto */}
                <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-850 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Cobrado:</span>
                    <span className="text-emerald-400">{formatCurrency(p.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Pendiente:</span>
                    <span className="text-amber-400">{formatCurrency(p.totalPending)}</span>
                  </div>
                </div>

                {/* Trilogía de Enlaces Operativos */}
                <div className="flex items-center gap-2 pt-1">
                  {p.productionUrl ? (
                    <a
                      href={p.productionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Web en Producción"
                      className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span
                      title="Sin web en producción"
                      className="p-1.5 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {p.codeRepoUrl ? (
                    <a
                      href={p.codeRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Repositorio de Código (GitHub/GitLab)"
                      className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span
                      title="Sin repositorio registrado"
                      className="p-1.5 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {p.resourcesUrl ? (
                    <a
                      href={p.resourcesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Carpeta de Recursos (Drive/Dropbox)"
                      className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      <FolderArchive className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span
                      title="Sin carpeta de recursos"
                      className="p-1.5 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                    >
                      <FolderArchive className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleOpenBudgets(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 active:scale-95 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Cotizaciones</span>
                </button>

                {!isCancelled && p.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(p.id, 'COMPLETED')}
                    title="Marcar proyecto como terminado"
                    className="p-1.5 rounded-md text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}

                {!isCancelled && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(p.id, 'CANCELLED')}
                    title="Cancelar proyecto (conserva pagos históricos - RN-05)"
                    className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Crear Proyecto */}
      <Dialog.Root open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl z-50 focus:outline-none">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-sm font-semibold text-neutral-100">
                Crear Nuevo Proyecto
              </Dialog.Title>
              <Dialog.Close className="p-1 text-neutral-400 hover:text-neutral-100">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Rediseño Web Corporativa"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Cliente Asociado
                </label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Categoría
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                >
                  <option value="LANDING">Landing Page</option>
                  <option value="ECOMMERCE">E-commerce</option>
                  <option value="CORPORATE">Corporativa</option>
                  <option value="WEBAPP">Web App</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Carpeta de Recursos (Drive / Dropbox opcional)
                </label>
                <input
                  type="url"
                  value={newResourcesUrl}
                  onChange={(e) => setNewResourcesUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateProjectOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProject}
                  className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 transition-all disabled:opacity-50"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal Presupuestos y Cotizaciones */}
      <Dialog.Root open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto focus:outline-none">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <div>
                <Dialog.Title className="text-sm font-semibold text-neutral-100">
                  Cotizaciones — {selectedProject?.title}
                </Dialog.Title>
                <p className="text-xs text-neutral-400">
                  Crea presupuestos con presets automáticos y apruébalos en 1 clic
                </p>
              </div>
              <Dialog.Close className="p-1 text-neutral-400 hover:text-neutral-100">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            {/* Presupuestos Existentes */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Historial de Presupuestos
              </h4>

              {projectBudgets.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No hay presupuestos creados aún.</p>
              ) : (
                <div className="space-y-3">
                  {projectBudgets.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-neutral-100">{b.title}</span>
                          <span className="text-xs text-neutral-400 font-mono ml-2">
                            {formatCurrency(b.totalAmount, b.currency)}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${
                            b.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-neutral-850 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      {/* Hitos */}
                      {b.milestones && b.milestones.length > 0 && (
                        <div className="space-y-1.5 text-xs font-mono">
                          {b.milestones.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded border border-neutral-850"
                            >
                              <span>
                                {m.title} ({m.percentage}%)
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-200">
                                  {formatCurrency(m.amount, b.currency)}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    m.status === 'PAID'
                                      ? 'text-emerald-400 bg-emerald-950/40'
                                      : 'text-amber-400 bg-amber-950/40'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botones de acción */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => handleCopyBudgetSummary(b)}
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-neutral-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Resumen para Chat</span>
                        </button>

                        {b.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleApproveBudget(b.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 text-xs font-medium active:scale-95 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aprobar Presupuesto (1 Clic)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario Nueva Cotización con Presets */}
            <div className="border-t border-neutral-800 pt-4">
              <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
                Crear Nueva Cotización con Presets
              </h4>

              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Concepto o Título
                    </label>
                    <input
                      type="text"
                      required
                      value={budgetTitle}
                      onChange={(e) => setBudgetTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Monto Total Entero (USD)
                    </label>
                    <input
                      type="number"
                      required
                      step="1"
                      min="1"
                      value={budgetTotal}
                      onChange={(e) => setBudgetTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                {/* Presets Rápidos */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Esquema de Cobro Predefinido (Garantiza 100% - RN-01 / RN-02)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreset('50-50')}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        preset === '50-50'
                          ? 'bg-neutral-800 text-neutral-100 border-neutral-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span className="block font-bold">50 / 50</span>
                      <span className="text-[11px] text-neutral-500">Anticipo + Entrega</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreset('40-30-30')}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        preset === '40-30-30'
                          ? 'bg-neutral-800 text-neutral-100 border-neutral-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span className="block font-bold">40 / 30 / 30</span>
                      <span className="text-[11px] text-neutral-500">3 Hitos de Avance</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreset('100')}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        preset === '100'
                          ? 'bg-neutral-800 text-neutral-100 border-neutral-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span className="block font-bold">100%</span>
                      <span className="text-[11px] text-neutral-500">Pago Único</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-95 transition-all"
                  >
                    Guardar Cotización en Borrador
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
