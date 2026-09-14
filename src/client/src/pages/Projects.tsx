import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ExternalLink,
  Github,
  FolderArchive,
  CheckCircle,
  XCircle,
  Copy,
  Plus,
  FileText,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatCurrency, formatDate, copyToClipboard } from '../lib/utils';
import {
  Button,
  Badge,
  BadgeStatus,
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
  Select,
} from '../components/ui';

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

  // Modal confirmación de cancelación de proyecto (evita clics accidentales)
  const [projectToCancel, setProjectToCancel] = useState<ProjectItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Modal presupuestos / cotización
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [projectBudgets, setProjectBudgets] = useState<BudgetItem[]>([]);
  const [budgetTitle, setBudgetTitle] = useState('Desarrollo Web Integral');
  const [budgetTotal, setBudgetTotal] = useState<number>(1000);
  const [preset, setPreset] = useState<'50-50' | '40-30-30' | '100'>('50-50');
  const [submittingBudget, setSubmittingBudget] = useState(false);
  const [approvingBudgetId, setApprovingBudgetId] = useState<string | null>(null);

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
    if (!newTitle.trim() || !newClientId) {
      toast.error('Completa el título y selecciona un cliente');
      return;
    }

    setSubmittingProject(true);
    try {
      await api.post('/api/projects', {
        title: newTitle.trim(),
        clientId: newClientId,
        category: newCategory,
        status: 'PROSPECT',
        resourcesUrl: newResourcesUrl.trim() || null,
      });
      toast.success('Proyecto creado en estado Prospecto');
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

  // Generar hitos según preset con cálculo previo para feedback visual
  const calculatedMilestones = useMemo(() => {
    const total = Math.max(0, Math.round(budgetTotal || 0));
    let raw: { title: string; percentage: number }[];

    if (preset === '50-50') {
      raw = [
        { title: '50% Anticipo de inicio', percentage: 50 },
        { title: '50% Entrega y lanzamiento final', percentage: 50 },
      ];
    } else if (preset === '40-30-30') {
      raw = [
        { title: '40% Anticipo inicial', percentage: 40 },
        { title: '30% Aprobación de diseño y maquetación', percentage: 30 },
        { title: '30% Entrega final y pase a producción', percentage: 30 },
      ];
    } else {
      raw = [{ title: '100% Pago único total', percentage: 100 }];
    }

    // Conciliación de montos enteros y residuo
    let sum = 0;
    const computed = raw.map((item, index) => {
      let amount = Math.round((total * item.percentage) / 100);
      if (index === raw.length - 1) {
        amount = total - sum; // El último hito absorbe la diferencia exacta
      } else {
        sum += amount;
      }
      return { ...item, amount };
    });

    return computed;
  }, [preset, budgetTotal]);

  // Crear presupuesto
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmittingBudget(true);
    try {
      const milestonesInput = calculatedMilestones.map((m) => ({
        title: m.title,
        percentage: m.percentage,
      }));

      await api.post(`/api/projects/${selectedProject.id}/budgets`, {
        title: budgetTitle.trim(),
        totalAmount: Math.round(budgetTotal),
        currency: 'USD',
        milestones: milestonesInput,
      });
      toast.success('Presupuesto guardado en borrador');
      const data = await api.get<BudgetItem[]>(`/api/projects/${selectedProject.id}/budgets`);
      setProjectBudgets(data);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear presupuesto');
    } finally {
      setSubmittingBudget(false);
    }
  };

  // Aprobación Atómica en 1 Clic
  const handleApproveBudget = async (budgetId: string) => {
    try {
      setApprovingBudgetId(budgetId);
      await api.post(`/api/budgets/${budgetId}/approve`);
      toast.success('¡Presupuesto aprobado! El proyecto pasó a "En Progreso" y los hitos están listos para cobro.');
      if (selectedProject) {
        const data = await api.get<BudgetItem[]>(`/api/projects/${selectedProject.id}/budgets`);
        setProjectBudgets(data);
      }
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar presupuesto');
    } finally {
      setApprovingBudgetId(null);
    }
  };

  // Copiar Resumen para el Cliente
  const handleCopyBudgetSummary = (b: BudgetItem) => {
    const lines = [
      `*Cotización: ${b.title}*`,
      `Proyecto: ${selectedProject?.title || ''}`,
      `Total: ${formatCurrency(b.totalAmount, b.currency)}`,
      '',
      '*Distribución de pagos acordada:*',
    ];

    if (b.milestones && b.milestones.length > 0) {
      for (const m of b.milestones) {
        lines.push(`• ${m.title} (${m.percentage}%): ${formatCurrency(m.amount, b.currency)}`);
      }
    }

    lines.push('');
    lines.push('¡Quedamos a tu disposición para dar inicio!');
    copyToClipboard(lines.join('\n'), 'Resumen copiado para el cliente');
  };

  // Marcar como Completado
  const handleCompleteProject = async (projectId: string) => {
    try {
      await api.put(`/api/projects/${projectId}`, { status: 'COMPLETED' });
      toast.success('Proyecto marcado como completado');
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al completar proyecto');
    }
  };

  // Confirmar Cancelación del Proyecto (No destructiva, preserva pagos cobrados)
  const handleConfirmCancelProject = async () => {
    if (!projectToCancel) return;

    setCancelling(true);
    try {
      await api.put(`/api/projects/${projectToCancel.id}`, { status: 'CANCELLED' });
      toast.success('Proyecto cancelado. Los pagos previos se mantuvieron intactos.');
      setProjectToCancel(null);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar proyecto');
    } finally {
      setCancelling(false);
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
            Trilogía de enlaces operativos, cotizador con presets automáticos y aprobación inmediata
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadProjects}
            disabled={loading}
            aria-label="Actualizar proyectos"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            touchFriendly
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Nuevo Proyecto</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros por Estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Filtros por estado">
        {[
          { id: 'ALL', label: 'Todos' },
          { id: 'PROSPECT', label: 'Prospectos' },
          { id: 'IN_PROGRESS', label: 'En Progreso' },
          { id: 'COMPLETED', label: 'Completados' },
          { id: 'CANCELLED', label: 'Cancelados' },
        ].map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setStatusFilter(st.id)}
            className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
              statusFilter === st.id
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Listado de Proyectos */}
      {filteredProjects.length === 0 && !loading ? (
        <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-12 text-center">
          <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-300 font-medium">No se encontraron proyectos</p>
          <p className="text-xs text-neutral-500 mt-1">
            {statusFilter === 'ALL'
              ? 'Comienza registrando tu primer proyecto con el botón superior.'
              : 'No hay proyectos en la categoría seleccionada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const isCancelled = p.status === 'CANCELLED';

            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between transition-colors ${
                  isCancelled
                    ? 'bg-neutral-950/40 border-neutral-900 opacity-60'
                    : 'hover:border-neutral-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Categoría y Estado */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {p.category}
                    </span>
                    <Badge status={p.status as BadgeStatus} />
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
                    <span className="text-xs text-neutral-400">
                      {p.client?.name || 'Cliente sin nombre'}
                    </span>
                  </div>

                  {/* Resumen Financiero del Proyecto */}
                  <CardPanel className="space-y-1">
                    <div className="flex justify-between text-neutral-400">
                      <span>Cobrado:</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(p.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Pendiente:</span>
                      <span className="text-amber-400 font-semibold">
                        {formatCurrency(p.totalPending)}
                      </span>
                    </div>
                  </CardPanel>

                  {/* Trilogía de Enlaces Operativos */}
                  <div className="flex items-center gap-2 pt-1">
                    {p.productionUrl ? (
                      <a
                        href={p.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Sitio en producción de ${p.title}`}
                        title="Web en Producción"
                        className="p-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span
                        title="Sin web en producción"
                        className="p-2 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {p.codeRepoUrl ? (
                      <a
                        href={p.codeRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Repositorio de código de ${p.title}`}
                        title="Repositorio de Código (GitHub/GitLab)"
                        className="p-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span
                        title="Sin repositorio registrado"
                        className="p-2 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {p.resourcesUrl ? (
                      <a
                        href={p.resourcesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Recursos compartidos de ${p.title}`}
                        title="Carpeta de Recursos (Drive/Dropbox)"
                        className="p-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span
                        title="Sin carpeta de recursos"
                        className="p-2 rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones del Proyecto */}
                <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    touchFriendly
                    onClick={() => handleOpenBudgets(p)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    <span>Cotizaciones</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {!isCancelled && p.status !== 'COMPLETED' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCompleteProject(p.id)}
                        aria-label={`Completar proyecto ${p.title}`}
                        title="Marcar proyecto como terminado"
                        className="text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/80 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}

                    {!isCancelled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setProjectToCancel(p)}
                        aria-label={`Cancelar proyecto ${p.title}`}
                        title="Cancelar proyecto (mantiene pagos cobrados)"
                        className="text-neutral-400 hover:text-rose-400 hover:bg-neutral-800/80 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear Proyecto */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
            <DialogDescription>
              Asocia el proyecto a un cliente para habilitar presupuestos y control operativo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-3.5">
            <FormField id="project-title" label="Nombre del Proyecto" required>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Rediseño Web Corporativa"
                autoFocus
              />
            </FormField>

            <FormField id="project-client" label="Cliente Asociado" required>
              <Select
                required
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="project-category" label="Categoría del Proyecto">
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
              >
                <option value="LANDING">Landing Page</option>
                <option value="ECOMMERCE">E-commerce</option>
                <option value="CORPORATE">Web Corporativa</option>
                <option value="WEBAPP">Aplicación Web</option>
              </Select>
            </FormField>

            <FormField
              id="project-resources"
              label="Carpeta de Recursos (Drive / Dropbox opcional)"
            >
              <Input
                type="url"
                value={newResourcesUrl}
                onChange={(e) => setNewResourcesUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateProjectOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submittingProject}
              >
                Crear Proyecto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Presupuestos y Cotizaciones con Presets y Feedback Visual */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cotizaciones — {selectedProject?.title}</DialogTitle>
            <DialogDescription>
              Crea presupuestos con presets automáticos y apruébalos con un solo clic.
            </DialogDescription>
          </DialogHeader>

          {/* Presupuestos Existentes */}
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Historial de Presupuestos
            </h4>

            {projectBudgets.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-lg bg-neutral-950/40 border border-neutral-850">
                No hay presupuestos creados aún para este proyecto.
              </p>
            ) : (
              <div className="space-y-3">
                {projectBudgets.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-neutral-100">{b.title}</span>
                        <span className="text-xs text-neutral-400 font-mono ml-2">
                          {formatCurrency(b.totalAmount, b.currency)}
                        </span>
                      </div>
                      <Badge status={b.status as BadgeStatus} />
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
                              <span className="text-neutral-200 font-semibold">
                                {formatCurrency(m.amount, b.currency)}
                              </span>
                              <Badge status={m.status as BadgeStatus} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botones de acción del presupuesto */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyBudgetSummary(b)}
                        className="text-xs text-neutral-300 hover:text-neutral-100"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                        <span>Copiar resumen para el cliente</span>
                      </Button>

                      {b.status === 'DRAFT' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          isLoading={approvingBudgetId === b.id}
                          onClick={() => handleApproveBudget(b.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Aprobar Presupuesto</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario Nueva Cotización con Presets */}
          <div className="border-t border-neutral-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-neutral-300" />
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Nueva Cotización con Presets
              </h4>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="budget-title" label="Concepto de la Cotización" required>
                  <Input
                    required
                    value={budgetTitle}
                    onChange={(e) => setBudgetTitle(e.target.value)}
                  />
                </FormField>

                <FormField id="budget-amount" label="Monto Total Entero (USD)" required>
                  <Input
                    type="number"
                    required
                    step="1"
                    min="1"
                    value={budgetTotal}
                    onChange={(e) => setBudgetTotal(Number(e.target.value))}
                    className="font-mono"
                  />
                </FormField>
              </div>

              {/* Presets Rápidos */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Distribución predefinida de hitos (Garantiza 100% exacto)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreset('50-50')}
                    className={`p-3 rounded-lg border text-xs font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                      preset === '50-50'
                        ? 'bg-neutral-800 text-neutral-100 border-neutral-500 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block font-bold text-sm text-neutral-100">50 / 50</span>
                    <span className="text-[11px] text-neutral-400">Anticipo + Entrega</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('40-30-30')}
                    className={`p-3 rounded-lg border text-xs font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                      preset === '40-30-30'
                        ? 'bg-neutral-800 text-neutral-100 border-neutral-500 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block font-bold text-sm text-neutral-100">40 / 30 / 30</span>
                    <span className="text-[11px] text-neutral-400">3 Hitos de Avance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('100')}
                    className={`p-3 rounded-lg border text-xs font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                      preset === '100'
                        ? 'bg-neutral-800 text-neutral-100 border-neutral-500 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block font-bold text-sm text-neutral-100">100%</span>
                    <span className="text-[11px] text-neutral-400">Pago Único</span>
                  </button>
                </div>
              </div>

              {/* Vista Previa de Hitos Calculados con Conciliación de Residuos */}
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Vista previa de hitos calculados:</span>
                  <span className="text-neutral-200 font-semibold">
                    Total: {formatCurrency(budgetTotal)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {calculatedMilestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-mono bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-850"
                    >
                      <span className="text-neutral-300">
                        {m.title} ({m.percentage}%)
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBudgetModalOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingBudget}
                >
                  Guardar Cotización en Borrador
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Cancelar Proyecto (Evita Cancelaciones Accidentales) */}
      <Dialog
        open={Boolean(projectToCancel)}
        onOpenChange={(open) => {
          if (!open) setProjectToCancel(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle>Cancelar Proyecto</DialogTitle>
            </div>
            <DialogDescription>
              {projectToCancel && (
                <span>
                  ¿Estás seguro de que deseas cancelar el proyecto{' '}
                  <strong className="text-neutral-100">{projectToCancel.title}</strong>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-850 text-xs text-neutral-400 space-y-2">
            <p className="text-neutral-300 font-medium">Consecuencias de la cancelación:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400">
              <li>Todos los hitos de cobro en estado pendiente se cancelarán.</li>
              <li>
                Los pagos cobrados previamente (<strong className="text-emerald-400">
                  {formatCurrency(projectToCancel?.totalPaid || 0)}
                </strong>) se conservarán intactos en el historial.
              </li>
              <li>El proyecto se marcará como cancelado y no se mostrará en el Showcase.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProjectToCancel(null)}
            >
              Mantener Proyecto
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={cancelling}
              onClick={handleConfirmCancelProject}
            >
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
