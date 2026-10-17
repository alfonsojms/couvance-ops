import React from 'react';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Button, DialogFooter, FormField, Input } from '../ui';
import type { BudgetPreset, PresetMilestone } from './budgetPresets';

const PRESET_OPTIONS: { id: BudgetPreset; label: string; description: string }[] = [
  { id: '50-50', label: '50 / 50', description: 'Anticipo + Entrega' },
  { id: '40-30-30', label: '40/30/30', description: '3 Hitos de Avance' },
  { id: '100', label: '100%', description: 'Pago Único' },
];

interface BudgetPresetFormProps {
  title: string;
  total: number;
  preset: BudgetPreset;
  milestones: PresetMilestone[];
  submitting: boolean;
  onTitleChange: (title: string) => void;
  onTotalChange: (total: number) => void;
  onPresetChange: (preset: BudgetPreset) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/** Formulario de nueva cotización con presets y vista previa de hitos calculados. */
export const BudgetPresetForm: React.FC<BudgetPresetFormProps> = ({
  title,
  total,
  preset,
  milestones,
  submitting,
  onTitleChange,
  onTotalChange,
  onPresetChange,
  onSubmit,
  onClose,
}) => (
  <div className="border-t border-neutral-800 pt-5">
    <div className="flex items-center gap-2 mb-3">
      <Sparkles className="w-4 h-4 text-neutral-300" />
      <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
        Nueva Cotización con Presets
      </h4>
    </div>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField id="budget-title" label="Concepto de la Cotización" required>
          <Input
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </FormField>

        <FormField id="budget-amount" label="Monto Total Entero (USD)" required>
          <Input
            type="number"
            required
            step="1"
            min="1"
            value={total}
            onChange={(e) => onTotalChange(Number(e.target.value))}
            className="font-mono"
          />
        </FormField>
      </div>

      {/* Presets Rápidos con Adaptación Móvil */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Distribución predefinida de hitos (Garantiza 100% exacto)
        </label>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onPresetChange(option.id)}
              className={`p-2 sm:p-3 rounded-lg border text-xs font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] touch-manipulation ${
                preset === option.id
                  ? 'bg-neutral-900 text-white border-[#004BFF]/60 shadow-[0_0_12px_rgba(0,75,255,0.2)]'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span className="block font-bold text-xs sm:text-sm text-neutral-100">{option.label}</span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 block leading-tight">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vista Previa de Hitos Calculados con Conciliación de Residuos */}
      <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>Vista previa de hitos:</span>
          <span className="text-neutral-200 font-semibold">
            Total: {formatCurrency(total)}
          </span>
        </div>

        <div className="space-y-1.5">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs font-mono bg-neutral-900/50 px-2.5 py-1.5 rounded border border-neutral-850"
            >
              <span className="text-neutral-300 truncate">
                {m.title} ({m.percentage}%)
              </span>
              <span className="text-[#BDEF00] font-semibold shrink-0 ml-2">
                {formatCurrency(m.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="flex-col-reverse xs:flex-row gap-2 xs:gap-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          touchFriendly
          onClick={onClose}
          className="w-full xs:w-auto"
        >
          Cerrar
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          touchFriendly
          isLoading={submitting}
          className="w-full xs:w-auto"
        >
          Guardar Cotización
        </Button>
      </DialogFooter>
    </form>
  </div>
);
