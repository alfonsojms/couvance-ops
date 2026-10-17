import { api } from '../api';
import type { Project, ProjectCreateInput, ProjectListItem, ProjectPatch, RenewResult } from '../types';

export const projectsApi = {
  list: () => api.get<ProjectListItem[]>('/api/projects'),
  create: (input: ProjectCreateInput) => api.post<Project>('/api/projects', input),
  /** Edición parcial: envía solo los campos modificados. */
  softEdit: (id: string, diff: ProjectPatch) => api.patch<Project>(`/api/projects/${id}`, diff),
  /** Completar o cancelar (RN-05: cancelar preserva los hitos cobrados). */
  setStatus: (id: string, status: 'COMPLETED' | 'CANCELLED') =>
    api.put<Project>(`/api/projects/${id}`, { status }),
  renew: (id: string) => api.post<RenewResult>(`/api/projects/${id}/renew`),
};
