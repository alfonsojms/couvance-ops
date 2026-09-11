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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Marca / Título */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-100">
            KO
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-100 hidden sm:inline">
            Kodex <span className="text-neutral-400 font-mono text-xs">Ops</span>
          </span>
        </div>

        {/* Pestañas Centrales */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ease-out select-none ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Acciones Rápidas (Exportar Respaldo + Bloquear) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={downloading}
            title="Exportar copia de seguridad en JSON (RN-10)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-neutral-100 active:scale-95 transition-all duration-150 ease-out select-none disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">Respaldo</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            title="Bloquear sesión"
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 active:scale-95 transition-all duration-150 ease-out select-none"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
