import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';
import type { RecurringPeriod } from '../../lib/types';
import { FormField, Input, Select } from '../ui';
import type { ProjectFormFieldSetter, ProjectFormValues } from './projectFormModel';

interface ProjectRecurringSectionProps {
  values: ProjectFormValues;
  onFieldChange: ProjectFormFieldSetter;
}

/** Sección 3: servicio recurrente (hosting/mantenimiento) que alimenta el Radar. */
export const ProjectRecurringSection: React.FC<ProjectRecurringSectionProps> = ({ values, onFieldChange }) => {
  const { hasRecurring } = values;

  return (
    <div className="pt-3 border-t border-neutral-800/80">
      <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasRecurring}
            onChange={(e) => onFieldChange('hasRecurring', e.target.checked)}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900"
          />
          <span className="text-xs sm:text-sm font-medium text-neutral-200">
            Servicio Recurrente Activo (Hosting / Mantenimiento)
          </span>
        </label>

        {hasRecurring && (
          <div className="pt-2.5 border-t border-neutral-800/80 space-y-3">
            <p className="text-[11px] text-neutral-400">
              Alimentará el Radar de cobranzas preventivas a 30 días (RN-08). Permite montos con decimales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                id="recurring-amount"
                label={
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Monto Recurrente</span>
                  </span>
                }
                required
              >
                <Input
                  type="number"
                  step="any"
                  required={hasRecurring}
                  value={values.recurringAmount}
                  onChange={(e) => onFieldChange('recurringAmount', e.target.value)}
                  placeholder="Ej: 50.00"
                />
              </FormField>

              <FormField id="recurring-currency" label="Moneda">
                <Input
                  value={values.recurringCurrency}
                  onChange={(e) => onFieldChange('recurringCurrency', e.target.value)}
                  placeholder="USD"
                />
              </FormField>

              <FormField id="recurring-period" label="Período">
                <Select
                  value={values.recurringPeriod}
                  onChange={(e) => onFieldChange('recurringPeriod', e.target.value as RecurringPeriod)}
                >
                  <option value="MONTHLY">Mensual</option>
                  <option value="ANNUALLY">Anual</option>
                </Select>
              </FormField>
            </div>

            <FormField
              id="recurring-renewal-date"
              label={
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Próxima Fecha de Renovación</span>
                </span>
              }
              required
            >
              <Input
                type="date"
                required={hasRecurring}
                value={values.recurringRenewalDate}
                onChange={(e) => onFieldChange('recurringRenewalDate', e.target.value)}
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
};
