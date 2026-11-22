import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbStoreSettings } from '../types/database';
import { useActionModal } from '../context/ActionModalContext';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../context/AuthContext';
import { notifyStorefrontSync } from '../lib/syncStorefront';

export const StoreSettings: React.FC = () => {
  const { notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [settings, setSettings] = useState<DbStoreSettings>({
    id: 1,
    announcement_text: '',
    whatsapp_number: '',
    shipping_charge: 0,
    free_shipping_above: 0,
    cod_enabled: true,
    tagline: 'Power Your World',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          ...data,
          tagline: data.tagline || data.announcement_text || 'Power Your World',
        } as DbStoreSettings);
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

      // 1. Ensure authenticated admin session with Supabase
      let { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        const authRes = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        if (authRes.error) {
          throw new Error(`Admin authentication failed: ${authRes.error.message}`);
        }
        session = authRes.data.session;
      }

      const taglineVal = (settings.tagline || 'Power Your World').trim();

      // Dual-write to announcement_text (which exists in the live schema) and tagline
      const payload: Record<string, unknown> = {
        announcement_text: taglineVal,
        whatsapp_number: (settings.whatsapp_number || '').trim(),
        shipping_charge: Number(settings.shipping_charge || 0),
        free_shipping_above: Number(settings.free_shipping_above || 0),
        cod_enabled: settings.cod_enabled ?? true,
        tagline: taglineVal,
      };

      // 2. Direct update with select() to guarantee row updated in PostgreSQL
      let { data, error } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', 1)
        .select();

      // If tagline column is not yet in Supabase schema cache, update without tagline
      if (
        error &&
        (error.message?.toLowerCase().includes('tagline') ||
          error.details?.toLowerCase().includes('tagline') ||
          (error as any)?.code === 'PGRST204' ||
          (error as any)?.code === '42703')
      ) {
        delete payload.tagline;
        const retry = await supabase
          .from('store_settings')
          .update(payload)
          .eq('id', 1)
          .select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      // If update returned 0 rows, re-authenticate and retry
      if (!data || data.length === 0) {
        await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        delete payload.tagline;
        const retryAuth = await supabase
          .from('store_settings')
          .update(payload)
          .eq('id', 1)
          .select();
        data = retryAuth.data;
        if (retryAuth.error) throw retryAuth.error;
      }

      if (!data || data.length === 0) {
        throw new Error('Database write did not modify any rows. Please refresh and try again.');
      }

      // Update local state from database-confirmed result
      const confirmed = data[0] as DbStoreSettings;
      setSettings((prev) => ({
        ...prev,
        ...confirmed,
        tagline: confirmed.tagline || confirmed.announcement_text || taglineVal,
      }));

      setSuccessMsg(`Brand tagline "${taglineVal}" saved successfully! Live across storefront.`);
      notifyStorefrontSync();
      notifySuccess(
        'Tagline Saved!',
        `"${taglineVal}" is now live underneath the UPDATE BRO® logo.`
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

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-cloud/80 rounded" />
              <div className="h-4 w-48 bg-cloud/80 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-32 bg-cloud/80 rounded" />
              <div className="h-11 w-full bg-cloud/80 rounded-2xl" />
              <div className="h-3 w-64 bg-cloud/60 rounded" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-7 w-28 bg-cloud/80 rounded-xl" />
              <div className="h-7 w-36 bg-cloud/80 rounded-xl" />
              <div className="h-7 w-32 bg-cloud/80 rounded-xl" />
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="h-4 w-40 bg-cloud/80 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-11 bg-cloud/80 rounded-2xl" />
              <div className="h-11 bg-cloud/80 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
        {/* Section: Brand Tagline Configuration */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
              Storefront Brand Tagline
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">
              Tagline Below UPDATE BRO® Logo
            </label>
            <input
              type="text"
              required
              value={settings.tagline ?? 'Power Your World'}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              placeholder="Power Your World"
              className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Dynamically updates the brand slogan displayed directly underneath the UPDATE BRO® logo across the customer header, mobile drawer, and footer.
            </p>

            {/* Quick Presets */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted font-medium">Quick Presets:</span>
              {[
                'Power Your World',
                'Sound. Power. Performance.',
                'Every Device, Everywhere.',
                'Engineered For The Bold',
                'Next-Gen Audio & Gear',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSettings({ ...settings, tagline: preset })}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    settings.tagline === preset
                      ? 'border-accent bg-accent text-white shadow-sm'
                      : 'border-line bg-cloud/40 text-muted hover:border-accent hover:text-ink'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Tagline'}</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
