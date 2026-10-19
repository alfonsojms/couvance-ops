import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import type { SecurityQuestionsFormState } from '../../hooks/useSecuritySettings';
import { DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input, FormField } from '../ui/Input';
import { CardPanel } from '../ui/Card';
import { onlyPinDigits } from './pinInput';

interface SecurityQuestionsFormProps {
  form: SecurityQuestionsFormState;
  loading: boolean;
  onCancel: () => void;
}

const ANSWER_HINT = 'Se normaliza automáticamente (sin distinción de mayúsculas/espacios)';

// Tab 2: Preguntas de Seguridad
export const SecurityQuestionsForm: React.FC<SecurityQuestionsFormProps> = ({ form, loading, onCancel }) => (
  <form onSubmit={form.submit} className="space-y-4 pt-2">
    <CardPanel className="text-xs text-neutral-400 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Recuperación de Respaldo</span>
      </div>
      <p>
        Estas preguntas permiten restablecer el PIN en caso de olvido. Las respuestas se almacenan mediante hash SHA-256
        irreversible.
      </p>
    </CardPanel>

    <FormField label="Pregunta Secreta 1" required>
      <Input
        type="text"
        value={form.q1}
        onChange={(e) => form.setQ1(e.target.value)}
        placeholder="Ej: ¿Cuál es el nombre de tu primera mascota?"
        required
      />
    </FormField>

    <FormField label="Respuesta Secreta 1" required hint={ANSWER_HINT}>
      <Input
        type="text"
        value={form.a1}
        onChange={(e) => form.setA1(e.target.value)}
        placeholder="Escribe la respuesta..."
        autoComplete="off"
        required
      />
    </FormField>

    <FormField label="Pregunta Secreta 2" required>
      <Input
        type="text"
        value={form.q2}
        onChange={(e) => form.setQ2(e.target.value)}
        placeholder="Ej: ¿En qué ciudad se fundó la agencia?"
        required
      />
    </FormField>

    <FormField label="Respuesta Secreta 2" required hint={ANSWER_HINT}>
      <Input
        type="text"
        value={form.a2}
        onChange={(e) => form.setA2(e.target.value)}
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
          value={form.currentPin}
          onChange={(e) => form.setCurrentPin(onlyPinDigits(e.target.value))}
          placeholder="••••••••"
          className="font-mono text-center tracking-widest text-base"
          required
        />
      </FormField>
    </div>

    <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0 pt-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={loading}
        className="w-full xs:w-auto"
        touchFriendly
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        variant="primary"
        touchFriendly
        isLoading={loading}
        disabled={loading || form.currentPin.length !== 8 || !form.a1.trim() || !form.a2.trim()}
        className="w-full xs:w-auto"
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        Guardar Preguntas
      </Button>
    </DialogFooter>
  </form>
);
