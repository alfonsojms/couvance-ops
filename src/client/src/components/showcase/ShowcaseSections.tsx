import React from 'react';
import { Sparkles, Globe, RefreshCw } from 'lucide-react';
import { Button, Card } from '../ui';

const CATEGORIES = [
  { id: 'ALL', label: 'Todas las Categorías' },
  { id: 'LANDING', label: 'Landing Pages' },
  { id: 'ECOMMERCE', label: 'E-commerce' },
  { id: 'CORPORATE', label: 'Corporativas' },
  { id: 'WEBAPP', label: 'Web Apps' },
];

interface ShowcaseHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

// Cabecera Responsiva
export const ShowcaseHeader: React.FC<ShowcaseHeaderProps> = ({ loading, onRefresh }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-800 pb-4">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[#BDEF00]" />
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Showcase de Ventas</h1>
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
      onClick={onRefresh}
      disabled={loading}
      isLoading={loading}
      className="self-start sm:self-auto"
    >
      {!loading ? <RefreshCw className="w-3.5 h-3.5" /> : null}
      <span>Actualizar</span>
    </Button>
  </div>
);

interface ShowcaseCategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
}

// Categorías con Scroll Horizontal Suave en Móvil
export const ShowcaseCategoryFilter: React.FC<ShowcaseCategoryFilterProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
    {CATEGORIES.map((cat) => (
      <Button
        key={cat.id}
        type="button"
        variant={value === cat.id ? 'couvance' : 'secondary'}
        size="sm"
        touchFriendly
        onClick={() => onChange(cat.id)}
        className="shrink-0 text-xs min-h-[40px] sm:min-h-[32px]"
      >
        {cat.label}
      </Button>
    ))}
  </div>
);

export const ShowcaseEmptyState: React.FC = () => (
  <Card className="p-10 sm:p-12 text-center bg-neutral-900/30 border-neutral-800/80">
    <Globe className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
    <p className="text-sm text-neutral-300 font-medium">No hay proyectos terminados en esta categoría</p>
    <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
      Los proyectos deben estar marcados como completados, tener su web activa y una URL de producción válida para
      figurar en este catálogo.
    </p>
  </Card>
);
