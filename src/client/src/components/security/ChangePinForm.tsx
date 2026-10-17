import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import type { ChangePinFormState } from '../../hooks/useSecuritySettings';
import { DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input, FormField } from '../ui/Input';
import { CardPanel } from '../ui/Card';
import { onlyPinDigits } from './pinInput';

interface ChangePinFormProps {
  form: ChangePinFormState;
  loading: boolean;
  onCancel: () => void;
}

// Tab 1: Cambiar PIN
export const ChangePinForm: React.FC<ChangePinFormProps> = ({ form, loading, onCancel }) => (
  <form onSubmit={form.submit} className="space-y-4 pt-2">
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
        value={form.currentPin}
        onChange={(e) => form.setCurrentPin(onlyPinDigits(e.target.value))}
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
          value={form.newPin}
          onChange={(e) => form.setNewPin(onlyPinDigits(e.target.value))}
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
          value={form.confirmPin}
          onChange={(e) => form.setConfirmPin(onlyPinDigits(e.target.value))}
          placeholder="••••••••"
          className="font-mono text-center tracking-widest text-lg"
          autoComplete="new-password"
          required
        />
      </FormField>
    </div>

    <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} className="w-full xs:w-auto" touchFriendly>
        Cancelar
      </Button>
      <Button
        type="submit"
        variant="primary"
        touchFriendly
        isLoading={loading}
        disabled={loading || form.newPin.length !== 8 || form.confirmPin.length !== 8}
        className="w-full xs:w-auto"
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        Actualizar PIN
      </Button>
    </DialogFooter>
  </form>
);
