import { useState, useEffect, useCallback } from 'react';
import { setUnauthorizedHandler } from '../lib/api';
import { authApi } from '../lib/resources';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await authApi.status();
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
    await authApi.unlock(pin);
    setIsAuthenticated(true);
  };

  const lock = async () => {
    try {
      await authApi.lock();
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
