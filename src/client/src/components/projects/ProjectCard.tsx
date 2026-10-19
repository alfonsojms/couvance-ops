import React, { memo } from 'react';
import { ExternalLink, Github, FolderArchive, CheckCircle, XCircle, FileText, Pencil } from 'lucide-react';
import type { ProjectListItem } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { Button, Badge, BadgeStatus, Card, CardPanel } from '../ui';

interface ProjectLinkProps {
  href?: string | null;
  label: string;
  title: string;
  emptyTitle: string;
  icon: React.ReactNode;
}

/** Enlace operativo del proyecto; sin URL se muestra deshabilitado con su motivo. */
const ProjectLink: React.FC<ProjectLinkProps> = ({ href, label, title, emptyTitle, icon }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={title}
      className="p-2 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 active:scale-95"
    >
      {icon}
    </a>
  ) : (
    <span
      title={emptyTitle}
      className="p-2 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded bg-neutral-950 text-neutral-600 border border-neutral-900 cursor-not-allowed"
    >
      {icon}
    </span>
  );

export interface ProjectCardProps {
  p: ProjectListItem;
  onOpenBudgets: (p: ProjectListItem) => void;
  onEditProject: (p: ProjectListItem) => void;
  onCompleteProject: (projectId: string) => void;
  onSelectCancel: (p: ProjectListItem) => void;
}

// Vercel React Best Practice: Memoized project card to avoid full-list re-renders
export const ProjectCardItem = memo<ProjectCardProps>(
  ({ p, onOpenBudgets, onEditProject, onCompleteProject, onSelectCancel }) => {
    const isCancelled = p.status === 'CANCELLED';

    return (
      <Card
        className={`p-4 sm:p-5 flex flex-col justify-between transition-colors content-visibility-auto ${
          isCancelled ? 'bg-neutral-950/40 border-neutral-900 opacity-60' : 'hover:border-neutral-700'
        }`}
      >
        <div className="space-y-3">
          {/* Categoría y Estado */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {p.category}
            </span>
            <Badge status={p.status as BadgeStatus} />
          </div>

          {/* Título y Cliente */}
          <div>
            <h3
              className={`font-semibold text-sm text-neutral-100 ${isCancelled ? 'line-through text-neutral-400' : ''}`}
            >
              {p.title}
            </h3>
            <span className="text-xs text-neutral-400 truncate block">{p.client?.name || 'Cliente sin nombre'}</span>
          </div>

          {/* Resumen Financiero del Proyecto */}
          <CardPanel className="space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Cobrado:</span>
              <span className="text-[#BDEF00] font-semibold">{formatCurrency(p.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Pendiente:</span>
              <span className="text-amber-400 font-semibold">{formatCurrency(p.totalPending)}</span>
            </div>
          </CardPanel>

          {/* Trilogía de Enlaces Operativos con touch targets */}
          <div className="flex items-center gap-2 pt-1">
            <ProjectLink
              href={p.productionUrl}
              label={`Sitio en producción de ${p.title}`}
              title="Web en Producción"
              emptyTitle="Sin web en producción"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            />
            <ProjectLink
              href={p.codeRepoUrl}
              label={`Repositorio de código de ${p.title}`}
              title="Repositorio de Código (GitHub/GitLab)"
              emptyTitle="Sin repositorio registrado"
              icon={<Github className="w-3.5 h-3.5" />}
            />
            <ProjectLink
              href={p.resourcesUrl}
              label={`Recursos compartidos de ${p.title}`}
              title="Carpeta de Recursos (Drive/Dropbox)"
              emptyTitle="Sin carpeta de recursos"
              icon={<FolderArchive className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Acciones del Proyecto */}
        <div className="pt-3 sm:pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            touchFriendly
            onClick={() => onOpenBudgets(p)}
            className="flex-1 sm:flex-none justify-center"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            <span>Cotizaciones</span>
          </Button>

          <div className="flex items-center gap-1 shrink-0">
            {!isCancelled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                touchFriendly
                onClick={() => onEditProject(p)}
                aria-label={`Editar proyecto ${p.title}`}
                title="Editar metadatos del proyecto"
                className="text-neutral-400 hover:text-amber-400 hover:bg-neutral-800/80 min-h-[44px] min-w-[44px]"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            ) : null}

            {!isCancelled && p.status !== 'COMPLETED' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                touchFriendly
                onClick={() => onCompleteProject(p.id)}
                aria-label={`Completar proyecto ${p.title}`}
                title="Marcar proyecto como terminado"
                className="text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/80 min-h-[44px] min-w-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            ) : null}

            {!isCancelled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                touchFriendly
                onClick={() => onSelectCancel(p)}
                aria-label={`Cancelar proyecto ${p.title}`}
                title="Cancelar proyecto (mantiene pagos cobrados)"
                className="text-neutral-400 hover:text-rose-400 hover:bg-neutral-800/80 min-h-[44px] min-w-[44px]"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  },
);
ProjectCardItem.displayName = 'ProjectCardItem';
