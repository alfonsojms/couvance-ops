import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 1. Configuración de Acceso y Recuperación (Registro único con id = 1)
export const authConfig = sqliteTable('auth_config', {
  id: integer('id').primaryKey(),
  pinHash: text('pin_hash').notNull(),
  q1: text('q1').notNull(),
  a1Hash: text('a1_hash').notNull(),
  q2: text('q2').notNull(),
  a2Hash: text('a2_hash').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Directorio de Clientes
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 3. Proyectos
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP'
  status: text('status').notNull(), // 'PROSPECT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  productionUrl: text('production_url'),
  productionStatus: text('production_status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE'
  codeRepoUrl: text('code_repo_url'),
  resourcesUrl: text('resources_url'),
  hasRecurring: integer('has_recurring').notNull().default(0), // 0 | 1
  recurringAmount: real('recurring_amount'),
  recurringCurrency: text('recurring_currency').notNull().default('USD'),
  recurringPeriod: text('recurring_period').notNull().default('ANNUALLY'), // 'MONTHLY' | 'ANNUALLY'
  recurringRenewalDate: text('recurring_renewal_date'), // YYYY-MM-DD
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 4. Presupuestos (Montos enteros estrictos)
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  totalAmount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('DRAFT'), // 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 5. Hitos de Cobro (Montos enteros estrictos)
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id')
    .notNull()
    .references(() => budgets.id),
  title: text('title').notNull(),
  percentage: integer('percentage').notNull(),
  amount: integer('amount').notNull(),
  dueDate: text('due_date'), // YYYY-MM-DD
  status: text('status').notNull().default('DRAFT'), // 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED'
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Relaciones Drizzle
export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  budgets: many(budgets),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  project: one(projects, {
    fields: [budgets.projectId],
    references: [projects.id],
  }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  budget: one(budgets, {
    fields: [milestones.budgetId],
    references: [budgets.id],
  }),
}));
