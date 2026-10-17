import { memo } from 'react';
import { Phone, Mail, FileText, Trash2, Pencil } from 'lucide-react';
import type { ClientWithTotals } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { WhatsAppButton } from '../WhatsAppButton';
import { Button, Card, CardPanel } from '../ui';

interface ClientCardProps {
  c: ClientWithTotals;
  onOpenEdit: (client: ClientWithTotals) => void;
  onOpenDelete: (client: ClientWithTotals) => void;
}

// Vercel React Best Practice: Memoized card component to avoid full directory re-renders
export const ClientCard = memo<ClientCardProps>(({ c, onOpenEdit, onOpenDelete }) => {
  const contactMsg = `Hola ${c.name}, te escribimos de Couvance. ¿Cómo estás?`;

  return (
    <Card
      className="p-4 sm:p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4 content-visibility-auto"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-neutral-100 truncate">{c.name}</h3>
            {c.contactName ? (
              <span className="text-xs text-neutral-400 block truncate">
                Contacto: {c.contactName}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              touchFriendly
              onClick={() => onOpenEdit(c)}
              aria-label={`Editar cliente ${c.name}`}
              title="Editar datos del cliente"
              className="text-neutral-500 hover:text-amber-400 hover:bg-neutral-800/80 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              touchFriendly
              onClick={() => onOpenDelete(c)}
              aria-label={`Eliminar cliente ${c.name}`}
              title="Eliminar cliente"
              className="text-neutral-500 hover:text-rose-400 hover:bg-neutral-800/80 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Info de contacto */}
        <div className="space-y-1 text-xs text-neutral-400">
          {c.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="font-mono">{c.phone}</span>
            </div>
          ) : null}

          {c.email ? (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{c.email}</span>
            </div>
          ) : null}

          {c.notes ? (
            <div className="flex items-start gap-2 pt-1 text-[11px] text-neutral-500">
              <FileText className="w-3.5 h-3.5 text-neutral-600 shrink-0 mt-0.5" />
              <span className="italic line-clamp-2">{c.notes}</span>
            </div>
          ) : null}
        </div>

        {/* Métricas del Cliente */}
        <CardPanel className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-neutral-500 text-[10px] block">Proyectos</span>
            <span className="text-neutral-200 font-semibold">{c.projectsCount}</span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">Pendiente</span>
            <span className="text-amber-400 font-semibold">
              {formatCurrency(c.totalPending)}
            </span>
          </div>
        </CardPanel>
      </div>

      {/* Botón WhatsApp con touch target cómodo en móvil */}
      <div className="pt-2 border-t border-neutral-800">
        <WhatsAppButton
          phone={c.phone}
          message={contactMsg}
          label="Abrir WhatsApp"
          size="sm"
          touchFriendly
          className="w-full justify-center min-h-[44px]"
        />
      </div>
    </Card>
  );
});
ClientCard.displayName = 'ClientCardItem';
