import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Save,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  Check,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbStoreSettings, CustomWidgetConfig } from '../types/database';
import { useActionModal } from '../context/ActionModalContext';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../context/AuthContext';
import { notifyStorefrontSync } from '../lib/syncStorefront';
import { CloudinaryUploader } from '../components/CloudinaryUploader';

const DEFAULT_WIDGET: CustomWidgetConfig = {
  id: 'special-launch-offer',
  title: 'Exclusive Launch Edition Combo',
  tagline: 'Special Launch Offer • Limited Drop',
  badge: 'LAUNCH SPECIAL',
  description: 'Limited edition festival bundle engineered for extreme speed and pro audio clarity. Includes universal precision fit and official warranty.',
  price: 1499,
  mrp: 2999,
  images: [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
  ],
  features: [
    'Universal Precision Phone Model Fit',
    'MagSafe Wireless Compatible',
    '1 Year Official Replacement Warranty',
    'Free Express 4-Hour Dispatch',
  ],
  is_active: true,
  button_text: 'Avail Offer',
  requires_device_selection: true,
};

export const CustomWidgetManager: React.FC = () => {
  const { notifySuccess, notifyError, confirm } = useActionModal();

  const [widget, setWidget] = useState<CustomWidgetConfig>(DEFAULT_WIDGET);
  const [hasExistingWidget, setHasExistingWidget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');
  const [previewImageIdx, setPreviewImageIdx] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');

  // Load existing custom_widget from store_settings
  const fetchWidget = async () => {
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
        const rawSettings = data as DbStoreSettings;
        if (rawSettings.custom_widget && typeof rawSettings.custom_widget === 'object') {
          setWidget({
            ...DEFAULT_WIDGET,
            ...rawSettings.custom_widget,
          });
          setHasExistingWidget(true);
        } else {
          setHasExistingWidget(false);
        }
      }
    } catch (err) {
      console.warn('Failed to load custom widget config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWidget();
  }, []);

  const ensureAdminAuth = async () => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      const authRes = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      if (authRes.error) {
        throw new Error(`Admin authentication required: ${authRes.error.message}`);
      }
    }
  };

  const handleSave = async (updatedWidget?: CustomWidgetConfig) => {
    const toSave = updatedWidget || widget;

    if (!toSave.title.trim()) {
      notifyError('Validation Error', 'Please enter a title for the custom widget.');
      return;
    }
    if (toSave.images.length === 0) {
      notifyError('Images Required', 'Please upload at least one image for the widget.');
      return;
    }

    try {
      setIsSaving(true);
      await ensureAdminAuth();

      const payload = {
        ...toSave,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('store_settings')
        .update({ custom_widget: payload })
        .eq('id', 1);

      if (error) throw error;

      setWidget(payload);
      setHasExistingWidget(true);
      notifyStorefrontSync();
      notifySuccess('Widget Saved', 'Custom event widget updated and synced with storefront instantly.');
    } catch (err: any) {
      console.error('Error saving custom widget:', err);
      notifyError('Save Failed', err.message || 'Could not save custom widget configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const nextState = !widget.is_active;
    const updated = { ...widget, is_active: nextState };
    setWidget(updated);
    await handleSave(updated);
  };

  const handleRemoveWidget = async () => {
    const confirmed = await confirm({
      title: 'Remove Custom Widget',
      message:
        'Are you sure you want to remove this custom widget from the storefront? The widget will be hidden and cleared.',
      confirmText: 'Remove Widget',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setIsSaving(true);
      await ensureAdminAuth();

      const { error } = await supabase
        .from('store_settings')
        .update({ custom_widget: null })
        .eq('id', 1);

      if (error) throw error;

      setWidget({ ...DEFAULT_WIDGET, is_active: false });
      setHasExistingWidget(false);
      notifyStorefrontSync();
      notifySuccess('Widget Removed', 'Custom widget has been removed from the storefront.');
    } catch (err: any) {
      notifyError('Removal Failed', err.message || 'Could not remove custom widget.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureText.trim()) return;
    const currentFeatures = widget.features || [];
    setWidget({
      ...widget,
      features: [...currentFeatures, newFeatureText.trim()],
    });
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idxToRemove: number) => {
    const currentFeatures = widget.features || [];
    setWidget({
      ...widget,
      features: currentFeatures.filter((_, idx) => idx !== idxToRemove),
    });
  };

  const discountPercent =
    widget.mrp > widget.price ? Math.round(((widget.mrp - widget.price) / widget.mrp) * 100) : 0;
  const savingsAmount = Math.max(0, widget.mrp - widget.price);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs font-bold text-muted uppercase tracking-wider">
            Loading Custom Widget Configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-orange-500 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="font-display text-2xl font-black text-ink tracking-tight">
              Custom Event Widget
            </h1>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
              Launch / Combo Drops
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Configure a highlight event widget displayed prominently right below category strips on the storefront.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Visibility Toggle */}
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
              widget.is_active
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {widget.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{widget.is_active ? 'Live on Storefront' : 'Hidden from Storefront'}</span>
          </button>

          {hasExistingWidget && (
            <button
              type="button"
              onClick={handleRemoveWidget}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:shadow-lg hover:shadow-accent/30 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Editor & Sticky Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Alert Banner */}
          <div
            className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
              widget.is_active
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-3 w-3 rounded-full ${
                  widget.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="text-xs font-bold">
                  {widget.is_active
                    ? 'Active: Widget is published on the storefront below categories'
                    : 'Draft/Disabled: Widget is currently hidden from visitors'}
                </p>
                <p className="text-[11px] text-muted">
                  Positioned right below category strip with the &ldquo;{widget.button_text || 'Avail Offer'}&rdquo; action.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleActive}
              className="text-xs font-extrabold underline cursor-pointer shrink-0"
            >
              {widget.is_active ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          {/* Section 1: Headline & Identity */}
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2 border-b border-line pb-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Offer Details &amp; Headings</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-ink mb-1.5">
                  Widget Headline / Title *
                </label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={(e) => setWidget({ ...widget, title: e.target.value })}
                  placeholder="e.g. Exclusive Launch Edition Combo"
                  className="w-full h-11 rounded-2xl border border-line bg-cloud px-4 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Tagline / Event Highlight Line
                </label>
                <input
                  type="text"
                  value={widget.tagline}
                  onChange={(e) => setWidget({ ...widget, tagline: e.target.value })}
                  placeholder="e.g. Special Launch Offer • Limited Drop"
                  className="w-full h-11 rounded-2xl border border-line bg-cloud px-4 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Badge Pill Text
                </label>
                <input
                  type="text"
                  value={widget.badge || ''}
                  onChange={(e) => setWidget({ ...widget, badge: e.target.value.toUpperCase() })}
                  placeholder="e.g. LAUNCH SPECIAL or COMBO OFFER"
                  className="w-full h-11 rounded-2xl border border-line bg-cloud px-4 font-mono text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-ink mb-1.5">
                  Offer Description
                </label>
                <textarea
                  rows={3}
                  value={widget.description}
                  onChange={(e) => setWidget({ ...widget, description: e.target.value })}
                  placeholder="Describe what makes this special event deal unique..."
                  className="w-full rounded-2xl border border-line bg-cloud p-3 text-xs text-ink focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Button Settings */}
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2 border-b border-line pb-3">
              <Zap className="h-4 w-4 text-accent" />
              <span>Pricing &amp; Action Button</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Offer Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={widget.price}
                    onChange={(e) => setWidget({ ...widget, price: Number(e.target.value) })}
                    className="w-full h-11 rounded-2xl border border-line bg-cloud pl-8 pr-4 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  MRP / Original Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={widget.mrp}
                    onChange={(e) => setWidget({ ...widget, mrp: Number(e.target.value) })}
                    className="w-full h-11 rounded-2xl border border-line bg-cloud pl-8 pr-4 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Button Text
                </label>
                <input
                  type="text"
                  value={widget.button_text || ''}
                  onChange={(e) => setWidget({ ...widget, button_text: e.target.value })}
                  placeholder="Avail Offer"
                  className="w-full h-11 rounded-2xl border border-line bg-cloud px-4 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Savings preview badge */}
            <div className="flex items-center gap-3 pt-2 text-xs">
              <span className="font-bold text-muted">Discount Preview:</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                {discountPercent}% OFF (Save ₹{savingsAmount.toLocaleString('en-IN')})
              </span>
            </div>

            {/* Phone selection requirement toggle */}
            <div className="pt-2 border-t border-line flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-accent" />
                  <span>Require Phone Device Selection in Cart</span>
                </p>
                <p className="text-[11px] text-muted">
                  Displays iPhone &amp; Samsung model selector below the item in the cart.
                </p>
              </div>

              <input
                type="checkbox"
                checked={widget.requires_device_selection ?? true}
                onChange={(e) =>
                  setWidget({ ...widget, requires_device_selection: e.target.checked })
                }
                className="h-5 w-5 rounded border-line text-accent focus:ring-accent cursor-pointer"
              />
            </div>
          </div>

          {/* Section 3: Multiple Images Upload */}
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2 border-b border-line pb-3">
              <Flame className="h-4 w-4 text-accent" />
              <span>Widget Images (Multiple Showcase)</span>
            </h2>

            <CloudinaryUploader
              images={widget.images || []}
              onChange={(imgs) => setWidget({ ...widget, images: imgs })}
              multiple={true}
              maxFiles={8}
              label="Upload Event Showcase Images"
              preset="product"
            />
          </div>

          {/* Section 4: Feature Bullets / Highlights */}
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2 border-b border-line pb-3">
              <Check className="h-4 w-4 text-accent stroke-[3]" />
              <span>Feature Highlights &amp; Perks</span>
            </h2>

            <form onSubmit={handleAddFeature} className="flex gap-2">
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                placeholder="e.g. 1 Year Replacement Warranty, Universal Fit..."
                className="flex-1 h-10 rounded-xl border border-line bg-cloud px-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-white hover:bg-accent-hover transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* List of active features */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(widget.features || []).map((feat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 rounded-xl bg-cloud border border-line px-3 py-1.5 text-xs font-medium text-ink"
                >
                  <span>{feat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-muted hover:text-rose-500 transition cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Storefront Card Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-accent" />
                <h3 className="font-display text-sm font-bold text-ink">
                  Storefront Live Preview
                </h3>
              </div>

              {/* Theme toggle for preview */}
              <button
                type="button"
                onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-cloud px-2.5 py-1 text-xs font-bold text-muted hover:text-ink transition cursor-pointer"
              >
                {previewTheme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                <span>{previewTheme === 'dark' ? 'Dark View' : 'Light View'}</span>
              </button>
            </div>

            {/* Simulated Storefront Container */}
            <div
              className={`rounded-2xl border transition-all p-4 ${
                previewTheme === 'dark'
                  ? 'bg-[#0E0F12] text-white border-white/10'
                  : 'bg-white text-zinc-900 border-zinc-200'
              }`}
            >
              <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-white/5 to-accent/10 p-4">
                {/* Image showcase */}
                <div className="relative aspect-square max-w-[260px] mx-auto rounded-xl overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center p-2">
                  {widget.images && widget.images.length > 0 ? (
                    <img
                      src={widget.images[Math.min(previewImageIdx, widget.images.length - 1)]}
                      alt={widget.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted">No image uploaded</span>
                  )}

                  {discountPercent > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-orange-500 px-2.5 py-0.5 text-[10px] font-black text-white">
                      <Flame className="h-2.5 w-2.5 fill-white" />
                      <span>{discountPercent}% OFF</span>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {widget.images && widget.images.length > 1 && (
                  <div className="mt-2 flex gap-1.5 justify-center">
                    {widget.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImageIdx(idx)}
                        className={`h-8 w-8 rounded-lg overflow-hidden border transition ${
                          previewImageIdx === idx ? 'border-accent' : 'border-line opacity-50'
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[9.5px] font-bold text-accent">
                      {widget.badge || 'LAUNCH SPECIAL'}
                    </span>
                    {widget.tagline && (
                      <span className="text-[10px] font-bold text-amber-500">
                        {widget.tagline}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display text-base font-extrabold leading-snug">
                    {widget.title || 'Widget Title'}
                  </h4>

                  {widget.description && (
                    <p className="text-[11px] opacity-70 line-clamp-2">
                      {widget.description}
                    </p>
                  )}

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="font-mono text-xl font-black">
                      ₹{(widget.price || 0).toLocaleString('en-IN')}
                    </span>
                    {widget.mrp > widget.price && (
                      <span className="font-mono text-xs opacity-50 line-through">
                        ₹{(widget.mrp || 0).toLocaleString('en-IN')}
                      </span>
                    )}
                    {savingsAmount > 0 && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 font-mono text-[10px] font-bold text-emerald-400">
                        Save ₹{savingsAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Avail Offer button simulation */}
                  <div className="pt-2">
                    <div className="w-full h-10 rounded-xl bg-gradient-to-r from-accent to-orange-500 text-white font-display text-xs font-extrabold flex items-center justify-center gap-2 shadow-md">
                      <span>{widget.button_text || 'Avail Offer'}</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                    <p className="mt-1.5 text-center text-[10px] opacity-60">
                      Directly navigates to bag &amp; unlocks phone model selection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
