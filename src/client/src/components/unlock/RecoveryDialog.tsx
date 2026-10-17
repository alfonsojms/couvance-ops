import React from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { FormField, Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { UnlockRecovery } from '../../hooks/useUnlockRecovery';

interface RecoveryDialogProps {
  recovery: UnlockRecovery;
}

interface RecoveryFooterProps {
  loading: boolean;
  submitLabel: string;
  onCancel: () => void;
}

const RecoveryFooter: React.FC<RecoveryFooterProps> = ({ loading, submitLabel, onCancel }) => (
  <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      touchFriendly
      onClick={onCancel}
      className="w-full xs:w-auto"
    >
      Cancelar
    </Button>
    <Button
      type="submit"
      variant="primary"
      size="sm"
      touchFriendly
      isLoading={loading}
      className="w-full xs:w-auto"
    >
      <span>{submitLabel}</span>
      <ArrowRight className="w-3.5 h-3.5 ml-1" />
    </Button>
  </DialogFooter>
);

// Modal de Recuperación con Preguntas Secretas
export const RecoveryDialog: React.FC<RecoveryDialogProps> = ({ recovery }) => {
  const closeRecovery = () => recovery.setRecoveryOpen(false);

  return (
    <Dialog open={recovery.recoveryOpen} onOpenChange={recovery.setRecoveryOpen}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-neutral-300" />
            <DialogTitle>Recuperación de PIN</DialogTitle>
          </div>
          <DialogDescription>
            {!recovery.resetToken
              ? 'Responde las 2 preguntas de seguridad secretas para desbloquear el restablecimiento de PIN.'
              : 'Respuestas verificadas. Ingresa y confirma tu nuevo PIN de 8 dígitos.'}
          </DialogDescription>
        </DialogHeader>

        {!recovery.resetToken ? (
          <form onSubmit={recovery.verifyQuestions} className="space-y-4">
            <FormField
              id="recovery-a1"
              label={recovery.questions?.q1 || 'Pregunta de seguridad 1'}
              required
            >
              <Input
                required
                value={recovery.a1}
                onChange={(e) => recovery.setA1(e.target.value)}
                placeholder="Tu respuesta secreta..."
                autoFocus
              />
            </FormField>

            <FormField
              id="recovery-a2"
              label={recovery.questions?.q2 || 'Pregunta de seguridad 2'}
              required
            >
              <Input
                required
                value={recovery.a2}
                onChange={(e) => recovery.setA2(e.target.value)}
                placeholder="Tu respuesta secreta..."
              />
            </FormField>

            <RecoveryFooter
              loading={recovery.recoveryLoading}
              submitLabel="Validar respuestas"
              onCancel={closeRecovery}
            />
          </form>
        ) : (
          <form onSubmit={recovery.resetPin} className="space-y-4">
            <FormField
              id="recovery-new-pin"
              label="Nuevo PIN (8 dígitos numéricos)"
              required
            >
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                pattern="\d{8}"
                required
                value={recovery.newPin}
                onChange={(e) => recovery.setNewPin(e.target.value)}
                placeholder="••••••••"
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
                maxLength={8}
                pattern="\d{8}"
                required
                value={recovery.confirmPin}
                onChange={(e) => recovery.setConfirmPin(e.target.value)}
                placeholder="••••••••"
                className="font-mono tracking-widest text-center text-lg"
              />
            </FormField>

            <RecoveryFooter
              loading={recovery.recoveryLoading}
              submitLabel="Guardar y Entrar"
              onCancel={closeRecovery}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
