import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/resources';
import type { SecurityQuestions } from '../lib/types';
import { errorMessage } from '../lib/errors';

// Recuperación del PIN en dos pasos: validar preguntas secretas y luego fijar el nuevo PIN.
export function useUnlockRecovery(onRecovered: () => void) {
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [questions, setQuestions] = useState<SecurityQuestions | null>(null);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const openRecovery = async () => {
    setRecoveryOpen(true);
    setA1('');
    setA2('');
    setResetToken(null);
    setNewPin('');
    setConfirmPin('');

    try {
      const data = await authApi.questions();
      setQuestions(data);
    } catch {
      toast.error('Error al cargar preguntas de recuperación');
    }
  };

  const verifyQuestions = async (e: FormEvent) => {
    e.preventDefault();
    if (!a1.trim() || !a2.trim()) {
      toast.error('Por favor responda ambas preguntas');
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await authApi.recover({
        a1: a1.trim(),
        a2: a2.trim(),
      });
      setResetToken(res.resetToken);
      toast.success('Respuestas correctas. Configure su nuevo PIN.');
    } catch (err) {
      toast.error(errorMessage(err, 'Respuestas incorrectas'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  const resetPin = async (e: FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 8 || !/^\d{8}$/.test(newPin)) {
      toast.error('El nuevo PIN debe tener exactamente 8 dígitos numéricos');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Los PIN ingresados no coinciden');
      return;
    }

    setRecoveryLoading(true);
    try {
      await authApi.resetPin({
        token: resetToken,
        newPin,
      });
      toast.success('Nuevo PIN configurado exitosamente.');
      setRecoveryOpen(false);
      onRecovered();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al restablecer el PIN'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  return {
    recoveryOpen,
    setRecoveryOpen,
    questions,
    a1,
    setA1,
    a2,
    setA2,
    resetToken,
    newPin,
    setNewPin,
    confirmPin,
    setConfirmPin,
    recoveryLoading,
    openRecovery,
    verifyQuestions,
    resetPin,
  };
}

export type UnlockRecovery = ReturnType<typeof useUnlockRecovery>;
