import { api } from '../api';
import type { FinancialMetrics, PaymentHistory, Radar } from '../types';

export const financeApi = {
  metrics: () => api.get<FinancialMetrics>('/api/finance/metrics'),
  radar: () => api.get<Radar>('/api/finance/radar'),
  history: () => api.get<PaymentHistory>('/api/finance/history'),
};
