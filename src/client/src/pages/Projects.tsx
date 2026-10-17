import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { ProjectListItem as ProjectItem } from '../lib/types';
import { useProjectsData } from '../hooks/useProjectsData';
import { useProjectBudgets } from '../hooks/useProjectBudgets';
import { ProjectFormDialog, type ProjectFormData } from '../components/ProjectFormDialog';
import { ClientFormDialog } from '../components/ClientFormDialog';
import { ProjectsHeader } from '../components/projects/ProjectsHeader';
import { ProjectStatusFilters, type ProjectStatusFilter } from '../components/projects/ProjectStatusFilters';
import { ProjectList } from '../components/projects/ProjectList';
import { BudgetsDialog } from '../components/projects/BudgetsDialog';
import { BudgetHistory } from '../components/projects/BudgetHistory';
import { BudgetPresetForm } from '../components/projects/BudgetPresetForm';
import { CancelProjectDialog } from '../components/projects/CancelProjectDialog';

export const Projects: React.FC = () => {
  const {
    projects,
    clients,
    loading,
    loadProjects,
    completeProject,
    projectToCancel,
    setProjectToCancel,
    cancelling,
    confirmCancelProject,
  } = useProjectsData();
  const budgets = useProjectBudgets(loadProjects);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('ALL');

  // Modales de creación y edición de proyecto
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [emptyStateClientModalOpen, setEmptyStateClientModalOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'ALL') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const handleOpenCreateProject = () => {
    if (clients.length === 0) {
      toast.info('Primero registra un cliente para poder asociarlo al proyecto');
      setEmptyStateClientModalOpen(true);
      return;
    }
    setCreateProjectOpen(true);
  };

  const handleProjectCreated = (createdProject: ProjectFormData) => {
    toast.success('Proyecto creado en estado Prospecto', {
      action: {
        label: 'Crear cotización',
        onClick: () => budgets.openBudgets(createdProject as ProjectItem),
      },
    });
    loadProjects();
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Cabecera y Acciones Rápidas */}
      <ProjectsHeader loading={loading} onRefresh={loadProjects} onCreateProject={handleOpenCreateProject} />

      {/* Barra de Filtros por Estado */}
      <ProjectStatusFilters value={statusFilter} onChange={setStatusFilter} />

      {/* Listado de Proyectos */}
      <ProjectList
        projects={filteredProjects}
        loading={loading}
        isFiltered={statusFilter !== 'ALL'}
        onOpenBudgets={budgets.openBudgets}
        onEditProject={setEditingProject}
        onCompleteProject={completeProject}
        onSelectCancel={setProjectToCancel}
      />

      {/* Modal Crear Proyecto */}
      <ProjectFormDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        mode="create"
        clients={clients}
        onRefreshClients={loadProjects}
        onSuccess={handleProjectCreated}
      />

      {/* Modal Editar Proyecto */}
      <ProjectFormDialog
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        mode="edit"
        initial={editingProject}
        clients={clients}
        onRefreshClients={loadProjects}
        onSuccess={() => loadProjects()}
      />

      {/* Modal Cliente cuando no hay clientes registrados (Empty State) */}
      <ClientFormDialog
        open={emptyStateClientModalOpen}
        onOpenChange={setEmptyStateClientModalOpen}
        mode="create"
        onSuccess={async () => {
          await loadProjects();
          setCreateProjectOpen(true);
        }}
      />

      {/* Modal Presupuestos y Cotizaciones con Presets y Feedback Visual */}
      <BudgetsDialog
        open={budgets.budgetModalOpen}
        onOpenChange={budgets.setBudgetModalOpen}
        projectTitle={budgets.selectedProject?.title}
      >
        <BudgetHistory
          budgets={budgets.projectBudgets}
          approvingBudgetId={budgets.approvingBudgetId}
          onCopySummary={budgets.copyBudgetSummary}
          onApprove={budgets.approveBudget}
        />
        <BudgetPresetForm
          title={budgets.budgetTitle}
          total={budgets.budgetTotal}
          preset={budgets.preset}
          milestones={budgets.calculatedMilestones}
          submitting={budgets.submittingBudget}
          onTitleChange={budgets.setBudgetTitle}
          onTotalChange={budgets.setBudgetTotal}
          onPresetChange={budgets.setPreset}
          onSubmit={budgets.createBudget}
          onClose={() => budgets.setBudgetModalOpen(false)}
        />
      </BudgetsDialog>

      {/* Modal de Confirmación para Cancelar Proyecto */}
      <CancelProjectDialog
        project={projectToCancel}
        cancelling={cancelling}
        onDismiss={() => setProjectToCancel(null)}
        onConfirm={confirmCancelProject}
      />
    </div>
  );
};
