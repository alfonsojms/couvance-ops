import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { budgets, clients, milestones, projects, type AppDatabase } from '../src/server/db';
import { createBudgetsRepository, type BudgetRow, type MilestoneRow } from '../src/server/modules/budgets/repository';
import { createTestDatabase, TEST_DRIVERS } from './helpers/db';

/**
 * S5 — Crear y editar un presupuesto son atómicos: si una sentencia falla a mitad de camino
 * (aquí, dos hitos con la misma clave primaria) no queda ningún cambio parcial.
 */
describe.each(TEST_DRIVERS)('budgets repository: escrituras atómicas [%s]', (driver) => {
  let db: AppDatabase;
  let dispose: () => Promise<void> | void;
  const NOW = '2026-10-16T12:00:00.000Z';

  const budgetRow = (id: string, title = 'Presupuesto'): BudgetRow => ({
    id,
    projectId: 'project-1',
    title,
    totalAmount: 1000,
    currency: 'USD',
    status: 'DRAFT',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const milestoneRow = (id: string, budgetId: string, title = 'Hito'): MilestoneRow => ({
    id,
    budgetId,
    title,
    percentage: 50,
    amount: 500,
    dueDate: null,
    status: 'DRAFT',
    paidAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });

  beforeAll(async () => {
    ({ db, dispose } = await createTestDatabase(driver));
    await db.insert(clients).values({ id: 'client-1', name: 'Cliente', createdAt: NOW, updatedAt: NOW });
    await db.insert(projects).values({
      id: 'project-1',
      clientId: 'client-1',
      title: 'Proyecto',
      category: 'LANDING',
      status: 'PROSPECT',
      createdAt: NOW,
      updatedAt: NOW,
    });
  }, 60_000);

  afterAll(() => dispose());

  it('crear: si falla un hito, no se guarda ni el presupuesto ni ningún hito', async () => {
    const repo = createBudgetsRepository(db);
    await expect(
      repo.insertBudgetWithMilestones(budgetRow('budget-create-fail'), [
        milestoneRow('dup-create', 'budget-create-fail'),
        milestoneRow('dup-create', 'budget-create-fail'),
      ])
    ).rejects.toThrow();

    expect(await db.select().from(budgets).where(eq(budgets.id, 'budget-create-fail')).all()).toHaveLength(0);
    expect(await db.select().from(milestones).where(eq(milestones.budgetId, 'budget-create-fail')).all()).toHaveLength(0);
  });

  it('editar: si falla un hito nuevo, el presupuesto conserva su título y sus hitos originales', async () => {
    const repo = createBudgetsRepository(db);
    await repo.insertBudgetWithMilestones(budgetRow('budget-edit', 'Original'), [
      milestoneRow('original-1', 'budget-edit', 'Anticipo'),
      milestoneRow('original-2', 'budget-edit', 'Entrega'),
    ]);

    await expect(
      repo.replaceBudget('budget-edit', { title: 'Editado', totalAmount: 2000, currency: 'EUR', updatedAt: NOW }, [
        milestoneRow('dup-edit', 'budget-edit'),
        milestoneRow('dup-edit', 'budget-edit'),
      ])
    ).rejects.toThrow();

    const [budget] = await db.select().from(budgets).where(eq(budgets.id, 'budget-edit')).all();
    expect(budget.title).toBe('Original');
    expect(budget.totalAmount).toBe(1000);
    const remaining = await db.select().from(milestones).where(eq(milestones.budgetId, 'budget-edit')).all();
    expect(remaining.map((m) => m.id).sort()).toEqual(['original-1', 'original-2']);
  });

  it('editar: sin fallos reemplaza el presupuesto y todos sus hitos', async () => {
    const repo = createBudgetsRepository(db);
    await repo.replaceBudget('budget-edit', { title: 'Editado', totalAmount: 2000, currency: 'EUR', updatedAt: NOW }, [
      milestoneRow('new-1', 'budget-edit', 'Nuevo único'),
    ]);

    const [budget] = await db.select().from(budgets).where(eq(budgets.id, 'budget-edit')).all();
    expect(budget).toMatchObject({ title: 'Editado', totalAmount: 2000, currency: 'EUR' });
    const rows = await db.select().from(milestones).where(eq(milestones.budgetId, 'budget-edit')).all();
    expect(rows.map((m) => m.id)).toEqual(['new-1']);
  });
});
