// Fija el lado cliente del contrato HTTP: cada función de lib/resources envía
// exactamente el método, la URL y el cuerpo que la SPA enviaba antes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../src/client/src/lib/api';
import {
  authApi,
  backupApi,
  budgetsApi,
  clientsApi,
  financeApi,
  milestonesApi,
  projectsApi,
  showcaseApi,
} from '../src/client/src/lib/resources';

vi.mock('../src/client/src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

type Method = 'get' | 'post' | 'put' | 'patch' | 'del';

const clientInput = { name: 'Acme', contactName: null, phone: '+34600', email: null, notes: null };
const projectInput = {
  title: 'Web',
  clientId: 'c-1',
  category: 'LANDING' as const,
  status: 'PROSPECT' as const,
  productionUrl: null,
  productionStatus: 'ACTIVE' as const,
  codeRepoUrl: null,
  resourcesUrl: null,
  hasRecurring: 0,
  recurringAmount: null,
  recurringCurrency: 'USD',
  recurringPeriod: 'ANNUALLY' as const,
  recurringRenewalDate: null,
};
const budgetInput = {
  title: 'Cotización',
  totalAmount: 1000,
  currency: 'USD',
  milestones: [{ title: '100% Pago único total', percentage: 100 }],
};
const questionsInput = { currentPin: '12345678', q1: '¿Color?', a1: 'azul', q2: '¿Ciudad?', a2: 'lima' };

// [nombre, llamada, método, argumentos exactos que recibe `api.<método>`]
const cases: [string, () => Promise<unknown>, Method, unknown[]][] = [
  ['clientsApi.list', () => clientsApi.list(), 'get', ['/api/clients']],
  ['clientsApi.create', () => clientsApi.create(clientInput), 'post', ['/api/clients', clientInput]],
  ['clientsApi.update', () => clientsApi.update('c-1', clientInput), 'put', ['/api/clients/c-1', clientInput]],
  ['clientsApi.remove', () => clientsApi.remove('c-1'), 'del', ['/api/clients/c-1']],

  ['projectsApi.list', () => projectsApi.list(), 'get', ['/api/projects']],
  ['projectsApi.create', () => projectsApi.create(projectInput), 'post', ['/api/projects', projectInput]],
  [
    'projectsApi.softEdit',
    () => projectsApi.softEdit('p-1', { title: 'Nuevo' }),
    'patch',
    ['/api/projects/p-1', { title: 'Nuevo' }],
  ],
  [
    'projectsApi.setStatus COMPLETED',
    () => projectsApi.setStatus('p-1', 'COMPLETED'),
    'put',
    ['/api/projects/p-1', { status: 'COMPLETED' }],
  ],
  [
    'projectsApi.setStatus CANCELLED',
    () => projectsApi.setStatus('p-1', 'CANCELLED'),
    'put',
    ['/api/projects/p-1', { status: 'CANCELLED' }],
  ],
  ['projectsApi.renew', () => projectsApi.renew('p-1'), 'post', ['/api/projects/p-1/renew']],

  ['budgetsApi.listByProject', () => budgetsApi.listByProject('p-1'), 'get', ['/api/projects/p-1/budgets']],
  [
    'budgetsApi.create',
    () => budgetsApi.create('p-1', budgetInput),
    'post',
    ['/api/projects/p-1/budgets', budgetInput],
  ],
  ['budgetsApi.approve', () => budgetsApi.approve('b-1'), 'post', ['/api/budgets/b-1/approve']],
  ['budgetsApi.payAll', () => budgetsApi.payAll('b-1'), 'post', ['/api/budgets/b-1/pay-all']],
  ['milestonesApi.pay', () => milestonesApi.pay('m-1'), 'patch', ['/api/milestones/m-1/pay']],

  ['financeApi.metrics', () => financeApi.metrics(), 'get', ['/api/finance/metrics']],
  ['financeApi.radar', () => financeApi.radar(), 'get', ['/api/finance/radar']],
  ['financeApi.history', () => financeApi.history(), 'get', ['/api/finance/history']],

  ['showcaseApi.list', () => showcaseApi.list(), 'get', ['/api/showcase']],

  ['authApi.status', () => authApi.status(), 'get', ['/api/auth/status']],
  ['authApi.unlock', () => authApi.unlock('12345678'), 'post', ['/api/auth/unlock', { pin: '12345678' }]],
  ['authApi.lock', () => authApi.lock(), 'post', ['/api/auth/lock']],
  ['authApi.questions', () => authApi.questions(), 'get', ['/api/auth/questions']],
  ['authApi.settings', () => authApi.settings(), 'get', ['/api/auth/settings']],
  [
    'authApi.recover',
    () => authApi.recover({ a1: 'firulais', a2: 'lima' }),
    'post',
    ['/api/auth/recover', { a1: 'firulais', a2: 'lima' }],
  ],
  [
    'authApi.resetPin',
    () => authApi.resetPin({ token: 'tok', newPin: '87654321' }),
    'post',
    ['/api/auth/reset-pin', { token: 'tok', newPin: '87654321' }],
  ],
  [
    'authApi.changePin',
    () => authApi.changePin({ currentPin: '12345678', newPin: '87654321' }),
    'post',
    ['/api/auth/change-pin', { currentPin: '12345678', newPin: '87654321' }],
  ],
  [
    'authApi.updateQuestions',
    () => authApi.updateQuestions(questionsInput),
    'post',
    ['/api/auth/update-questions', questionsInput],
  ],
];

describe('Clientes HTTP por recurso (lib/resources)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)('%s envía el método, la URL y el cuerpo esperados', async (_name, call, method, args) => {
    const response = { ok: true };
    vi.mocked(api[method]).mockResolvedValueOnce(response);

    await expect(call()).resolves.toBe(response);

    expect(api[method]).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api[method]).mock.calls[0]).toStrictEqual(args);
    for (const other of ['get', 'post', 'put', 'patch', 'del'] as Method[]) {
      if (other !== method) expect(api[other]).not.toHaveBeenCalled();
    }
  });

  describe('backupApi.exportFile', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('descarga el respaldo con la cookie de sesión y devuelve el blob', async () => {
      const blob = new Blob(['{}'], { type: 'application/json' });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
      vi.stubGlobal('fetch', fetchMock);

      await expect(backupApi.exportFile()).resolves.toBe(blob);
      expect(fetchMock).toHaveBeenCalledWith('/api/backup/export', { credentials: 'include' });
    });

    it('lanza "Error al generar respaldo" si la respuesta no es exitosa', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      await expect(backupApi.exportFile()).rejects.toThrow('Error al generar respaldo');
    });
  });
});
