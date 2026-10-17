// Tipos compartidos de la API HTTP: lo que el servidor responde y los cuerpos que la SPA envía.
// Reflejan los cuerpos reales fijados en test/__snapshots__/api-contract.test.ts.snap.

export type ProjectCategory = 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP';
export type ProjectStatus = 'PROSPECT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProductionStatus = 'ACTIVE' | 'INACTIVE';
export type RecurringPeriod = 'MONTHLY' | 'ANNUALLY';
export type BudgetStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type MilestoneStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

/** Respuesta genérica de las acciones sin recurso de vuelta. */
export interface OkMessage {
  ok: boolean;
  message: string;
}

// ── Clientes ────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila de `GET /api/clients`: el cliente con sus totales agregados. */
export interface ClientWithTotals extends Client {
  projectsCount: number;
  totalPaid: number;
  totalPending: number;
}

/** Referencia mínima a un cliente (selectores y proyectos). */
export interface ClientRef {
  id: string;
  name: string;
}

export interface ClientInput {
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

// ── Proyectos ───────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  clientId: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  productionUrl?: string | null;
  productionStatus: ProductionStatus;
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring: number;
  recurringAmount?: number | null;
  recurringCurrency: string;
  recurringPeriod: RecurringPeriod;
  recurringRenewalDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila de `GET /api/projects`: el proyecto con su cliente y totales. */
export interface ProjectListItem extends Project {
  client?: Client | null;
  totalBudgeted: number;
  totalPaid: number;
  totalPending: number;
}

/** Proyecto que recibe y devuelve el formulario: detalle o fila del listado, con los extras opcionales. */
export interface ProjectFormData {
  id?: string;
  clientId: string;
  title: string;
  category: ProjectCategory;
  status?: ProjectStatus;
  productionUrl?: string | null;
  productionStatus?: ProductionStatus;
  codeRepoUrl?: string | null;
  resourcesUrl?: string | null;
  hasRecurring?: number;
  recurringAmount?: number | null;
  recurringCurrency?: string;
  recurringPeriod?: RecurringPeriod;
  recurringRenewalDate?: string | null;
  client?: ClientRef | null;
  totalBudgeted?: number;
  totalPaid?: number;
  totalPending?: number;
}

export interface ProjectCreateInput {
  title: string;
  clientId: string;
  category: ProjectCategory;
  status: ProjectStatus;
  productionUrl: string | null;
  productionStatus: ProductionStatus;
  codeRepoUrl: string | null;
  resourcesUrl: string | null;
  hasRecurring: number;
  recurringAmount: number | null;
  recurringCurrency: string;
  recurringPeriod: RecurringPeriod;
  recurringRenewalDate: string | null;
}

/** Cuerpo de `PATCH /api/projects/:id`: solo los campos modificados (sin `clientId` ni `status`). */
export type ProjectPatch = Partial<Omit<ProjectCreateInput, 'clientId' | 'status'>>;

export interface RenewResult extends OkMessage {
  nextRenewalDate: string;
}

// ── Presupuestos e hitos ────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  budgetId: string;
  title: string;
  percentage: number;
  amount: number;
  dueDate?: string | null;
  status: MilestoneStatus;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  projectId: string;
  title: string;
  totalAmount: number;
  currency: string;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithMilestones extends Budget {
  milestones: Milestone[];
}

export interface BudgetCreateInput {
  title: string;
  totalAmount: number;
  currency: string;
  milestones: { title: string; percentage: number; dueDate?: string | null }[];
}

export interface BudgetApproveResult extends OkMessage {
  budget: Budget;
  milestones: Milestone[];
}

export interface PayAllResult extends OkMessage {
  milestones: Milestone[];
}

// ── Finanzas ────────────────────────────────────────────────────────────────

/** Hito pendiente del Radar (`GET /api/finance/radar`). */
export interface PendingMilestone {
  id: string;
  budgetId: string;
  projectId: string;
  milestoneTitle: string;
  amount: number;
  percentage: number;
  currency: string;
  dueDate?: string | null;
  status: string;
  clientName: string;
  clientPhone?: string | null;
  projectTitle: string;
}

export interface RecurringAlert {
  projectId: string;
  projectTitle: string;
  clientName: string;
  clientPhone?: string | null;
  recurringAmount?: number | null;
  recurringCurrency: string;
  recurringPeriod: string;
  recurringRenewalDate: string;
  daysRemaining: number;
  isOverdue: boolean;
}

export interface Radar {
  pendingMilestones: PendingMilestone[];
  recurringAlerts: RecurringAlert[];
}

export interface FinancialMetrics {
  totalInTheStreet: number;
  totalCollected: number;
  activeProjectsCount: number;
  totalProjectsCount: number;
  totalPending: number;
  monthlyRecurring: number;
  annuallyRecurring: number;
  totalActiveRecurring: number;
  activeRecurringCount: number;
}

/** Hito cobrado del historial (`GET /api/finance/history`). */
export interface PaidMilestone {
  id: string;
  budgetId: string;
  milestoneTitle: string;
  amount: number;
  percentage: number;
  currency: string;
  paidAt: string;
  dueDate?: string | null;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
}

export interface PaymentHistory {
  history: PaidMilestone[];
  totalCollected: number;
  totalCount: number;
}

// ── Showcase ────────────────────────────────────────────────────────────────

/** Proyecto publicable (RN-07): siempre trae `productionUrl` no vacío. */
export interface ShowcaseProject extends Omit<Project, 'productionUrl'> {
  productionUrl: string;
  clientName: string;
}

// ── Autenticación ───────────────────────────────────────────────────────────

export interface AuthStatus {
  authenticated: boolean;
}

export interface SecurityQuestions {
  q1: string;
  q2: string;
}

export interface SecuritySettings extends SecurityQuestions {
  updatedAt: string;
}

export interface RecoverResult extends OkMessage {
  resetToken: string;
}

export interface UpdateQuestionsInput {
  currentPin: string;
  q1: string;
  a1: string;
  q2: string;
  a2: string;
}
