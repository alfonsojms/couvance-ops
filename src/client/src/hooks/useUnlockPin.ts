import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/resources';

interface UseUnlockPinOptions {
  onUnlockSuccess: () => void;
  // Con el teclado físico en pausa (p. ej. modal de recuperación abierto) no se capturan teclas.
  keyboardPaused: boolean;
}

// Ingreso del PIN maestro: estado de dígitos, envío al llegar a 8, error con shake y teclado físico.
export function useUnlockPin({ onUnlockSuccess, keyboardPaused }: UseUnlockPinOptions) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleUnlock = useCallback(
    async (pinToSubmit: string) => {
      if (loading || pinToSubmit.length !== 8) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        await authApi.unlock(pinToSubmit);
        toast.success('Desbloqueado exitosamente');
        onUnlockSuccess();
      } catch (err: any) {
        setErrorMsg(err.message || 'PIN incorrecto.');
        setPin('');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
      } finally {
        setLoading(false);
      }
    },
    [loading, onUnlockSuccess],
  );

  // Escuchar eventos globales de teclado físico (0-9, Backspace, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea (ej. modal de recuperación)
      const target = e.target as HTMLElement | null;
      if (
        keyboardPaused ||
        loading ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin((prev) => {
          if (prev.length >= 8) return prev;
          const next = prev + e.key;
          if (next.length === 8) {
            handleUnlock(next);
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPin('');
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 8) {
          handleUnlock(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardPaused, loading, pin, handleUnlock]);

  // Cambio desde el teclado en pantalla: limpia el error previo.
  const changePin = useCallback((newVal: string) => {
    setErrorMsg(null);
    setPin(newVal);
  }, []);

  const clearError = useCallback(() => setErrorMsg(null), []);

  return { pin, loading, errorMsg, isShaking, handleUnlock, changePin, clearError };
}
