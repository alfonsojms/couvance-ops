import React from 'react';
import { Globe, Code, FolderArchive } from 'lucide-react';
import type { ProductionStatus } from '../../lib/types';
import { FormField, Input, Select } from '../ui';
import type { ProjectFormFieldSetter, ProjectFormValues } from './projectFormModel';

interface ProjectLinksSectionProps {
  values: ProjectFormValues;
  onFieldChange: ProjectFormFieldSetter;
}

/** Sección 2: trilogía de enlaces operativos y estado en producción (alimenta el Showcase). */
export const ProjectLinksSection: React.FC<ProjectLinksSectionProps> = ({ values, onFieldChange }) => (
  <div className="space-y-3 pt-3 border-t border-neutral-800/80">
    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
      <span>2. Enlaces & Vitrina (Showcase)</span>
    </h4>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="sm:col-span-2">
        <FormField
          id="project-form-prod-url"
          label={
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <span>URL de Producción (Showcase)</span>
            </span>
          }
        >
          <Input
            type="url"
            value={values.productionUrl}
            onChange={(e) => onFieldChange('productionUrl', e.target.value)}
            placeholder="https://ejemplo.com"
          />
        </FormField>
      </div>

      <FormField id="project-form-prod-status" label="Estado en Producción">
        <Select
          value={values.productionStatus}
          onChange={(e) => onFieldChange('productionStatus', e.target.value as ProductionStatus)}
        >
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo / Pausado</option>
        </Select>
      </FormField>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField
        id="project-form-repo-url"
        label={
          <span className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-neutral-400" />
            <span>Repositorio de Código (GitHub/GitLab)</span>
          </span>
        }
      >
        <Input
          type="url"
          value={values.codeRepoUrl}
          onChange={(e) => onFieldChange('codeRepoUrl', e.target.value)}
          placeholder="https://github.com/..."
        />
      </FormField>

      <FormField
        id="project-form-resources-url"
        label={
          <span className="flex items-center gap-1.5">
            <FolderArchive className="w-3.5 h-3.5 text-neutral-400" />
            <span>Carpeta de Recursos (Drive/Dropbox)</span>
          </span>
        }
      >
        <Input
          type="url"
          value={values.resourcesUrl}
          onChange={(e) => onFieldChange('resourcesUrl', e.target.value)}
          placeholder="https://drive.google.com/..."
        />
      </FormField>
    </div>
  </div>
);
