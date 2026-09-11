import { useState, useEffect, useCallback } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get<{ authenticated: boolean }>('/api/auth/status');
      setIsAuthenticated(res.authenticated);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
    });
    checkAuth();
  }, [checkAuth]);

  const unlock = async (pin: string) => {
    await api.post('/api/auth/unlock', { pin });
    setIsAuthenticated(true);
  };

  const lock = async () => {
    try {
      await api.post('/api/auth/lock');
    } finally {
      setIsAuthenticated(false);
    }
  };

  return {
    isAuthenticated,
    loading,
    unlock,
    lock,
    checkAuth,
  };
}
