import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ActionModalProvider } from './context/ActionModalContext';
import { AdminGuard } from './components/AdminGuard';
import { AdminLayout, type AdminTab } from './layouts/AdminLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { OrdersManager } from './pages/OrdersManager';
import { ProductsManager } from './pages/ProductsManager';
import { WidgetsManager } from './pages/WidgetsManager';
import { CategoriesManager } from './pages/CategoriesManager';
import { BannersManager } from './pages/BannersManager';
import { StoreSettings } from './pages/StoreSettings';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const AdminApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('orders')) return 'orders';
    if (path.includes('products')) return 'products';
    if (path.includes('widgets') || path.includes('sections')) return 'widgets';
    if (path.includes('categories')) return 'categories';
    if (path.includes('banners')) return 'banners';
    if (path.includes('settings')) return 'settings';
    return 'overview';
  });

  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const handleSelectTab = (tab: AdminTab) => {
    setCurrentTab(tab);
    const newPath = tab === 'overview' ? '/' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('orders')) setCurrentTab('orders');
      else if (path.includes('products')) setCurrentTab('products');
      else if (path.includes('widgets') || path.includes('sections')) setCurrentTab('widgets');
      else if (path.includes('categories')) setCurrentTab('categories');
      else if (path.includes('banners')) setCurrentTab('banners');
      else if (path.includes('settings')) setCurrentTab('settings');
      else setCurrentTab('overview');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch and subscribe to pending orders count
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Pending', 'Confirmed', 'Processing']);

        if (!error && count !== null) {
          setPendingOrdersCount(count);
        }
      } catch (err) {
        console.warn('Pending count load error:', err);
      }
    };

    fetchPendingCount();

    const channel = supabase
      .channel('admin-pending-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchPendingCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AdminGuard>
      <AdminLayout
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingOrdersCount={pendingOrdersCount}
      >
        {currentTab === 'overview' && (
          <DashboardOverview onNavigateTab={handleSelectTab} />
        )}
        {currentTab === 'orders' && <OrdersManager />}
        {currentTab === 'products' && <ProductsManager />}
        {currentTab === 'widgets' && <WidgetsManager />}
        {currentTab === 'categories' && <CategoriesManager />}
        {currentTab === 'banners' && <BannersManager />}
        {currentTab === 'settings' && <StoreSettings />}
      </AdminLayout>
    </AdminGuard>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActionModalProvider>
          <AdminApp />
        </ActionModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
