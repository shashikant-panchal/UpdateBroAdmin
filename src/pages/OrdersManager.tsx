import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  Phone,
  MessageCircle,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BellRing,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbOrder, DbOrderItem, OrderStatus } from '../types/database';

interface OrderWithItems extends DbOrder {
  order_items: DbOrderItem[];
}

type FilterTab = 'All' | OrderStatus;

const TABS: FilterTab[] = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Dispatched',
  'Delivered',
  'Cancelled',
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  Pending: 'Confirmed',
  Confirmed: 'Processing',
  Processing: 'Dispatched',
  Dispatched: 'Delivered',
  Delivered: null,
  Cancelled: null,
};

const NEXT_LABELS: Record<OrderStatus, string> = {
  Pending: 'Confirm Order',
  Confirmed: 'Start Processing',
  Processing: 'Mark Dispatched',
  Dispatched: 'Mark Delivered',
  Delivered: 'Completed',
  Cancelled: 'Cancelled',
};

const PAGE_SIZE = 15;

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingNoteInput, setTrackingNoteInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('orders')
        .select(`
          id, order_number, user_id, customer_name, customer_phone,
          shipping_address, payment_method, subtotal, shipping_fee,
          total_amount, status, status_history, tracking_note, created_at, updated_at,
          order_items ( id, product_name, product_image, quantity, unit_price )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (activeTab !== 'All') {
        query = query.eq('status', activeTab);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const { data, count, error } = await query;

      if (!error && data) {
        setOrders(data as OrderWithItems[]);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.warn('Orders fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, page, searchQuery]);

  // Realtime subscription for incoming orders
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrd = payload.new as DbOrder;
            setNewOrderToast(`⚡ New order received: ${newOrd.order_number} (₹${newOrd.total_amount})`);
            setTimeout(() => setNewOrderToast(null), 5000);
            fetchOrders();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as DbOrder;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
            if (selectedOrder?.id === updated.id) {
              setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : null));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOrder?.id]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true);
      const updates: { status: OrderStatus; tracking_note?: string } = { status: newStatus };
      if (trackingNoteInput.trim()) {
        updates.tracking_note = trackingNoteInput.trim();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (!error && data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, tracking_note: data.tracking_note } : o))
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus, tracking_note: data.tracking_note } : null));
        }
        setTrackingNoteInput('');
      } else if (error) {
        alert(`Status update failed: ${error.message}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const openWhatsApp = (phone: string, orderNumber: string, customerName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const msg = encodeURIComponent(
      `Hello ${customerName}! This is UPDATE BRO® regarding your order ${orderNumber}. How can we assist you today?`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {newOrderToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-accent bg-surface/95 px-5 py-3.5 shadow-2xl backdrop-blur-xl text-ink"
          >
            <BellRing className="h-5 w-5 text-accent animate-bounce" />
            <span className="text-xs sm:text-sm font-bold">{newOrderToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Orders Management</h1>
          <p className="text-xs text-muted mt-1">
            Realtime customer orders, fulfillment steps, WhatsApp engagement &amp; dispatch tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-accent transition self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-accent text-white shadow-glow'
                    : 'bg-cloud/60 text-muted hover:bg-cloud hover:text-ink border border-line'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search UB-..., Name, Phone"
            className="h-10 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-cloud/50 text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-2 text-xs font-semibold">Loading orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <ShoppingBag className="mx-auto h-8 w-8 text-muted mb-2" />
                    <p className="text-xs font-bold text-ink">No orders matching this criteria.</p>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="cursor-pointer hover:bg-cloud/40 transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-accent">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-ink">{ord.customer_name}</p>
                      <p className="text-[11px] text-muted font-mono">{ord.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="truncate max-w-[180px] font-medium text-ink">
                        {ord.order_items?.map((i) => `${i.product_name} (${i.quantity})`).join(', ') || 'Item'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      ₹{ord.total_amount}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-muted">
                      {ord.payment_method}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          ord.status === 'Delivered'
                            ? 'bg-green-500/15 text-green-500'
                            : ord.status === 'Cancelled'
                            ? 'bg-red-500/15 text-red-500'
                            : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(ord);
                        }}
                        className="rounded-xl bg-cloud px-3 py-1.5 text-[11px] font-bold text-ink hover:bg-line transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)} to{' '}
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} orders
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-xl border border-line bg-surface p-1.5 text-ink hover:border-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono font-bold text-ink">Page {page}</span>
              <button
                type="button"
                disabled={page * PAGE_SIZE >= totalCount}
                onClick={() => setPage(page + 1)}
                className="rounded-xl border border-line bg-surface p-1.5 text-ink hover:border-accent disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-line bg-surface shadow-2xl text-ink"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-accent">
                      {selectedOrder.order_number}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        selectedOrder.status === 'Delivered'
                          ? 'bg-green-500/15 text-green-500'
                          : selectedOrder.status === 'Cancelled'
                          ? 'bg-red-500/15 text-red-500'
                          : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Placed {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full p-2 text-muted hover:bg-cloud hover:text-ink transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="rounded-2xl border border-line bg-cloud/40 p-4 space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-ink">{selectedOrder.customer_name}</h4>
                    <p className="font-mono text-xs text-muted">{selectedOrder.customer_phone}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-line/60">
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsApp(
                          selectedOrder.customer_phone,
                          selectedOrder.order_number,
                          selectedOrder.customer_name
                        )
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/25 transition"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp Customer</span>
                    </button>

                    <a
                      href={`tel:${selectedOrder.customer_phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink hover:border-accent transition"
                    >
                      <Phone className="h-3.5 w-3.5 text-accent" />
                      <span>Call Customer</span>
                    </a>
                  </div>

                  <div className="text-xs text-muted pt-2 border-t border-line/60">
                    <span className="font-bold text-ink flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      Shipping Address:
                    </span>
                    <p className="mt-1 leading-relaxed text-ink">{selectedOrder.shipping_address}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-accent/30 bg-accent-soft/20 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
                    Status Workflow Control
                  </h4>

                  {NEXT_STATUS[selectedOrder.status] && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        handleUpdateStatus(selectedOrder.id, NEXT_STATUS[selectedOrder.status]!)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
                    >
                      <span>{isUpdating ? 'Updating...' : `Advance to: ${NEXT_LABELS[selectedOrder.status]}`}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-muted mb-1">
                      Tracking / Courier Note (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingNoteInput}
                        onChange={(e) => setTrackingNoteInput(e.target.value)}
                        placeholder={selectedOrder.tracking_note || 'e.g. BlueDart AWB #981247'}
                        className="h-9 flex-1 rounded-xl border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isUpdating || !trackingNoteInput.trim()}
                        onClick={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status)}
                        className="rounded-xl bg-cloud px-3 text-xs font-bold text-ink hover:bg-line transition disabled:opacity-50"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>

                  {selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Delivered' && (
                    <div className="pt-2 border-t border-accent/20">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => {
                          if (confirm(`Cancel order ${selectedOrder.order_number}?`)) {
                            handleUpdateStatus(selectedOrder.id, 'Cancelled');
                          }
                        }}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Cancel this Order
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Purchased Items
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-line bg-cloud/20 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
                            <img
                              src={item.product_image || '/assets/ub-logo-official.jpg'}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink">{item.product_name}</p>
                            <p className="text-[11px] text-muted font-mono">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-ink">
                          ₹{item.unit_price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Audit Timeline
                  </h4>
                  <div className="space-y-3 border-l-2 border-line pl-4 text-xs">
                    {selectedOrder.status_history?.map((entry, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{entry.status}</span>
                          <span className="text-[10px] text-muted">
                            {new Date(entry.timestamp).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="mt-0.5 text-muted text-[11px]">{entry.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
