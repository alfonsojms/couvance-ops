import { api } from '../api';
import type {
  AuthStatus,
  OkMessage,
  RecoverResult,
  SecurityQuestions,
  SecuritySettings,
  UpdateQuestionsInput,
} from '../types';

export const authApi = {
  status: () => api.get<AuthStatus>('/api/auth/status'),
  unlock: (pin: string) => api.post<OkMessage>('/api/auth/unlock', { pin }),
  lock: () => api.post<OkMessage>('/api/auth/lock'),
  questions: () => api.get<SecurityQuestions>('/api/auth/questions'),
  settings: () => api.get<SecuritySettings>('/api/auth/settings'),
  recover: (answers: { a1: string; a2: string }) => api.post<RecoverResult>('/api/auth/recover', answers),
  resetPin: (input: { token: string | null; newPin: string }) => api.post<OkMessage>('/api/auth/reset-pin', input),
  changePin: (input: { currentPin: string; newPin: string }) => api.post<OkMessage>('/api/auth/change-pin', input),
  updateQuestions: (input: UpdateQuestionsInput) => api.post<OkMessage>('/api/auth/update-questions', input),
};
