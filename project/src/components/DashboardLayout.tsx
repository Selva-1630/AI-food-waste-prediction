import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Package, Brain, HeartHandshake, LogOut,
  Leaf, Menu, X, ChevronRight,
} from 'lucide-react';

export type PageKey = 'overview' | 'inventory' | 'predictions' | 'donations';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'predictions', label: 'AI Predictions', icon: Brain },
  { key: 'donations', label: 'Donations', icon: HeartHandshake },
];

interface DashboardLayoutProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export default function DashboardLayout({ current, onNavigate, children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  function handleNav(key: PageKey) {
    onNavigate(key);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-ink-900 text-white flex flex-col z-40 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow shrink-0">
            <Leaf size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-base leading-tight">ZeroWaste AI</p>
            <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Portal</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto text-ink-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Company badge */}
        <div className="px-4 py-4">
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <p className="text-[10px] text-ink-400 uppercase tracking-wider">Company</p>
            <p className="text-sm font-medium truncate">
              {profile?.company_name || 'Your Workspace'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const active = current === key;
            return (
              <button
                key={key}
                onClick={() => handleNav(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-white border border-emerald-400/30'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon
                  size={18}
                  className={active ? 'text-emerald-400' : 'text-ink-400 group-hover:text-emerald-400'}
                />
                {label}
                {active && <ChevronRight size={16} className="ml-auto text-emerald-400" />}
              </button>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-ink-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-red-500/15 text-ink-300 hover:text-red-300 text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-ink-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-ink-600 hover:text-ink-900"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Leaf size={18} className="text-emerald-500" />
            <span className="font-display font-bold text-ink-900">ZeroWaste AI</span>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
