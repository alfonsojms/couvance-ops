import { api } from '../api';
import type { ShowcaseProject } from '../types';

export const showcaseApi = {
  list: () => api.get<ShowcaseProject[]>('/api/showcase'),
};
