import { memo } from 'react';
import { ExternalLink, Copy, Globe, MessageSquare } from 'lucide-react';
import type { ShowcaseProject } from '../../lib/types';
import { Button, Card, CardPanel, Badge } from '../ui';

const categoryLabels: Record<string, string> = {
  LANDING: 'Landing Page',
  ECOMMERCE: 'E-commerce',
  CORPORATE: 'Corporativa',
  WEBAPP: 'Web App',
};

interface ShowcaseCardProps {
  p: ShowcaseProject;
  onCopySalesPitch: (p: ShowcaseProject) => void;
  onCopyDirectLink: (url: string) => void;
}

// Vercel React Best Practice: Memoized Showcase card to avoid full catalog re-renders
export const ShowcaseCard = memo<ShowcaseCardProps>(({
  p,
  onCopySalesPitch,
  onCopyDirectLink,
}) => {
  return (
    <Card
      className="p-4 sm:p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4 content-visibility-auto"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="neutral">
            {categoryLabels[p.category] || p.category}
          </Badge>
          <Badge status="ACTIVE" showDot />
        </div>

        <div>
          <h3 className="font-semibold text-base text-neutral-100 mb-1 leading-snug truncate">
            {p.title}
          </h3>
          <span className="text-xs text-neutral-400 block truncate">{p.clientName}</span>
        </div>

        {/* Previsualización de URL */}
        <CardPanel className="flex items-center gap-2 text-xs text-neutral-300 truncate">
          <Globe className="w-3.5 h-3.5 text-[#004BFF] shrink-0" />
          <span className="truncate font-mono">{p.productionUrl}</span>
        </CardPanel>
      </div>

      {/* Acciones de Venta: Ficha WhatsApp, Copiar Enlace y Visitar */}
      <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-2">
        {/* Generador de Ficha de Venta para Prospectos */}
        <Button
          type="button"
          variant="whatsapp"
          size="sm"
          touchFriendly
          onClick={() => onCopySalesPitch(p)}
          title="Copiar ficha de venta estructurada para enviar por WhatsApp"
          className="flex-1 justify-center min-h-[44px] text-xs"
        >
          <MessageSquare className="w-4 h-4 text-neutral-950 shrink-0" />
          <span>Ficha de Venta</span>
        </Button>

        {/* Copiar enlace web directo */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          onClick={() => onCopyDirectLink(p.productionUrl)}
          title="Copiar enlace web directo al portapapeles"
          className="shrink-0 min-h-[44px] min-w-[44px] px-2.5 sm:px-3 text-xs"
        >
          <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="hidden sm:inline">Enlace</span>
        </Button>

        {/* Visitar sitio en nueva pestaña */}
        <a
          href={p.productionUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Visitar web en nueva pestaña"
          className="inline-flex items-center justify-center rounded-md font-medium select-none border transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 bg-neutral-900 text-neutral-200 border-neutral-800 hover:bg-neutral-850 hover:border-[#004BFF]/50 hover:text-white px-2.5 sm:px-3 text-xs gap-1.5 min-h-[44px] min-w-[44px] shrink-0 active:scale-[0.98]"
        >
          <ExternalLink className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="hidden sm:inline">Visitar</span>
        </a>
      </div>
    </Card>
  );
});
ShowcaseCard.displayName = 'ShowcaseCardItem';
