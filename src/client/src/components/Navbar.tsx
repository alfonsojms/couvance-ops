import React from 'react';
import { LayoutDashboard, FolderKanban, Sparkles, Users, Download, Lock } from 'lucide-react';
import { toast } from 'sonner';

export type NavTab = 'dashboard' | 'projects' | 'showcase' | 'clients';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLock: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onLock }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleExportBackup = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/api/backup/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al generar respaldo');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `kodex-ops-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Respaldo descargado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al exportar respaldo');
    } finally {
      setDownloading(false);
    }
  };

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Radar', icon: LayoutDashboard },
    { id: 'projects' as NavTab, label: 'Proyectos', icon: FolderKanban },
    { id: 'showcase' as NavTab, label: 'Showcase', icon: Sparkles },
    { id: 'clients' as NavTab, label: 'Clientes', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-14 flex items-center justify-between">
        {/* Marca / Título */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-100 select-none">
            KO
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-100 hidden sm:inline select-none">
            Kodex <span className="text-neutral-400 font-mono text-xs">Ops</span>
          </span>
        </div>

        {/* Pestañas Centrales con touch target >= 44px en móvil */}
        <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-md text-xs font-medium transition-all duration-150 ease-out select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Acciones Rápidas (Exportar Respaldo + Bloquear) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={downloading}
            aria-label="Descargar respaldo JSON"
            title="Descargar respaldo JSON"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-md text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-neutral-100 active:scale-95 transition-all duration-150 ease-out select-none disabled:opacity-50 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-neutral-400 shrink-0" />
            <span className="hidden md:inline">Descargar respaldo JSON</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            aria-label="Bloquear sesión"
            title="Bloquear sesión"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] p-2 rounded-md text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 active:scale-95 transition-all duration-150 ease-out select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Lock className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
