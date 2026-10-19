import { useState, useEffect, useCallback } from 'react';
import { setUnauthorizedHandler } from '../lib/api';
import { authApi } from '../lib/resources';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // El estado solo se actualiza al resolver la consulta, nunca de forma síncrona dentro del efecto.
  const checkAuth = useCallback(
    () =>
      authApi
        .status()
        .then(
          (res) => setIsAuthenticated(res.authenticated),
          () => setIsAuthenticated(false),
        )
        .finally(() => setLoading(false)),
    [],
  );

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
