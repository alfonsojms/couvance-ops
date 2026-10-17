import { api } from '../api';
import type { Client, ClientInput, ClientWithTotals, OkMessage } from '../types';

export const clientsApi = {
  list: () => api.get<ClientWithTotals[]>('/api/clients'),
  create: (input: ClientInput) => api.post<Client>('/api/clients', input),
  update: (id: string, input: ClientInput) => api.put<Client>(`/api/clients/${id}`, input),
  remove: (id: string) => api.del<OkMessage>(`/api/clients/${id}`),
};
