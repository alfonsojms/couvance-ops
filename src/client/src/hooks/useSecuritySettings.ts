import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/resources';
import { errorMessage } from '../lib/errors';
import { useChanged } from './useChanged';

export type SecurityTab = 'pin' | 'questions';

// Estado y casos de uso del modal de seguridad: cambio de PIN y edición de preguntas secretas.
export function useSecuritySettings(isOpen: boolean, onClose: () => void) {
  const [activeTab, setActiveTab] = useState<SecurityTab>('pin');
  const [loading, setLoading] = useState(false);

  // Formulario de Cambio de PIN
  const [currentPinForPin, setCurrentPinForPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Formulario de Preguntas de Seguridad
  const [currentPinForQuestions, setCurrentPinForQuestions] = useState('');
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Resetear inputs de PIN al abrir (durante el render, no en un efecto)
  const openChanged = useChanged([isOpen]);
  if (openChanged && isOpen) {
    setCurrentPinForPin('');
    setNewPin('');
    setConfirmPin('');
    setCurrentPinForQuestions('');
    setA1('');
    setA2('');
  }

  // Cargar configuración actual al abrir
  useEffect(() => {
    if (isOpen) {
      authApi
        .settings()
        .then((data) => {
          setQ1(data.q1 || '');
          setQ2(data.q2 || '');
          setLastUpdated(data.updatedAt || null);
        })
        .catch(() => {
          // Silencioso o valores por defecto
        });
    }
  }, [isOpen]);

  const handleChangePin = async (e: FormEvent) => {
    e.preventDefault();

    if (currentPinForPin.length !== 8 || !/^\d{8}$/.test(currentPinForPin)) {
      toast.error('El PIN actual debe tener exactamente 8 dígitos numéricos');
      return;
    }

    if (newPin.length !== 8 || !/^\d{8}$/.test(newPin)) {
      toast.error('El nuevo PIN debe tener exactamente 8 dígitos numéricos');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('La confirmación no coincide con el nuevo PIN');
      return;
    }

    if (currentPinForPin === newPin) {
      toast.error('El nuevo PIN no puede ser idéntico al PIN actual');
      return;
    }

    try {
      setLoading(true);
      await authApi.changePin({
        currentPin: currentPinForPin,
        newPin,
      });
      toast.success('PIN maestro actualizado exitosamente.');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al actualizar el PIN'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestions = async (e: FormEvent) => {
    e.preventDefault();

    if (currentPinForQuestions.length !== 8 || !/^\d{8}$/.test(currentPinForQuestions)) {
      toast.error('Debe ingresar el PIN actual de 8 dígitos para autorizar el cambio');
      return;
    }

    if (q1.trim().length < 3 || q2.trim().length < 3) {
      toast.error('Las preguntas de seguridad deben tener al menos 3 caracteres');
      return;
    }

    if (a1.trim().length < 1 || a2.trim().length < 1) {
      toast.error('Las respuestas secretas no pueden estar vacías');
      return;
    }

    try {
      setLoading(true);
      await authApi.updateQuestions({
        currentPin: currentPinForQuestions,
        q1: q1.trim(),
        a1: a1.trim(),
        q2: q2.trim(),
        a2: a2.trim(),
      });
      toast.success('Preguntas y respuestas secretas actualizadas exitosamente.');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al actualizar las preguntas'));
    } finally {
      setLoading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    lastUpdated,
    pinForm: {
      currentPin: currentPinForPin,
      setCurrentPin: setCurrentPinForPin,
      newPin,
      setNewPin,
      confirmPin,
      setConfirmPin,
      submit: handleChangePin,
    },
    questionsForm: {
      currentPin: currentPinForQuestions,
      setCurrentPin: setCurrentPinForQuestions,
      q1,
      setQ1,
      a1,
      setA1,
      q2,
      setQ2,
      a2,
      setA2,
      submit: handleUpdateQuestions,
    },
  };
}

export type ChangePinFormState = ReturnType<typeof useSecuritySettings>['pinForm'];
export type SecurityQuestionsFormState = ReturnType<typeof useSecuritySettings>['questionsForm'];
