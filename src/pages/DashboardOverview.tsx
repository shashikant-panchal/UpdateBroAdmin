import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  Package,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbOrder, DbProduct } from '../types/database';

interface DashboardOverviewProps {
  onNavigateTab: (tab: 'orders' | 'products' | 'categories' | 'banners' | 'settings') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    outOfStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<DbOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<DbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_phone, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('products')
          .select('id, name, slug, price, in_stock, images')
          .order('created_at', { ascending: false }),
      ]);

      const orders = (ordersRes.data as DbOrder[]) || [];
      const products = (productsRes.data as DbProduct[]) || [];

      const totalRevenue = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Processing').length;
      const outOfStock = products.filter((p) => !p.in_stock);

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        pendingOrders,
        totalProducts: products.length,
        outOfStockProducts: outOfStock.length,
      });

      setRecentOrders(orders.slice(0, 5));
      setLowStockProducts(outOfStock.slice(0, 4));
    } catch (err) {
      console.warn('Dashboard metrics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      desc: 'All completed orders',
      icon: IndianRupee,
      trend: stats.totalOrders > 0 ? `${stats.totalOrders} live orders recorded` : 'Live synchronized',
      color: 'from-amber-500/20 to-orange-500/5 text-accent border-accent/30',
    },
    {
      label: 'Active / Pending Orders',
      value: stats.pendingOrders,
      desc: 'Requiring fulfillment',
      icon: Clock,
      trend: stats.pendingOrders > 0 ? `${stats.pendingOrders} awaiting dispatch` : 'All orders fulfilled',
      color: 'from-blue-500/20 to-cyan-500/5 text-blue-500 border-blue-500/30',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      desc: 'Lifetime store volume',
      icon: ShoppingBag,
      trend: stats.totalOrders > 0 ? 'Realtime synchronized' : 'Awaiting first order',
      color: 'from-emerald-500/20 to-teal-500/5 text-emerald-500 border-emerald-500/30',
    },
    {
      label: 'Catalog Products',
      value: stats.totalProducts,
      desc: stats.outOfStockProducts > 0 ? `${stats.outOfStockProducts} currently out of stock` : 'All items in stock',
      icon: Package,
      trend: `${stats.totalProducts} items in database`,
      color: 'from-purple-500/20 to-indigo-500/5 text-purple-500 border-purple-500/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Dashboard Overview</h1>
          <p className="text-xs text-muted mt-1">
            Realtime performance metrics, fulfillment pipeline, and catalog health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-accent transition disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="rounded-2xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition flex items-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Manage Orders</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${card.color} bg-surface`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{card.label}</span>
                <div className="rounded-2xl bg-surface/80 p-2 shadow-xs">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-display text-2xl font-black text-ink">{card.value}</h3>
                <p className="mt-1 text-[11px] text-muted">{card.desc}</p>
              </div>

              <div className="mt-3 border-t border-line/60 pt-2 text-[10px] font-bold text-ink">
                {card.trend}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Recent Orders Feed + Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="font-display text-base font-black text-ink">Recent Orders Feed</h3>
              <p className="text-xs text-muted">Latest customer purchases awaiting fulfillment</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-line">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">
                No orders received yet. Placed orders will appear here in real time.
              </p>
            ) : (
              recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between py-3.5 hover:bg-cloud/30 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cloud text-ink font-mono font-bold text-xs">
                      UB
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">{ord.order_number}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            ord.status === 'Delivered'
                              ? 'bg-green-500/15 text-green-500'
                              : ord.status === 'Cancelled'
                              ? 'bg-red-500/15 text-red-500'
                              : 'bg-accent/15 text-accent'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-ink font-semibold">{ord.customer_name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-ink">₹{ord.total_amount}</p>
                    <p className="text-[10px] text-muted">
                      {new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-display text-sm font-bold text-ink">Stock Alerts</h3>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-xs font-bold text-green-600">All products in stock</p>
                <p className="text-[11px] text-muted mt-0.5">No immediate restock required.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-cloud/40 p-2.5"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-ink truncate">{p.name}</p>
                      <span className="text-[10px] font-mono text-red-500 font-bold">OUT OF STOCK</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('products')}
                      className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-bold text-accent border border-line hover:border-accent transition shrink-0"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-line bg-cloud/50 p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Store Quick Controls
            </h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('products')}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold text-ink hover:border-accent transition"
              >
                <span>Add / Edit Products</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('banners')}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold text-ink hover:border-accent transition"
              >
                <span>Update Hero Banners</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold text-ink hover:border-accent transition"
              >
                <span>Store &amp; Shipping Settings</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
