import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { budgetsApi } from '../lib/resources';
import type { BudgetWithMilestones, ProjectListItem } from '../lib/types';
import { copyToClipboard } from '../lib/utils';
import { buildBudgetSummary, calculatePresetMilestones, type BudgetPreset } from '../components/projects/budgetPresets';

/**
 * Modal de cotizaciones de un proyecto: presupuestos existentes, borrador con presets,
 * creación y aprobación. `onBudgetsChanged` refresca los totales del listado de proyectos.
 */
export function useProjectBudgets(onBudgetsChanged: () => void) {
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [projectBudgets, setProjectBudgets] = useState<BudgetWithMilestones[]>([]);
  const [budgetTitle, setBudgetTitle] = useState('Desarrollo Web Integral');
  const [budgetTotal, setBudgetTotal] = useState<number>(1000);
  const [preset, setPreset] = useState<BudgetPreset>('50-50');
  const [submittingBudget, setSubmittingBudget] = useState(false);
  const [approvingBudgetId, setApprovingBudgetId] = useState<string | null>(null);

  // Abrir modal de presupuestos
  const openBudgets = useCallback(async (project: ProjectListItem) => {
    setSelectedProject(project);
    setBudgetModalOpen(true);
    try {
      const data = await budgetsApi.listByProject(project.id);
      setProjectBudgets(data);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar presupuestos del proyecto');
    }
  }, []);

  // Generar hitos según preset con cálculo previo para feedback visual
  const calculatedMilestones = useMemo(() => calculatePresetMilestones(preset, budgetTotal), [preset, budgetTotal]);

  // Crear presupuesto
  const createBudget = async () => {
    if (!selectedProject) return;

    setSubmittingBudget(true);
    try {
      const milestonesInput = calculatedMilestones.map((m) => ({
        title: m.title,
        percentage: m.percentage,
      }));

      await budgetsApi.create(selectedProject.id, {
        title: budgetTitle.trim(),
        totalAmount: Math.round(budgetTotal),
        currency: 'USD',
        milestones: milestonesInput,
      });
      toast.success('Presupuesto guardado en borrador');
      const data = await budgetsApi.listByProject(selectedProject.id);
      setProjectBudgets(data);
      onBudgetsChanged();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear presupuesto');
    } finally {
      setSubmittingBudget(false);
    }
  };

  // Aprobación Atómica en 1 Clic
  const approveBudget = async (budgetId: string) => {
    try {
      setApprovingBudgetId(budgetId);
      await budgetsApi.approve(budgetId);
      toast.success('¡Presupuesto aprobado! El proyecto pasó a "En Progreso" y los hitos están listos para cobro.');
      if (selectedProject) {
        const data = await budgetsApi.listByProject(selectedProject.id);
        setProjectBudgets(data);
      }
      onBudgetsChanged();
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar presupuesto');
    } finally {
      setApprovingBudgetId(null);
    }
  };

  // Copiar Resumen para el Cliente
  const copyBudgetSummary = (budget: BudgetWithMilestones) => {
    copyToClipboard(buildBudgetSummary(budget, selectedProject?.title || ''), 'Resumen copiado para el cliente');
  };

  return {
    budgetModalOpen,
    setBudgetModalOpen,
    selectedProject,
    projectBudgets,
    budgetTitle,
    setBudgetTitle,
    budgetTotal,
    setBudgetTotal,
    preset,
    setPreset,
    calculatedMilestones,
    submittingBudget,
    approvingBudgetId,
    openBudgets,
    createBudget,
    approveBudget,
    copyBudgetSummary,
  };
}
