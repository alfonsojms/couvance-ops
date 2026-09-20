import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, ExternalLink, Copy, Globe, RefreshCw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { copyToClipboard } from '../lib/utils';
import { Button, Card, CardPanel, Badge } from '../components/ui';

interface ShowcaseProject {
  id: string;
  title: string;
  category: 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP';
  productionUrl: string;
  productionStatus: 'ACTIVE' | 'INACTIVE';
  clientName: string;
}

const categoryLabels: Record<string, string> = {
  LANDING: 'Landing Page',
  ECOMMERCE: 'E-commerce',
  CORPORATE: 'Corporativa',
  WEBAPP: 'Web App',
};

export const Showcase: React.FC = () => {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadShowcase = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<ShowcaseProject[]>('/api/showcase');
      setProjects(data);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar el Showcase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  const filtered = projects.filter((p) => {
    if (categoryFilter === 'ALL') return true;
    return p.category === categoryFilter;
  });

  // Generador de Ficha de Venta para WhatsApp
  const handleCopySalesPitch = (p: ShowcaseProject) => {
    const pitch = `🚀 *Proyecto:* ${p.title}\n🏢 *Cliente:* ${p.clientName}\n🌐 *Ver online:* ${p.productionUrl}\n💼 *Desarrollado por:* Couvance`;
    copyToClipboard(pitch, 'Ficha de venta copiada para WhatsApp');
  };

  // Copiar enlace web directo
  const handleCopyDirectLink = (url: string) => {
    copyToClipboard(url, 'Enlace directo copiado al portapapeles');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-100">
              Showcase de Ventas
            </h1>
          </div>
          <p className="text-xs text-neutral-400">
            Catálogo centralizado de desarrollos finalizados con webs activas para enviar a prospectos
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          touchFriendly
          onClick={loadShowcase}
          disabled={loading}
          isLoading={loading}
          className="self-start sm:self-auto"
        >
          {!loading && <RefreshCw className="w-3.5 h-3.5" />}
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Categorías con botones táctiles accesibles */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {[
          { id: 'ALL', label: 'Todas las Categorías' },
          { id: 'LANDING', label: 'Landing Pages' },
          { id: 'ECOMMERCE', label: 'E-commerce' },
          { id: 'CORPORATE', label: 'Corporativas' },
          { id: 'WEBAPP', label: 'Web Apps' },
        ].map((cat) => (
          <Button
            key={cat.id}
            type="button"
            variant={categoryFilter === cat.id ? 'primary' : 'secondary'}
            size="sm"
            touchFriendly
            onClick={() => setCategoryFilter(cat.id)}
            className="shrink-0"
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Grid de Proyectos */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-neutral-900/30 border-neutral-800/80">
          <Globe className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-300 font-medium">
            No hay proyectos terminados en esta categoría
          </p>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            Los proyectos deben estar marcados como completados, tener su web activa y una URL de producción válida para figurar en este catálogo.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral">
                    {categoryLabels[p.category] || p.category}
                  </Badge>
                  <Badge status="ACTIVE" showDot />
                </div>

                <div>
                  <h3 className="font-semibold text-base text-neutral-100 mb-1 leading-snug">
                    {p.title}
                  </h3>
                  <span className="text-xs text-neutral-400 block">{p.clientName}</span>
                </div>

                {/* Previsualización de URL */}
                <CardPanel className="flex items-center gap-2 text-xs text-neutral-300 truncate">
                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate font-mono">{p.productionUrl}</span>
                </CardPanel>
              </div>

              {/* Acciones de Venta: Ficha WhatsApp, Copiar Enlace y Visitar */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Generador de Ficha de Venta para Prospectos */}
                <Button
                  type="button"
                  variant="whatsapp"
                  size="sm"
                  touchFriendly
                  onClick={() => handleCopySalesPitch(p)}
                  title="Copiar ficha de venta estructurada para enviar por WhatsApp"
                  className="flex-1 justify-center"
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
                  onClick={() => handleCopyDirectLink(p.productionUrl)}
                  title="Copiar enlace web directo al portapapeles"
                  className="shrink-0"
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
                  className="inline-flex items-center justify-center rounded-md font-medium select-none border transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 bg-neutral-800 text-neutral-100 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 px-3 py-1.5 text-xs gap-1.5 min-h-[44px] min-w-[44px] shrink-0 active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="hidden sm:inline">Visitar</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
