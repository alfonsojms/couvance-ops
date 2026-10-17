import { api } from '../api';
import type {
  BudgetApproveResult,
  BudgetCreateInput,
  BudgetWithMilestones,
  Milestone,
  PayAllResult,
} from '../types';

export const budgetsApi = {
  listByProject: (projectId: string) =>
    api.get<BudgetWithMilestones[]>(`/api/projects/${projectId}/budgets`),
  create: (projectId: string, input: BudgetCreateInput) =>
    api.post<BudgetWithMilestones>(`/api/projects/${projectId}/budgets`, input),
  approve: (id: string) => api.post<BudgetApproveResult>(`/api/budgets/${id}/approve`),
  payAll: (id: string) => api.post<PayAllResult>(`/api/budgets/${id}/pay-all`),
};

export const milestonesApi = {
  pay: (id: string) => api.patch<Milestone>(`/api/milestones/${id}/pay`),
};
