import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, HelpCircle, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Input, FormField } from './ui/Input';
import { CardPanel } from './ui/Card';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'pin' | 'questions';

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pin');
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

  // Cargar configuración actual al abrir
  useEffect(() => {
    if (isOpen) {
      api
        .get<{ q1: string; q2: string; updatedAt?: string }>('/api/auth/settings')
        .then((data) => {
          setQ1(data.q1 || '');
          setQ2(data.q2 || '');
          setLastUpdated(data.updatedAt || null);
        })
        .catch(() => {
          // Silencioso o valores por defecto
        });
      // Resetear inputs de PIN
      setCurrentPinForPin('');
      setNewPin('');
      setConfirmPin('');
      setCurrentPinForQuestions('');
      setA1('');
      setA2('');
    }
  }, [isOpen]);

  const handleChangePin = async (e: React.FormEvent) => {
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
      await api.post('/api/auth/change-pin', {
        currentPin: currentPinForPin,
        newPin,
      });
      toast.success('PIN maestro actualizado exitosamente.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestions = async (e: React.FormEvent) => {
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
      await api.post('/api/auth/update-questions', {
        currentPin: currentPinForQuestions,
        q1: q1.trim(),
        a1: a1.trim(),
        q2: q2.trim(),
        a2: a2.trim(),
      });
      toast.success('Preguntas y respuestas secretas actualizadas exitosamente.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar las preguntas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle>Seguridad & Credenciales</DialogTitle>
              <DialogDescription>
                Gestione el PIN maestro y las preguntas de recuperación de Couvance Ops
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Selector de Pestañas */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 my-1">
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all select-none touch-manipulation ${
              activeTab === 'pin'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Cambiar PIN</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all select-none touch-manipulation ${
              activeTab === 'questions'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Preguntas Secretas</span>
          </button>
        </div>

        {/* Tab 1: Cambiar PIN */}
        {activeTab === 'pin' && (
          <form onSubmit={handleChangePin} className="space-y-4 pt-2">
            <CardPanel className="text-xs text-neutral-400 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>PIN Maestro de 8 Dígitos</span>
              </div>
              <p>
                Al cambiar el PIN, la sesión actual se mantendrá activa y se renovará en este dispositivo.
              </p>
            </CardPanel>

            <FormField label="PIN Actual (8 dígitos)" required>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPinForPin}
                onChange={(e) => setCurrentPinForPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••••••"
                className="font-mono text-center tracking-widest text-lg"
                autoComplete="current-password"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Nuevo PIN" required>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••••••"
                  className="font-mono text-center tracking-widest text-lg"
                  autoComplete="new-password"
                  required
                />
              </FormField>

              <FormField label="Confirmar Nuevo PIN" required>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••••••"
                  className="font-mono text-center tracking-widest text-lg"
                  autoComplete="new-password"
                  required
                />
              </FormField>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                disabled={loading || newPin.length !== 8 || confirmPin.length !== 8}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Actualizar PIN
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Tab 2: Preguntas de Seguridad */}
        {activeTab === 'questions' && (
          <form onSubmit={handleUpdateQuestions} className="space-y-4 pt-2">
            <CardPanel className="text-xs text-neutral-400 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Recuperación de Respaldo</span>
              </div>
              <p>
                Estas preguntas permiten restablecer el PIN en caso de olvido. Las respuestas se almacenan mediante hash SHA-256 irreversible.
              </p>
            </CardPanel>

            <FormField label="Pregunta Secreta 1" required>
              <Input
                type="text"
                value={q1}
                onChange={(e) => setQ1(e.target.value)}
                placeholder="Ej: ¿Cuál es el nombre de tu primera mascota?"
                required
              />
            </FormField>

            <FormField label="Respuesta Secreta 1" required hint="Se normaliza automáticamente (sin distinción de mayúsculas/espacios)">
              <Input
                type="text"
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                placeholder="Escribe la respuesta..."
                autoComplete="off"
                required
              />
            </FormField>

            <FormField label="Pregunta Secreta 2" required>
              <Input
                type="text"
                value={q2}
                onChange={(e) => setQ2(e.target.value)}
                placeholder="Ej: ¿En qué ciudad se fundó la agencia?"
                required
              />
            </FormField>

            <FormField label="Respuesta Secreta 2" required hint="Se normaliza automáticamente (sin distinción de mayúsculas/espacios)">
              <Input
                type="text"
                value={a2}
                onChange={(e) => setA2(e.target.value)}
                placeholder="Escribe la respuesta..."
                autoComplete="off"
                required
              />
            </FormField>

            <div className="pt-2 border-t border-neutral-800/80">
              <FormField
                label="PIN Maestro Actual (para autorizar)"
                required
                hint="Requerido por seguridad para autorizar la modificación de preguntas"
              >
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={currentPinForQuestions}
                  onChange={(e) => setCurrentPinForQuestions(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••••••"
                  className="font-mono text-center tracking-widest text-base"
                  required
                />
              </FormField>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                disabled={loading || currentPinForQuestions.length !== 8 || !a1.trim() || !a2.trim()}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Guardar Preguntas
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
