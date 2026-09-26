import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Showcase } from './pages/Showcase';
import { Clients } from './pages/Clients';
import { Unlock } from './pages/Unlock';
import { NotFound } from './pages/NotFound';

const resolveTabFromPath = (path: string): NavTab | '404' => {
  const cleanPath = path.toLowerCase().replace(/\/+$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '/dashboard' || cleanPath === '/radar') {
    return 'dashboard';
  }
  if (cleanPath === '/projects' || cleanPath === '/proyectos') {
    return 'projects';
  }
  if (cleanPath === '/showcase') {
    return 'showcase';
  }
  if (cleanPath === '/clients' || cleanPath === '/clientes') {
    return 'clients';
  }
  return '404';
};

export const App: React.FC = () => {
  const { isAuthenticated, loading, lock, checkAuth } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab | '404'>(() => {
    if (typeof window !== 'undefined') {
      return resolveTabFromPath(window.location.pathname);
    }
    return 'dashboard';
  });

  // Escuchar eventos de navegación del navegador (adelante / atrás)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentTab(resolveTabFromPath(window.location.pathname));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = useCallback((tab: NavTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'dashboard' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, []);

  const handleGoToUnlock = useCallback(() => {
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-neutral-200 rounded-full animate-spin" />
      </div>
    );
  }

  // Si no está autenticado
  if (!isAuthenticated) {
    if (currentTab === '404') {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center">
          <NotFound
            isStandalone
            onGoToUnlock={handleGoToUnlock}
            requestedPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
          />
          <Toaster position="bottom-right" theme="dark" richColors />
        </div>
      );
    }

    return (
      <>
        <Unlock onUnlockSuccess={checkAuth} />
        <Toaster position="bottom-right" theme="dark" richColors />
      </>
    );
  }

  // Usuario autenticado
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar currentTab={currentTab} onTabChange={handleTabChange} onLock={lock} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'projects' && <Projects />}
        {currentTab === 'showcase' && <Showcase />}
        {currentTab === 'clients' && <Clients />}
        {currentTab === '404' && (
          <NotFound
            onNavigate={handleTabChange}
            requestedPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
          />
        )}
      </main>

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};

export default App;
