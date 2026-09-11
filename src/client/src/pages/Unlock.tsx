import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock, KeyRound, ArrowRight, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { NumericKeypad } from '../components/NumericKeypad';
import { api } from '../lib/api';

interface UnlockProps {
  onUnlockSuccess: () => void;
}

export const Unlock: React.FC<UnlockProps> = ({ onUnlockSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados del modal de recuperación
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [questions, setQuestions] = useState<{ q1: string; q2: string } | null>(null);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleUnlock = async (pinToSubmit: string) => {
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
    } finally {
      setLoading(false);
    }
  };

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
    if (!a1 || !a2) {
      toast.error('Por favor responda ambas preguntas');
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await api.post<{ ok: boolean; resetToken: string }>('/api/auth/recover', {
        a1,
        a2,
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
          <div className="w-full mb-6 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Teclado Numérico */}
        <NumericKeypad
          pin={pin}
          onChange={setPin}
          onSubmit={handleUnlock}
          disabled={loading}
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

      {/* Modal de Recuperación con Preguntas Secretas (Radix Dialog) */}
      <Dialog.Root open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl z-50 focus:outline-none">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-neutral-300" />
                <Dialog.Title className="text-sm font-semibold text-neutral-100">
                  Recuperación de PIN
                </Dialog.Title>
              </div>
              <Dialog.Close className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            {!resetToken ? (
              <form onSubmit={handleVerifyQuestions} className="space-y-4">
                <p className="text-xs text-neutral-400">
                  Responde las 2 preguntas de seguridad secretas para desbloquear el cambio de PIN:
                </p>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {questions?.q1 || 'Pregunta 1'}
                  </label>
                  <input
                    type="text"
                    required
                    value={a1}
                    onChange={(e) => setA1(e.target.value)}
                    placeholder="Tu respuesta..."
                    className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {questions?.q2 || 'Pregunta 2'}
                  </label>
                  <input
                    type="text"
                    required
                    value={a2}
                    onChange={(e) => setA2(e.target.value)}
                    placeholder="Tu respuesta..."
                    className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>Validar respuestas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPin} className="space-y-4">
                <p className="text-xs text-neutral-400">
                  Respuestas validadas. Ingresa tu nuevo PIN de 6 dígitos:
                </p>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Nuevo PIN (6 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    pattern="\d{6}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Confirmar Nuevo PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    pattern="\d{6}"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>Guardar y Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
