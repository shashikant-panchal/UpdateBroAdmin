import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  UserCheck,
  ShieldAlert,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  X,
  CreditCard,
  Download,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbProfile, DbOrder } from '../types/database';

interface UserWithStats extends DbProfile {
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  recentOrders: DbOrder[];
}

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchUsersData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [profilesRes, ordersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('orders')
          .select('id, order_number, user_id, customer_name, customer_phone, total_amount, status, payment_status, created_at')
          .order('created_at', { ascending: false }),
      ]);

      const rawProfiles = (profilesRes.data as DbProfile[]) || [];
      const rawOrders = (ordersRes.data as DbOrder[]) || [];

      // Map orders to user_ids
      const ordersByUser = new Map<string, DbOrder[]>();
      rawOrders.forEach((ord) => {
        if (ord.user_id) {
          const list = ordersByUser.get(ord.user_id) || [];
          list.push(ord);
          ordersByUser.set(ord.user_id, list);
        }
      });

      const combined: UserWithStats[] = rawProfiles.map((p) => {
        const userOrders = ordersByUser.get(p.id) || [];
        const totalSpent = userOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        const lastOrder = userOrders[0];

        return {
          ...p,
          ordersCount: userOrders.length,
          totalSpent,
          lastOrderDate: lastOrder?.created_at || null,
          recentOrders: userOrders,
        };
      });

      setUsers(combined);
    } catch (err) {
      console.warn('Failed to load users list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldId);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.shipping_address || '').toLowerCase().includes(q);

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'admin' && u.role === 'admin') ||
        (roleFilter === 'customer' && u.role !== 'admin');

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const customersCount = users.filter((u) => u.role !== 'admin').length;
    const adminsCount = users.filter((u) => u.role === 'admin').length;
    const activeBuyersCount = users.filter((u) => u.ordersCount > 0).length;
    const totalRevenueFromUsers = users.reduce((acc, u) => acc + u.totalSpent, 0);

    return {
      totalUsers,
      customersCount,
      adminsCount,
      activeBuyersCount,
      totalRevenueFromUsers,
    };
  }, [users]);

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Shipping Address', 'Total Orders', 'Total Spent (INR)', 'Joined Date'];
    const rows = users.map((u) => [
      `"${u.full_name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.role}"`,
      `"${(u.shipping_address || '').replace(/"/g, '""')}"`,
      u.ordersCount,
      u.totalSpent,
      `"${new Date(u.created_at).toLocaleDateString('en-IN')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `updatebro_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-accent border border-accent/20">
              User Directory
            </span>
            <span className="text-xs text-muted">All Registered Members &amp; Customers</span>
          </div>
          <h1 className="font-display text-2xl font-black text-ink">
            Users &amp; Customer Accounts
          </h1>
          <p className="text-xs text-muted mt-0.5">
            View profiles, addresses, contact numbers, and purchase metrics of everyone registered on UPDATE BRO®.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsersData}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink hover:border-accent transition cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted text-xs font-bold mb-1">
            <span>Total Members</span>
            <Users className="h-4 w-4 text-accent" />
          </div>
          <p className="font-mono text-2xl font-black text-ink">{stats.totalUsers}</p>
          <p className="text-[10px] text-muted mt-0.5">Registered accounts</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted text-xs font-bold mb-1">
            <span>Customers</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.customersCount}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Active retail buyers</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted text-xs font-bold mb-1">
            <span>Active Buyers</span>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </div>
          <p className="font-mono text-2xl font-black text-blue-500">{stats.activeBuyersCount}</p>
          <p className="text-[10px] text-muted mt-0.5">Placed at least 1 order</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted text-xs font-bold mb-1">
            <span>Total Customer Spend</span>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <p className="font-mono text-2xl font-black text-purple-600 dark:text-purple-400">
            ₹{stats.totalRevenueFromUsers.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Lifetime orders value</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone number, address..."
            className="h-10 w-full rounded-xl border border-line bg-cloud pl-10 pr-4 text-xs text-ink focus:border-accent focus:outline-none"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-line bg-cloud p-1">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            All ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('customer')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              roleFilter === 'customer'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Customers ({stats.customersCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              roleFilter === 'admin'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Admins ({stats.adminsCount})
          </button>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="rounded-3xl border border-line bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-8 w-8 text-accent animate-spin mb-3" />
            <p className="text-xs font-bold text-ink">Loading customer directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 text-muted mb-2" />
            <h3 className="font-bold text-sm text-ink">No users match your criteria</h3>
            <p className="text-xs text-muted mt-1">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-cloud/40 text-[10.5px] font-black uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Shipping Address</th>
                  <th className="py-3 px-4 text-center">Role</th>
                  <th className="py-3 px-4 text-right">Orders / Spend</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filteredUsers.map((u) => {
                  const initial = (u.full_name || u.email || 'U')[0].toUpperCase();
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-cloud/30 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display font-black text-xs uppercase shadow-sm ${
                              isAdmin
                                ? 'bg-accent text-white'
                                : 'bg-cloud text-ink border border-line'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <p className="font-display font-bold text-ink flex items-center gap-1.5">
                              {u.full_name || 'Anonymous User'}
                            </p>
                            <p className="font-mono text-[10px] text-muted flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              Joined {new Date(u.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-1">
                        {u.email && (
                          <div className="flex items-center gap-1.5 text-ink">
                            <Mail className="h-3.5 w-3.5 text-muted shrink-0" />
                            <a
                              href={`mailto:${u.email}`}
                              className="font-mono text-[11px] hover:text-accent truncate max-w-[200px]"
                            >
                              {u.email}
                            </a>
                          </div>
                        )}
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 text-ink">
                            <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <a
                              href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              {u.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-muted italic">No phone saved</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {u.shipping_address ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                            <p className="text-[11px] text-ink line-clamp-2 leading-tight">
                              {u.shipping_address}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted italic">No shipping address</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${
                            isAdmin
                              ? 'bg-accent/15 border border-accent/30 text-accent'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isAdmin ? <ShieldAlert className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          {u.role || 'customer'}
                        </span>
                      </td>

                      {/* Orders & Total Spend */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-mono text-xs font-black text-ink">
                          ₹{u.totalSpent.toLocaleString('en-IN')}
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          {u.ordersCount} {u.ordersCount === 1 ? 'order' : 'orders'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="inline-flex items-center gap-1 rounded-xl border border-line bg-cloud/60 px-3 py-1.5 text-[11px] font-bold text-ink hover:border-accent hover:text-accent transition cursor-pointer"
                        >
                          <span>Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details & Order History Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white font-display font-black text-base uppercase shadow-glow">
                    {(selectedUser.full_name || selectedUser.email || 'U')[0]}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-ink">
                      {selectedUser.full_name || 'Member Details'}
                    </h3>
                    <p className="font-mono text-xs text-muted">{selectedUser.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-full p-2 text-muted hover:bg-cloud hover:text-ink cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
                {/* Contact & Meta Card */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-line bg-cloud/40 p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-muted uppercase">Phone Number</p>
                    <p className="font-mono font-bold text-ink">
                      {selectedUser.phone || 'Not provided'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-line bg-cloud/40 p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-muted uppercase">Account Role</p>
                    <p className="font-bold text-accent uppercase">{selectedUser.role}</p>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-line bg-cloud/40 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted uppercase">Shipping Address</p>
                      {selectedUser.shipping_address && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedUser.shipping_address!, 'modal-addr')}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline cursor-pointer"
                        >
                          {copiedField === 'modal-addr' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedField === 'modal-addr' ? 'Copied' : 'Copy Address'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      {selectedUser.shipping_address || 'No default shipping address recorded yet.'}
                    </p>
                  </div>
                </div>

                {/* Purchase Summary */}
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase">Lifetime Value</p>
                    <p className="font-mono text-xl font-black text-ink">
                      ₹{selectedUser.totalSpent.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted uppercase">Total Orders</p>
                    <p className="font-mono text-xl font-black text-accent">
                      {selectedUser.ordersCount}
                    </p>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted mb-3">
                    Order History ({selectedUser.recentOrders.length})
                  </h4>

                  {selectedUser.recentOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-muted">
                      No orders placed yet by this customer.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedUser.recentOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-line bg-surface text-xs"
                        >
                          <div>
                            <p className="font-mono font-bold text-ink">{ord.order_number}</p>
                            <p className="text-[10px] text-muted">
                              {new Date(ord.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-ink block">
                              ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                            </span>
                            <span className="rounded-full bg-cloud px-2 py-0.5 font-mono text-[9px] font-bold text-muted">
                              {ord.status} • {ord.payment_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-line pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="h-10 rounded-xl bg-ink px-5 text-xs font-bold text-canvas transition hover:opacity-90 dark:bg-white dark:text-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
