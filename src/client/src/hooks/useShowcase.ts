import { useCallback, useMemo, useState } from 'react';
import { showcaseApi } from '../lib/resources';
import type { ShowcaseProject } from '../lib/types';
import { copyToClipboard } from '../lib/utils';
import { useAsyncData } from './useAsyncData';

const fetchShowcase = () => showcaseApi.list();

// Catálogo del Showcase: carga, filtro por categoría y acciones de copiado para prospectos.
export function useShowcase() {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const {
    data: projects,
    loading,
    reload: loadShowcase,
  } = useAsyncData<ShowcaseProject[]>(fetchShowcase, [], 'Error al cargar el Showcase');

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
