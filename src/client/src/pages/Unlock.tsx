import React, { useState, useEffect, useCallback } from 'react';
import { Lock, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { NumericKeypad } from '../components/NumericKeypad';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/Dialog';
import { FormField, Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

interface UnlockProps {
  onUnlockSuccess: () => void;
}

export const Unlock: React.FC<UnlockProps> = ({ onUnlockSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Estados del modal de recuperación
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [questions, setQuestions] = useState<{ q1: string; q2: string } | null>(null);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleUnlock = useCallback(
    async (pinToSubmit: string) => {
      if (loading || pinToSubmit.length !== 6) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        await api.post('/api/auth/unlock', { pin: pinToSubmit });
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
    [loading, onUnlockSuccess]
  );

  // Escuchar eventos globales de teclado físico (0-9, Backspace, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea (ej. modal de recuperación)
      const target = e.target as HTMLElement | null;
      if (
        recoveryOpen ||
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
          if (prev.length >= 6) return prev;
          const next = prev + e.key;
          if (next.length === 6) {
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
        if (pin.length === 6) {
          handleUnlock(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recoveryOpen, loading, pin, handleUnlock]);

  const handleOpenRecovery = async () => {
    setRecoveryOpen(true);
    setErrorMsg(null);
    setA1('');
    setA2('');
    setResetToken(null);
    setNewPin('');
    setConfirmPin('');

    try {
      const data = await api.get<{ q1: string; q2: string }>('/api/auth/questions');
      setQuestions(data);
    } catch (err: any) {
      toast.error('Error al cargar preguntas de recuperación');
    }
  };

  const handleVerifyQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!a1.trim() || !a2.trim()) {
      toast.error('Por favor responda ambas preguntas');
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await api.post<{ ok: boolean; resetToken: string }>('/api/auth/recover', {
        a1: a1.trim(),
        a2: a2.trim(),
      });
      setResetToken(res.resetToken);
      toast.success('Respuestas correctas. Configure su nuevo PIN.');
    } catch (err: any) {
      toast.error(err.message || 'Respuestas incorrectas');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error('El nuevo PIN debe tener exactamente 6 dígitos numéricos');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Los PIN ingresados no coinciden');
      return;
    }

    setRecoveryLoading(true);
    try {
      await api.post('/api/auth/reset-pin', {
        token: resetToken,
        newPin,
      });
      toast.success('Nuevo PIN configurado exitosamente.');
      setRecoveryOpen(false);
      onUnlockSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al restablecer el PIN');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Cabecera / Ícono */}
        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-sm">
          <Lock className="w-6 h-6 text-neutral-300" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-neutral-100 mb-1 text-center">
          Kodex Ops
        </h1>
        <p className="text-xs text-neutral-400 mb-8 text-center">
          Ingresa el PIN maestro de 6 dígitos para acceder
        </p>

        {/* Mensaje de error si falla el PIN */}
        {errorMsg && (
          <div className="w-full mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Teclado Numérico con animación shake */}
        <NumericKeypad
          pin={pin}
          onChange={(newVal) => {
            setErrorMsg(null);
            setPin(newVal);
          }}
          onSubmit={handleUnlock}
          disabled={loading}
          isShaking={isShaking}
        />

        {/* Botón de Recuperación */}
        <button
          type="button"
          onClick={handleOpenRecovery}
          className="mt-8 text-xs text-neutral-500 hover:text-neutral-300 transition-colors duration-150 select-none"
        >
          ¿Olvidaste el PIN de acceso?
        </button>
      </div>

      {/* Modal de Recuperación con Preguntas Secretas (Nuevo Dialog UI & FormField) */}
      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-neutral-300" />
              <DialogTitle>Recuperación de PIN</DialogTitle>
            </div>
            <DialogDescription>
              {!resetToken
                ? 'Responde las 2 preguntas de seguridad secretas para desbloquear el restablecimiento de PIN.'
                : 'Respuestas verificadas. Ingresa y confirma tu nuevo PIN de 6 dígitos.'}
            </DialogDescription>
          </DialogHeader>

          {!resetToken ? (
            <form onSubmit={handleVerifyQuestions} className="space-y-4">
              <FormField
                id="recovery-a1"
                label={questions?.q1 || 'Pregunta de seguridad 1'}
                required
              >
                <Input
                  required
                  value={a1}
                  onChange={(e) => setA1(e.target.value)}
                  placeholder="Tu respuesta secreta..."
                  autoFocus
                />
              </FormField>

              <FormField
                id="recovery-a2"
                label={questions?.q2 || 'Pregunta de seguridad 2'}
                required
              >
                <Input
                  required
                  value={a2}
                  onChange={(e) => setA2(e.target.value)}
                  placeholder="Tu respuesta secreta..."
                />
              </FormField>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecoveryOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={recoveryLoading}
                >
                  <span>Validar respuestas</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPin} className="space-y-4">
              <FormField
                id="recovery-new-pin"
                label="Nuevo PIN (6 dígitos numéricos)"
                required
              >
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••••"
                  className="font-mono tracking-widest text-center text-lg"
                  autoFocus
                />
              </FormField>

              <FormField
                id="recovery-confirm-pin"
                label="Confirmar Nuevo PIN"
                required
              >
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••••"
                  className="font-mono tracking-widest text-center text-lg"
                />
              </FormField>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecoveryOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={recoveryLoading}
                >
                  <span>Guardar y Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
