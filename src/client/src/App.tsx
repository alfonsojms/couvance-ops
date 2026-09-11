import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Showcase } from './pages/Showcase';
import { Clients } from './pages/Clients';
import { Unlock } from './pages/Unlock';

export const App: React.FC = () => {
  const { isAuthenticated, loading, unlock, lock, checkAuth } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-neutral-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Unlock onUnlockSuccess={checkAuth} />
        <Toaster position="bottom-right" theme="dark" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} onLock={lock} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'projects' && <Projects />}
        {currentTab === 'showcase' && <Showcase />}
        {currentTab === 'clients' && <Clients />}
      </main>

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};

export default App;
