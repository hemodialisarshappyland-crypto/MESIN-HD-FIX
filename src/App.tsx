import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { Toast } from './components/Toast';
import { DailyDispatchScreen } from './screens/DailyDispatchScreen';
import { LoginScreen } from './screens/LoginScreen';
import { Activity } from 'lucide-react';

// Lazy-loaded secondary screens for ultra-lightweight mobile performance
const MonthlyScheduleScreen = lazy(() =>
  import('./screens/MonthlyScheduleScreen').then((m) => ({ default: m.MonthlyScheduleScreen }))
);
const MachineLayoutScreen = lazy(() =>
  import('./screens/MachineLayoutScreen').then((m) => ({ default: m.MachineLayoutScreen }))
);
const NurseListScreen = lazy(() =>
  import('./screens/NurseListScreen').then((m) => ({ default: m.NurseListScreen }))
);
const ReportsAndSyncScreen = lazy(() =>
  import('./screens/ReportsAndSyncScreen').then((m) => ({ default: m.ReportsAndSyncScreen }))
);
const AccountScreen = lazy(() =>
  import('./screens/AccountScreen').then((m) => ({ default: m.AccountScreen }))
);

const ScreenSkeleton: React.FC = () => (
  <div className="py-8 px-2 space-y-4 animate-pulse">
    <div className="h-28 bg-slate-200/80 dark:bg-slate-800/80 rounded-3xl w-full" />
    <div className="h-44 bg-slate-200/70 dark:bg-slate-800/70 rounded-3xl w-full" />
    <div className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-3xl w-full" />
  </div>
);

export const App: React.FC = () => {
  const { isAuthenticated, loading, canManageRoster } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('daily');

  useEffect(() => {
    // Handle Android PWA / APK shortcut routes (e.g. /?tab=machines)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabKey | null;
    if (tabParam && ['daily', 'monthly', 'machines', 'nurses', 'reports', 'account'].includes(tabParam)) {
      if (!canManageRoster && (tabParam === 'nurses' || tabParam === 'reports')) {
        setActiveTab('daily');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [canManageRoster]);

  // Ensure non-managerial users cannot stay on managerial-only tabs
  useEffect(() => {
    if (!canManageRoster && (activeTab === 'nurses' || activeTab === 'reports')) {
      setActiveTab('daily');
    }
  }, [canManageRoster, activeTab]);

  // Initial loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
            <Activity className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">HemoShift HD</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Memuat sistem dialisis...</p>
          </div>
        </div>
      </div>
    );
  }

  // Pre-login screen gate: user must authenticate before entering the main menu
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toast />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Header with App Status */}
      <Header onNavigateToAccount={() => setActiveTab('account')} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
        {activeTab === 'daily' && <DailyDispatchScreen />}
        <Suspense fallback={<ScreenSkeleton />}>
          {activeTab === 'monthly' && <MonthlyScheduleScreen />}
          {activeTab === 'machines' && <MachineLayoutScreen />}
          {canManageRoster && activeTab === 'nurses' && <NurseListScreen />}
          {canManageRoster && activeTab === 'reports' && <ReportsAndSyncScreen />}
          {activeTab === 'account' && <AccountScreen />}
        </Suspense>
      </main>

      {/* Toast Notification Container */}
      <Toast />

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};
