import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { showcaseApi } from '../lib/resources';
import type { ShowcaseProject } from '../lib/types';
import { copyToClipboard } from '../lib/utils';

// Catálogo del Showcase: carga, filtro por categoría y acciones de copiado para prospectos.
export function useShowcase() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadShowcase = useCallback(async () => {
    try {
      setLoading(true);
      const data = await showcaseApi.list();
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

  const filtered = useMemo(() => {
    if (categoryFilter === 'ALL') return projects;
    return projects.filter((p) => p.category === categoryFilter);
  }, [projects, categoryFilter]);

  // Generador de Ficha de Venta para WhatsApp
  const copySalesPitch = useCallback((p: ShowcaseProject) => {
    const pitch = `🚀 *Proyecto:* ${p.title}\n🏢 *Cliente:* ${p.clientName}\n🌐 *Ver online:* ${p.productionUrl}\n💼 *Desarrollado por:* Couvance`;
    copyToClipboard(pitch, 'Ficha de venta copiada para WhatsApp');
  }, []);

  // Copiar enlace web directo
  const copyDirectLink = useCallback((url: string) => {
    copyToClipboard(url, 'Enlace directo copiado al portapapeles');
  }, []);

  return {
    filtered,
    loading,
    categoryFilter,
    setCategoryFilter,
    loadShowcase,
    copySalesPitch,
    copyDirectLink,
  };
}
