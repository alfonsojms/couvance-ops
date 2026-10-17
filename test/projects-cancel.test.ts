import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createContractHarness, type ContractHarness, CONTRACT_DRIVERS } from './helpers/contract';

/**
 * RN-05 + S5 — Cancelar un proyecto (PUT /api/projects/:id con status CANCELLED):
 * el proyecto pasa a CANCELLED y sus hitos PENDING a CANCELLED en una sola unidad atómica;
 * los hitos PAID nunca se tocan.
 */
describe.each(CONTRACT_DRIVERS)('cancelación de proyecto en cascada [%s]', (driver) => {
  let h: ContractHarness;
  let clientId = '';

  /** Proyecto IN_PROGRESS con un presupuesto aprobado de dos hitos PENDING. */
  async function createApprovedProject(title: string) {
    const project = await h.raw('POST', '/api/projects', { clientId, title, category: 'LANDING' });
    const budget = await h.raw('POST', `/api/projects/${project.body.id}/budgets`, {
      title: `Presupuesto ${title}`,
      totalAmount: 1000,
      milestones: [
        { title: 'Anticipo', percentage: 50, dueDate: '2026-11-01' },
        { title: 'Entrega', percentage: 50, dueDate: '2026-12-01' },
      ],
    });
    await h.raw('POST', `/api/budgets/${budget.body.id}/approve`);
    return { projectId: project.body.id as string, milestoneIds: budget.body.milestones.map((m: any) => m.id) as string[] };
  }

  const getProject = async (id: string) => (await h.raw('GET', `/api/projects/${id}`)).body as any;
  const milestoneStatuses = (project: any) => project.budgets[0].milestones.map((m: any) => m.status);

  beforeAll(async () => {
    h = await createContractHarness(driver);
    await h.unlock();
    clientId = (await h.raw('POST', '/api/clients', { name: 'Cliente cancelación' })).body.id;
  }, 60_000);

  afterAll(() => h.dispose());

  it('cancela el proyecto y sus hitos PENDING sin tocar los PAID', async () => {
    const { projectId, milestoneIds } = await createApprovedProject('Cancelable');
    const paid = (await h.raw('PATCH', `/api/milestones/${milestoneIds[0]}/pay`)).body;

    const res = await h.raw('PUT', `/api/projects/${projectId}`, { status: 'CANCELLED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    const project = await getProject(projectId);
    expect(milestoneStatuses(project)).toEqual(['PAID', 'CANCELLED']);
    expect(project.budgets[0].milestones[0].paidAt).toBe(paid.paidAt);
  });

  it('si falla la cascada de hitos, el proyecto no queda CANCELLED (atómico)', async () => {
    const { projectId } = await createApprovedProject('Falla a mitad');
    await h.db.run(
      sql.raw(
        "CREATE TRIGGER fail_milestone_cancel BEFORE UPDATE OF status ON milestones WHEN NEW.status = 'CANCELLED' " +
          "BEGIN SELECT RAISE(ABORT, 'forced failure'); END"
      )
    );

    try {
      const res = await h.raw('PUT', `/api/projects/${projectId}`, { status: 'CANCELLED' });
      expect(res.status).toBe(500);
    } finally {
      await h.db.run(sql.raw('DROP TRIGGER fail_milestone_cancel'));
    }

    const project = await getProject(projectId);
    expect(project.status).toBe('IN_PROGRESS');
    expect(milestoneStatuses(project)).toEqual(['PENDING', 'PENDING']);
  });
});
