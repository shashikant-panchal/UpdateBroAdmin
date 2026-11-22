import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Image as ImageIcon,
  Settings,
  Sliders,
  Users,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BrandLogo } from '../components/BrandLogo';
import { supabase } from '../lib/supabase';

export type AdminTab = 'overview' | 'orders' | 'products' | 'widgets' | 'categories' | 'banners' | 'users' | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingOrdersCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  pendingOrdersCount = 0,
  children,
}) => {
  const { user, profile, signOut } = useAuth();
  const { resolvedTheme, cycleMode } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tagline, setTagline] = useState(() => {
    return localStorage.getItem('ub_admin_tagline') || 'Powered by SNR';
  });

  useEffect(() => {
    const fetchTagline = async () => {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('tagline, announcement_text')
          .eq('id', 1)
          .maybeSingle();
        if (data) {
          const val = data.tagline || data.announcement_text || 'Powered by SNR';
          setTagline(val);
          localStorage.setItem('ub_admin_tagline', val);
        }
      } catch {
        // ignore
      }
    };
    fetchTagline();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ub_admin_tagline' && e.newValue) {
        setTagline(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || 'https://www.updatebro.in';

  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders' as AdminTab,
      label: 'Orders',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
      badgeColor: 'bg-accent text-white',
    },
    {
      id: 'products' as AdminTab,
      label: 'Products',
      icon: Package,
      badge: null,
    },
    {
      id: 'widgets' as AdminTab,
      label: 'Widgets & Sections',
      icon: Sliders,
      badge: 'PRO',
      badgeColor: 'bg-accent/20 text-accent border border-accent/30',
    },
    {
      id: 'categories' as AdminTab,
      label: 'Categories',
      icon: Layers,
      badge: null,
    },
    {
      id: 'banners' as AdminTab,
      label: 'Hero Banners',
      icon: ImageIcon,
      badge: null,
    },
    {
      id: 'users' as AdminTab,
      label: 'Customers & Users',
      icon: Users,
      badge: null,
    },
    {
      id: 'settings' as AdminTab,
      label: 'Store Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:flex-row transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 p-1 text-accent border border-accent/20">
            <BrandLogo variant="monogramReg" className="h-full w-auto text-accent" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-black text-sm text-ink tracking-tight">UPDATE BRO<span className="text-accent">®</span></span>
            <span className="text-[8px] font-black uppercase text-accent tracking-widest mt-0.5 truncate max-w-[130px]">
              {tagline}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleMode}
            className="rounded-full p-2 text-muted hover:bg-cloud hover:text-ink transition"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-xl border border-line bg-cloud p-2 text-ink"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Desktop / Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-line bg-surface/80 backdrop-blur-xl transition-all duration-300 sticky top-0 h-screen z-30 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-4 sm:p-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 p-1.5 text-accent border border-accent/20 shadow-glow">
              <BrandLogo variant="monogramReg" className="h-full w-auto text-accent" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display font-black text-sm text-ink tracking-tight">UPDATE BRO®</span>
                <span className="text-[8px] font-black uppercase text-accent mt-0.5 tracking-wider truncate max-w-[140px]">
                  {tagline}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="rounded-lg p-1 text-muted hover:bg-cloud hover:text-ink transition text-xs font-mono"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-bold transition ${
                  isActive
                    ? 'bg-accent text-white shadow-glow'
                    : 'text-muted hover:bg-cloud hover:text-ink'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {!isSidebarCollapsed && item.badge !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-line p-3 space-y-2">
          {/* Quick link to Storefront */}
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-cloud/50 px-3.5 py-2.5 text-xs font-bold text-ink transition hover:border-accent hover:bg-surface"
            title="View Storefront"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-accent" />
            {!isSidebarCollapsed && <span>View Storefront</span>}
          </a>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={cycleMode}
            className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3.5 py-2 text-xs font-semibold text-muted hover:bg-cloud hover:text-ink transition"
            title={`Switch Theme (${resolvedTheme})`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
            )}
            {!isSidebarCollapsed && (
              <span className="capitalize">{resolvedTheme} Mode</span>
            )}
          </button>

          {/* User Sign Out */}
          <div className="flex items-center justify-between rounded-2xl border border-line bg-cloud/30 p-2 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white font-black text-xs">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <p className="font-bold text-ink truncate text-[11px]">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[9px] text-muted truncate">Admin</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg p-1 text-muted hover:text-red-500 transition"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-72 bg-surface p-5 flex flex-col border-r border-line shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 p-1 text-accent border border-accent/20">
                    <BrandLogo variant="monogramReg" className="h-full w-auto text-accent" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-display font-black text-sm text-ink tracking-tight">UPDATE BRO®</span>
                    <span className="text-[8px] font-black uppercase text-accent mt-0.5 tracking-wider truncate max-w-[140px]">
                      {tagline}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-1.5 text-muted hover:bg-cloud"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition ${
                        isActive
                          ? 'bg-accent text-white shadow-glow'
                          : 'text-muted hover:bg-cloud hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-line pt-4 space-y-2">
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-cloud/50 px-4 py-3 text-xs font-bold text-ink"
                >
                  <ExternalLink className="h-4 w-4 text-accent" />
                  <span>View Storefront</span>
                </a>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
