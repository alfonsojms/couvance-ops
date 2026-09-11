import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, ExternalLink, Copy, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { copyToClipboard } from '../lib/utils';

interface ShowcaseProject {
  id: string;
  title: string;
  category: 'LANDING' | 'ECOMMERCE' | 'CORPORATE' | 'WEBAPP';
  productionUrl: string;
  productionStatus: 'ACTIVE' | 'INACTIVE';
  clientName: string;
}

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

        <button
          type="button"
          onClick={loadShowcase}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Categorías */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Todas las Categorías' },
          { id: 'LANDING', label: 'Landing Pages' },
          { id: 'ECOMMERCE', label: 'E-commerce' },
          { id: 'CORPORATE', label: 'Corporativas' },
          { id: 'WEBAPP', label: 'Web Apps' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all select-none ${
              categoryFilter === cat.id
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Proyectos */}
      {filtered.length === 0 ? (
        <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-12 text-center">
          <Globe className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-300 font-medium">No hay proyectos terminados en esta categoría</p>
          <p className="text-xs text-neutral-500 mt-1">
            Los proyectos deben tener estado "COMPLETED", web en producción activa y URL válida para figurar aquí (RN-07).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {p.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Activa</span>
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-neutral-100 mb-1">{p.title}</h3>
                <span className="text-xs text-neutral-400 block">{p.clientName}</span>
              </div>

              {/* URL y Enlaces */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                <a
                  href={p.productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors truncate max-w-[200px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{p.productionUrl.replace(/^https?:\/\//, '')}</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(p.productionUrl, 'Enlace copiado para compartir')}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 border border-neutral-800 active:scale-95 transition-all"
                  title="Copiar enlace para WhatsApp"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
