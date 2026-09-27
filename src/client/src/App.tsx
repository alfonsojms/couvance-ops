import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { Navbar, NavTab } from './components/Navbar';
import { Unlock } from './pages/Unlock';

// Vercel React Best Practice: Dynamic imports for route-level components
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })));
const Showcase = lazy(() => import('./pages/Showcase').then((m) => ({ default: m.Showcase })));
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const PageFallback: React.FC = () => (
  <div className="w-full py-16 flex flex-col items-center justify-center">
    <div className="w-7 h-7 border-2 border-neutral-800 border-t-[#004BFF] rounded-full animate-spin" />
  </div>
);

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
          <Suspense fallback={<PageFallback />}>
            <NotFound
              isStandalone
              onGoToUnlock={handleGoToUnlock}
              requestedPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
            />
          </Suspense>
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-[#004BFF] selection:text-white">
      <Navbar currentTab={currentTab} onTabChange={handleTabChange} onLock={lock} />

      {/* Main Container: pb-20 on mobile allows room for the bottom navigation bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 pb-24 sm:pb-8">
        <Suspense fallback={<PageFallback />}>
          {currentTab === 'dashboard' ? <Dashboard /> : null}
          {currentTab === 'projects' ? <Projects /> : null}
          {currentTab === 'showcase' ? <Showcase /> : null}
          {currentTab === 'clients' ? <Clients /> : null}
          {currentTab === '404' ? (
            <NotFound
              onNavigate={handleTabChange}
              requestedPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
            />
          ) : null}
        </Suspense>
      </main>

      {/* Sonner Toaster: styled with bottom margin on mobile so it doesn't overlap bottom bar */}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{
          className: 'mb-14 sm:mb-0',
        }}
      />
    </div>
  );
};

export default App;
