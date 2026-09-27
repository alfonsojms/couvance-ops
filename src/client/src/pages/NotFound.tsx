import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Terminal,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export interface NotFoundProps {
  onNavigate?: (tab: 'dashboard' | 'projects' | 'showcase' | 'clients') => void;
  onGoToUnlock?: () => void;
  requestedPath?: string;
  isStandalone?: boolean;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onNavigate,
  onGoToUnlock,
  requestedPath,
  isStandalone = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const currentPath =
    requestedPath ||
    (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/404');

  const fullUrl = typeof window !== 'undefined' ? window.location.href : currentPath;

  const handleCopyPath = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Ruta copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar la ruta');
    }
  };

  const handleShareReport = async () => {
    const reportText = `⚠️ [Couvance Ops] Enlace 404 detectado: ${fullUrl} (${new Date().toLocaleTimeString()})`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reportText);
        toast.success('Reporte de enlace roto copiado al portapapeles');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
      }
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Cabecera / Logo Couvance e Identificador Técnico */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#004BFF]/50 bg-[#004BFF] shadow-[0_0_24px_rgba(0,75,255,0.35)] flex items-center justify-center select-none pointer-events-none mb-1">
            <img
              src="/logo-couvance.png"
              alt="Couvance Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 select-none">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
            <span>HTTP 404 · RECURSO NO ENCONTRADO</span>
          </div>

          {/* Gran Tipografía 404 con resplandor sutil azul Couvance */}
          <div className="relative my-2 select-none">
            <div className="font-mono font-extrabold tracking-tighter text-8xl sm:text-9xl text-white opacity-95 drop-shadow-[0_0_40px_rgba(0,75,255,0.25)]">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <FileQuestion className="w-32 h-32 sm:w-40 sm:h-40 text-[#004BFF]" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Página o recurso inexistente
          </h1>
          <p className="text-sm text-neutral-400 max-w-lg leading-relaxed">
            La dirección a la que intentas ingresar no existe en este servidor, fue movida o el enlace contiene un error tipográfico.
          </p>
        </div>

        {/* Panel de Ruta Solicitada */}
        <Card className="bg-[#111115] border-neutral-800 p-3 sm:p-4 rounded-xl shadow-lg shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 overflow-hidden text-neutral-300">
              <Terminal className="w-4 h-4 text-[#004BFF] shrink-0" />
              <span className="text-rose-400 font-semibold shrink-0">GET</span>
              <span className="truncate text-neutral-200 select-all" title={currentPath}>
                {currentPath}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyPath}
                title="Copiar ruta"
                className="h-8 px-2.5 text-xs text-neutral-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#BDEF00]" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="ml-1">{copied ? 'Copiado' : 'Copiar'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShareReport}
                title="Copiar reporte o avisar al socio"
                className="h-8 px-2.5 text-xs text-neutral-300 hover:text-white"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="ml-1 hidden xs:inline sm:inline">Reportar</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Acciones Rápidas de Navegación */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center select-none">
            Rutas y Accesos Disponibles
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Si no está autenticado y se proporciona onGoToUnlock, mostrar botón de inicio */}
            {isStandalone && onGoToUnlock ? (
              <Button
                variant="couvance"
                touchFriendly
                onClick={onGoToUnlock}
                className="sm:col-span-2 w-full justify-center gap-2 py-3"
              >
                <LogIn className="w-4 h-4" />
                <span>Acceder a Couvance Ops (Ingresar PIN)</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  touchFriendly
                  onClick={() => onNavigate?.('dashboard')}
                  className="w-full justify-start gap-3 py-3 px-4 border-[#004BFF]/40 bg-neutral-900/90 hover:border-[#004BFF] hover:bg-neutral-850 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#004BFF]/15 border border-[#004BFF]/30 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-4 h-4 text-[#004BFF]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-xs sm:text-sm text-white group-hover:text-white">Radar de Cobros</div>
                    <div className="text-xs text-neutral-400 font-normal">Panel principal y cobranzas</div>
                  </div>
                </Button>

                <Button
                  variant="secondary"
                  touchFriendly
                  onClick={() => onNavigate?.('projects')}
                  className="w-full justify-start gap-3 py-3 px-4 hover:border-[#004BFF]/40 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4 text-neutral-300 group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-xs sm:text-sm text-neutral-100 group-hover:text-white">Proyectos</div>
                    <div className="text-xs text-neutral-400 font-normal">Cotizador e hitos de pago</div>
                  </div>
                </Button>

                <Button
                  variant="secondary"
                  touchFriendly
                  onClick={() => onNavigate?.('clients')}
                  className="w-full justify-start gap-3 py-3 px-4 hover:border-[#004BFF]/40 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-neutral-300 group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-xs sm:text-sm text-neutral-100 group-hover:text-white">Clientes</div>
                    <div className="text-xs text-neutral-400 font-normal">Directorio y contactos</div>
                  </div>
                </Button>

                <Button
                  variant="secondary"
                  touchFriendly
                  onClick={() => onNavigate?.('showcase')}
                  className="w-full justify-start gap-3 py-3 px-4 hover:border-[#BDEF00]/40 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#BDEF00]/10 border border-[#BDEF00]/25 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#BDEF00]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-xs sm:text-sm text-neutral-100 group-hover:text-white">Showcase</div>
                    <div className="text-xs text-neutral-400 font-normal">Portafolio activo de ventas</div>
                  </div>
                </Button>
              </>
            )}
          </div>

          {/* Botón de Regresar */}
          <div className="pt-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="text-neutral-400 hover:text-white gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Regresar a la página previa</span>
            </Button>
          </div>
        </div>

        {/* Diagnóstico Técnico Colapsable */}
        <div className="border-t border-neutral-900 pt-4">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between text-xs text-neutral-500 hover:text-neutral-400 transition-colors py-1 select-none"
          >
            <span>Detalles técnicos del error</span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showTechnicalDetails ? (
            <div className="mt-2.5 p-3 rounded-lg bg-neutral-950 border border-neutral-850 font-mono text-xs text-neutral-400 space-y-1.5">
              <div>
                <span className="text-neutral-500">Status: </span>
                <span className="text-rose-400">404 Not Found</span>
              </div>
              <div className="break-all">
                <span className="text-neutral-500">Path: </span>
                <span className="text-neutral-300">{currentPath}</span>
              </div>
              <div className="break-all">
                <span className="text-neutral-500">URL Completa: </span>
                <span className="text-neutral-300">{fullUrl}</span>
              </div>
              <div>
                <span className="text-neutral-500">Referrer: </span>
                <span className="text-neutral-300">
                  {typeof document !== 'undefined' && document.referrer ? document.referrer : 'Acceso directo'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Timestamp: </span>
                <span className="text-neutral-300">{new Date().toISOString()}</span>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default NotFound;
