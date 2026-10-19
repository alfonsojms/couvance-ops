import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '../lib/errors';

/**
 * Carga asíncrona con estado de carga y recarga manual. El estado solo se actualiza cuando la
 * promesa resuelve (nunca de forma síncrona dentro del efecto) y `reload` devuelve la promesa
 * para poder esperar los datos frescos. `load` debe ser estable (función de módulo o useCallback).
 */
export function useAsyncData<T>(load: () => Promise<T>, initialData: T, errorFallback: string) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);

  const settle = useCallback(
    (promise: Promise<T>) =>
      promise
        .then(setData, (err: unknown) => {
          toast.error(errorMessage(err, errorFallback));
        })
        .finally(() => setLoading(false)),
    [errorFallback],
  );

  useEffect(() => {
    settle(load());
  }, [settle, load]);

  const reload = useCallback(() => {
    setLoading(true);
    return settle(load());
  }, [settle, load]);

  return { data, loading, reload };
}
