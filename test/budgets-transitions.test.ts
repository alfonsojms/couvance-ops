import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createContractHarness, type ContractHarness, CONTRACT_DRIVERS } from './helpers/contract';
import { canDecideBudget } from '../src/server/modules/budgets/domain';

/**
 * S8 — Transiciones de estado de presupuestos e hitos (cambio de API autorizado):
 * - Aprobar/rechazar solo desde DRAFT o SENT (si no, 409).
 * - Pagar solo hitos PENDING (DRAFT o CANCELLED dan 409).
 * - Pagar un hito ya PAID responde 200 sin tocar la fecha original.
 */
describe('reglas de transición de presupuestos (S8): dominio', () => {
  it('solo DRAFT y SENT admiten aprobar o rechazar', () => {
    expect(canDecideBudget('DRAFT')).toBe(true);
    expect(canDecideBudget('SENT')).toBe(true);
    expect(canDecideBudget('APPROVED')).toBe(false);
    expect(canDecideBudget('REJECTED')).toBe(false);
  });
});

describe.each(CONTRACT_DRIVERS)('reglas de transición de presupuestos (S8) [%s]', (driver) => {
  let h: ContractHarness;
  let projectId = '';

  async function createBudget(title: string, percentages: number[] = [50, 50]) {
    const res = await h.raw('POST', `/api/projects/${projectId}/budgets`, {
      title,
      totalAmount: 1000,
      milestones: percentages.map((percentage, i) => ({ title: `Hito ${i + 1}`, percentage, dueDate: '2026-11-01' })),
    });
    expect(res.status).toBe(201);
    return res.body as { id: string; milestones: Array<{ id: string }> };
  }

  const getBudget = async (id: string) => (await h.raw('GET', `/api/budgets/${id}`)).body as any;
  const milestoneOf = async (budgetId: string, index = 0) => (await getBudget(budgetId)).milestones[index];

  beforeAll(async () => {
    h = await createContractHarness(driver);
    await h.unlock();
    const client = await h.raw('POST', '/api/clients', { name: 'Cliente S8' });
    const project = await h.raw('POST', '/api/projects', {
      clientId: client.body.id,
      title: 'Proyecto S8',
      category: 'LANDING',
    });
    projectId = project.body.id;
  }, 60_000);

  afterAll(() => h.dispose());

  it('aprobar un presupuesto DRAFT sigue funcionando (200, hitos a PENDING)', async () => {
    const budget = await createBudget('Aprobable');
    const res = await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.budget.status).toBe('APPROVED');
    expect(res.body.milestones.map((m: any) => m.status)).toEqual(['PENDING', 'PENDING']);
  });

  it('rechazar un presupuesto DRAFT sigue funcionando (200)', async () => {
    const budget = await createBudget('Rechazable');
    const res = await h.raw('POST', `/api/budgets/${budget.id}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.budget.status).toBe('REJECTED');
  });

  it('aprobar un presupuesto ya APPROVED responde 409 y no cambia nada', async () => {
    const budget = await createBudget('Doble aprobación');
    await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    const before = await getBudget(budget.id);

    const res = await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'No se puede aprobar un presupuesto en estado APPROVED. Solo se aprueban presupuestos en DRAFT o SENT.',
    });
    expect(await getBudget(budget.id)).toEqual(before);
  });

  it('aprobar un presupuesto REJECTED responde 409 y sigue REJECTED', async () => {
    const budget = await createBudget('Rechazado y luego aprobado');
    await h.raw('POST', `/api/budgets/${budget.id}/reject`);

    const res = await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'No se puede aprobar un presupuesto en estado REJECTED. Solo se aprueban presupuestos en DRAFT o SENT.',
    );
    const after = await getBudget(budget.id);
    expect(after.status).toBe('REJECTED');
    expect(after.milestones.map((m: any) => m.status)).toEqual(['DRAFT', 'DRAFT']);
  });

  it('rechazar un presupuesto APPROVED responde 409 y sigue APPROVED', async () => {
    const budget = await createBudget('Aprobado y luego rechazado');
    await h.raw('POST', `/api/budgets/${budget.id}/approve`);

    const res = await h.raw('POST', `/api/budgets/${budget.id}/reject`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'No se puede rechazar un presupuesto en estado APPROVED. Solo se rechazan presupuestos en DRAFT o SENT.',
    );
    expect((await getBudget(budget.id)).status).toBe('APPROVED');
  });

  it('pagar un hito PENDING lo marca PAID con fecha de cobro (200)', async () => {
    const budget = await createBudget('Cobro normal');
    await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    const milestone = await milestoneOf(budget.id);

    const res = await h.raw('PATCH', `/api/milestones/${milestone.id}/pay`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    expect(res.body.paidAt).toEqual(expect.any(String));
  });

  it('pagar un hito DRAFT responde 409 y no lo cobra', async () => {
    const budget = await createBudget('Sin aprobar');
    const milestone = await milestoneOf(budget.id);

    const res = await h.raw('PATCH', `/api/milestones/${milestone.id}/pay`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'No es posible cobrar un hito de un presupuesto que aún no fue aprobado.' });
    const after = await milestoneOf(budget.id);
    expect(after.status).toBe('DRAFT');
    expect(after.paidAt).toBeNull();
  });

  it('pagar un hito CANCELLED responde 409 (antes 400) y sigue CANCELLED', async () => {
    const client = await h.raw('POST', '/api/clients', { name: 'Cliente cancelación' });
    const project = await h.raw('POST', '/api/projects', {
      clientId: client.body.id,
      title: 'Proyecto a cancelar',
      category: 'LANDING',
    });
    const budgetRes = await h.raw('POST', `/api/projects/${project.body.id}/budgets`, {
      title: 'Se cancelará',
      totalAmount: 500,
      milestones: [{ title: 'Único', percentage: 100 }],
    });
    await h.raw('POST', `/api/budgets/${budgetRes.body.id}/approve`);
    await h.raw('PUT', `/api/projects/${project.body.id}`, { status: 'CANCELLED' });
    const milestone = await milestoneOf(budgetRes.body.id);
    expect(milestone.status).toBe('CANCELLED');

    const res = await h.raw('PATCH', `/api/milestones/${milestone.id}/pay`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'No es posible cobrar un hito que ha sido cancelado.' });
    expect((await milestoneOf(budgetRes.body.id)).status).toBe('CANCELLED');
  });

  it('pagar dos veces el mismo hito responde 200 y conserva la fecha de cobro original', async () => {
    const budget = await createBudget('Doble toque');
    await h.raw('POST', `/api/budgets/${budget.id}/approve`);
    const milestone = await milestoneOf(budget.id);

    const first = await h.raw('PATCH', `/api/milestones/${milestone.id}/pay`);
    // El harness avanza el reloj 1 s por petición, así que un segundo pago tendría otra fecha.
    const second = await h.raw('PATCH', `/api/milestones/${milestone.id}/pay`);

    expect(second.status).toBe(200);
    expect(second.body.status).toBe('PAID');
    expect(second.body.paidAt).toBe(first.body.paidAt);
    expect(second.body.updatedAt).toBe(first.body.updatedAt);
    expect((await milestoneOf(budget.id)).paidAt).toBe(first.body.paidAt);
  });
});
