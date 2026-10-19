import React from 'react';
import { Plus } from 'lucide-react';
import type { ClientRef, ProjectCategory } from '../../lib/types';
import { FormField, Input, Select } from '../ui';
import type { ProjectFormFieldSetter, ProjectFormValues } from './projectFormModel';

/** Valor del selector que abre el alta rápida de cliente en lugar de seleccionar uno. */
const NEW_CLIENT_OPTION = '__NEW_CLIENT__';

interface ProjectBasicInfoSectionProps {
  mode: 'create' | 'edit';
  values: ProjectFormValues;
  onFieldChange: ProjectFormFieldSetter;
  clients: ClientRef[];
  selectedClientName?: string;
  onRequestNewClient: () => void;
}

/** Sección 1: nombre, cliente (fijo en edición) y categoría. */
export const ProjectBasicInfoSection: React.FC<ProjectBasicInfoSectionProps> = ({
  mode,
  values,
  onFieldChange,
  clients,
  selectedClientName,
  onRequestNewClient,
}) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">1. Información Básica</h4>

    <FormField id="project-form-title" label="Nombre del Proyecto" required>
      <Input
        required
        value={values.title}
        onChange={(e) => onFieldChange('title', e.target.value)}
        placeholder="Ej: Rediseño Web Corporativa"
        autoFocus
      />
    </FormField>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* El id va al control real (input o select), no al contenedor, para que la etiqueta lo nombre */}
      <FormField id="project-form-client" label="Cliente Asociado" required>
        {({ id, hasError }) =>
          mode === 'edit' ? (
            <Input
              id={id}
              hasError={hasError}
              disabled
              value={selectedClientName || 'Cliente asignado'}
              className="opacity-75 cursor-not-allowed bg-neutral-900 border-neutral-800"
            />
          ) : (
            <div>
              <Select
                id={id}
                required
                value={values.clientId}
                onChange={(e) => {
                  if (e.target.value === NEW_CLIENT_OPTION) {
                    onRequestNewClient();
                  } else {
                    onFieldChange('clientId', e.target.value);
                  }
                }}
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CLIENT_OPTION}>+ Registrar nuevo cliente...</option>
              </Select>
              <button
                type="button"
                onClick={onRequestNewClient}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Crear cliente inline</span>
              </button>
            </div>
          )
        }
      </FormField>

      <FormField id="project-form-category" label="Categoría">
        <Select value={values.category} onChange={(e) => onFieldChange('category', e.target.value as ProjectCategory)}>
          <option value="LANDING">Landing Page</option>
          <option value="ECOMMERCE">E-commerce</option>
          <option value="CORPORATE">Web Corporativa</option>
          <option value="WEBAPP">Aplicación Web</option>
        </Select>
      </FormField>
    </div>
  </div>
);
