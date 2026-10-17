import type {
  ClientRef,
  ProductionStatus,
  ProjectCategory,
  ProjectCreateInput,
  ProjectFormData,
  ProjectPatch,
  RecurringPeriod,
} from '../../lib/types';

/** Valores editables del formulario de proyecto (los montos y fechas viajan como texto). */
export interface ProjectFormValues {
  title: string;
  clientId: string;
  category: ProjectCategory;
  productionUrl: string;
  productionStatus: ProductionStatus;
  codeRepoUrl: string;
  resourcesUrl: string;
  hasRecurring: boolean;
  recurringAmount: string;
  recurringCurrency: string;
  recurringPeriod: RecurringPeriod;
  recurringRenewalDate: string;
}

export type ProjectFormFieldSetter = <K extends keyof ProjectFormValues>(
  key: K,
  value: ProjectFormValues[K]
) => void;

/** Valores iniciales en modo creación: preselecciona el primer cliente si existe. */
export function emptyProjectFormValues(clients: ClientRef[]): ProjectFormValues {
  return {
    title: '',
    clientId: clients.length > 0 ? clients[0].id : '',
    category: 'LANDING',
    productionUrl: '',
    productionStatus: 'ACTIVE',
    codeRepoUrl: '',
    resourcesUrl: '',
    hasRecurring: false,
    recurringAmount: '',
    recurringCurrency: 'USD',
    recurringPeriod: 'ANNUALLY',
    recurringRenewalDate: '',
  };
}

/** Valores precargados en modo edición a partir del proyecto existente. */
export function projectFormValuesFrom(initial: ProjectFormData): ProjectFormValues {
  return {
    title: initial.title || '',
    clientId: initial.clientId || '',
    category: initial.category || 'LANDING',
    productionUrl: initial.productionUrl || '',
    productionStatus: initial.productionStatus || 'ACTIVE',
    codeRepoUrl: initial.codeRepoUrl || '',
    resourcesUrl: initial.resourcesUrl || '',
    hasRecurring: initial.hasRecurring === 1,
    recurringAmount:
      initial.recurringAmount !== undefined && initial.recurringAmount !== null
        ? String(initial.recurringAmount)
        : '',
    recurringCurrency: initial.recurringCurrency || 'USD',
    recurringPeriod: initial.recurringPeriod || 'ANNUALLY',
    recurringRenewalDate: initial.recurringRenewalDate || '',
  };
}

/** Devuelve el mensaje de error de validación, o `null` si el formulario es válido. */
export function validateProjectForm(values: ProjectFormValues, mode: 'create' | 'edit'): string | null {
  if (!values.title.trim()) {
    return 'El nombre del proyecto es obligatorio';
  }

  if (mode === 'create' && !values.clientId) {
    return 'Selecciona un cliente para el proyecto';
  }

  if (values.hasRecurring) {
    const numAmount = parseFloat(values.recurringAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'El monto recurrente es obligatorio cuando la recurrencia está activa';
    }
    if (!values.recurringRenewalDate || values.recurringRenewalDate.trim() === '') {
      return 'La fecha de renovación es obligatoria cuando la recurrencia está activa';
    }
  }

  return null;
}

/** Cuerpo de `POST /api/projects`: todo proyecto nuevo nace como Prospecto. */
export function buildProjectCreateInput(values: ProjectFormValues): ProjectCreateInput {
  const { hasRecurring, recurringAmount, recurringRenewalDate } = values;
  return {
    title: values.title.trim(),
    clientId: values.clientId,
    category: values.category,
    status: 'PROSPECT',
    productionUrl: values.productionUrl.trim() || null,
    productionStatus: values.productionStatus,
    codeRepoUrl: values.codeRepoUrl.trim() || null,
    resourcesUrl: values.resourcesUrl.trim() || null,
    hasRecurring: hasRecurring ? 1 : 0,
    recurringAmount: hasRecurring && recurringAmount ? parseFloat(recurringAmount) : null,
    recurringCurrency: values.recurringCurrency.trim() || 'USD',
    recurringPeriod: values.recurringPeriod,
    recurringRenewalDate: hasRecurring && recurringRenewalDate ? recurringRenewalDate : null,
  };
}

/** Cuerpo de `PATCH /api/projects/:id`: únicamente los campos modificados (diff contra `initial`). */
export function buildProjectPatch(values: ProjectFormValues, initial: ProjectFormData): ProjectPatch {
  const diff: ProjectPatch = {};

  if (values.title.trim() !== (initial.title || '')) {
    diff.title = values.title.trim();
  }
  if (values.category !== initial.category) {
    diff.category = values.category;
  }

  const cleanProdUrl = values.productionUrl.trim() || null;
  if (cleanProdUrl !== (initial.productionUrl || null)) {
    diff.productionUrl = cleanProdUrl;
  }

  if (values.productionStatus !== (initial.productionStatus || 'ACTIVE')) {
    diff.productionStatus = values.productionStatus;
  }

  const cleanRepoUrl = values.codeRepoUrl.trim() || null;
  if (cleanRepoUrl !== (initial.codeRepoUrl || null)) {
    diff.codeRepoUrl = cleanRepoUrl;
  }

  const cleanResUrl = values.resourcesUrl.trim() || null;
  if (cleanResUrl !== (initial.resourcesUrl || null)) {
    diff.resourcesUrl = cleanResUrl;
  }

  const newHasRecurring = values.hasRecurring ? 1 : 0;
  const initialHasRecurring = initial.hasRecurring === 1 ? 1 : 0;

  if (newHasRecurring !== initialHasRecurring) {
    diff.hasRecurring = newHasRecurring;
  }

  if (values.hasRecurring) {
    const numAmount = values.recurringAmount !== '' ? parseFloat(values.recurringAmount) : null;
    if (numAmount !== (initial.recurringAmount ?? null)) {
      diff.recurringAmount = numAmount;
    }

    const cleanCurrency = values.recurringCurrency.trim() || 'USD';
    if (cleanCurrency !== (initial.recurringCurrency || 'USD')) {
      diff.recurringCurrency = cleanCurrency;
    }

    if (values.recurringPeriod !== (initial.recurringPeriod || 'ANNUALLY')) {
      diff.recurringPeriod = values.recurringPeriod;
    }

    const cleanDate = values.recurringRenewalDate.trim() || null;
    if (cleanDate !== (initial.recurringRenewalDate || null)) {
      diff.recurringRenewalDate = cleanDate;
    }
  }

  return diff;
}
