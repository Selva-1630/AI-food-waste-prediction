import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardLayout, { type PageKey } from '@/components/DashboardLayout';
import OverviewPage from '@/pages/OverviewPage';
import InventoryPage from '@/pages/InventoryPage';
import PredictionsPage from '@/pages/PredictionsPage';
import DonationsPage from '@/pages/DonationsPage';
import { Leaf } from 'lucide-react';

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('overview');
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow animate-pulse-ring" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Leaf size={28} className="text-white animate-bounce-soft" />
            </div>
          </div>
          <p className="text-ink-400 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (route === '/reset-password') return <ResetPasswordPage />;
    return <AuthPage />;
  }

  return (
    <DashboardLayout current={page} onNavigate={setPage}>
      {page === 'overview' && <OverviewPage onNavigate={setPage} />}
      {page === 'inventory' && <InventoryPage />}
      {page === 'predictions' && <PredictionsPage onNavigate={setPage} />}
      {page === 'donations' && <DonationsPage />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
