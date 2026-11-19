import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  MessageCircle,
  Truck,
  CreditCard,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbStoreSettings } from '../types/database';
import { useActionModal } from '../context/ActionModalContext';

export const StoreSettings: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [settings, setSettings] = useState<DbStoreSettings>({
    id: 1,
    announcement_text: '',
    whatsapp_number: '',
    shipping_charge: 0,
    free_shipping_above: 0,
    cod_enabled: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('store_settings')
        .select('id, announcement_text, whatsapp_number, shipping_charge, free_shipping_above, cod_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        setSettings(data as DbStoreSettings);
      }
    } catch (err) {
      console.warn('Failed to load store settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      const msg = 'Database service unavailable. Please try again.';
      setErrorMsg(msg);
      notifyError('Configuration Missing', msg);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const { error } = await supabase
        .from('store_settings')
        .upsert({
          id: 1,
          announcement_text: settings.announcement_text.trim(),
          whatsapp_number: settings.whatsapp_number.trim(),
          shipping_charge: Number(settings.shipping_charge),
          free_shipping_above: Number(settings.free_shipping_above),
          cod_enabled: settings.cod_enabled,
        });

      if (error) throw error;

      setSuccessMsg('Store settings updated successfully! Live across storefront.');
      notifySuccess(
        'Store Settings Saved!',
        'Global policies, marquee announcement & shipping rules are now live across storefront.'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setErrorMsg(msg);
      notifyError('Failed to Save', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeAllDemoData = async () => {
    const confirmed = await confirm({
      title: 'Wipe All Demo & Sample Data?',
      message:
        'This will permanently delete all demo products, categories, hero banners, and sample orders so you can start with a 100% clean store. This action cannot be undone.',
      confirmText: 'Yes, Wipe Everything',
      cancelText: 'Keep Data',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setIsPurging(true);
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      notifySuccess(
        'Catalog Cleared!',
        'All demo data wiped. Your store is now completely fresh for real products.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear data';
      notifyError('Purge Failed', msg);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Store Settings</h1>
          <p className="text-xs text-muted mt-1">
            Global store policies, marquee announcements, WhatsApp support link, and shipping thresholds.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-accent transition self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-xs font-bold text-green-500"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-500"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Marquee Announcement */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-accent">
            <Bell className="h-4 w-4" />
            <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
              Top Announcement Marquee
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">
              Live Announcement Ticker Text
            </label>
            <input
              type="text"
              required
              value={settings.announcement_text}
              onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
              placeholder="Enter marquee announcement text..."
              className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Appears on the continuous marquee strip running along the very top of the customer storefront.
            </p>
          </div>
        </div>

        {/* Section 2: WhatsApp VIP Support Link */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <MessageCircle className="h-4 w-4" />
            <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
              WhatsApp Customer Support
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">
              Official WhatsApp Number (with Country Code)
            </label>
            <input
              type="text"
              required
              value={settings.whatsapp_number}
              onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
              placeholder="+91XXXXXXXXXX"
              className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Used in order drawer WhatsApp actions and support floating buttons.
            </p>
          </div>
        </div>

        {/* Section 3: Shipping Fees & Thresholds */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Truck className="h-4 w-4" />
            <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
              Shipping &amp; Delivery Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5">
                Standard Shipping Charge (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={settings.shipping_charge}
                onChange={(e) =>
                  setSettings({ ...settings, shipping_charge: Number(e.target.value) })
                }
                placeholder="49"
                className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1.5">
                Free Shipping Order Threshold (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={settings.free_shipping_above}
                onChange={(e) =>
                  setSettings({ ...settings, free_shipping_above: Number(e.target.value) })
                }
                placeholder="499"
                className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Cash On Delivery (COD) */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-accent">
            <CreditCard className="h-4 w-4" />
            <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
              Payment Methods
            </h3>
          </div>

          <label className="flex items-center gap-3.5 rounded-2xl border border-line bg-cloud/20 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cod_enabled}
              onChange={(e) => setSettings({ ...settings, cod_enabled: e.target.checked })}
              className="h-4 w-4 rounded text-accent focus:ring-accent"
            />
            <div>
              <span className="text-xs font-bold text-ink block">Enable Cash on Delivery (COD)</span>
              <span className="text-[11px] text-muted">
                Allow customers to place orders without upfront payment at checkout.
              </span>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Purge All Demo Data */}
      <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-4 w-4" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                Reset / Purge Demo Catalog
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              Permanently remove all sample products, categories, hero banners, and test orders. Keeps your database 100% clean for your real products.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePurgeAllDemoData}
            disabled={isPurging}
            className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-center"
          >
            {isPurging ? 'Purging...' : 'Wipe All Demo Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
