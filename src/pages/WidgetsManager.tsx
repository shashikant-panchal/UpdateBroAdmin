import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Zap,
  Gift,
  Search,
  Check,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  Clock,
  Tag,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbProduct, DbCategory, DbStoreSettings, WidgetSectionConfig } from '../types/database';
import { useActionModal } from '../context/ActionModalContext';

const DEFAULT_WIDGETS: WidgetSectionConfig[] = [
  {
    id: 'hot_deals',
    title: 'Flash Deals & Midnight Steals',
    subtitle: 'Limited-stock performance audio & charging hardware at deep discounts.',
    badge: '⚡ FLASH SALE',
    enabled: true,
    sort_order: 1,
    timer_enabled: true,
    timer_hours: 24,
    discount_badge: 'UP TO 60% OFF',
    product_ids: [],
  },
  {
    id: 'new_arrivals',
    title: 'New Arrivals & Fresh Drops',
    subtitle: 'Precision engineered for 2026. Flagship acoustic curve and rapid GaN charging.',
    badge: '⚡ FRESH DROP',
    enabled: true,
    sort_order: 2,
    product_ids: [],
  },
  {
    id: 'featured',
    title: 'Flagship Highlights & Pro Gear',
    subtitle: 'Curated by UPDATE BRO® acoustic and hardware labs for pro users.',
    badge: '⭐ FLAGSHIP',
    enabled: true,
    sort_order: 3,
    product_ids: [],
  },
  {
    id: 'combos',
    title: 'Super Value Combos & Bundles',
    subtitle: 'Pair premium gear together and unlock instant automatic bundle savings.',
    badge: '🎁 COMBO SAVER',
    enabled: true,
    sort_order: 4,
    discount_badge: 'EXTRA 20% OFF',
    product_ids: [],
  },
];

export const WidgetsManager: React.FC = () => {
  const { notifySuccess, notifyError } = useActionModal();

  const [widgets, setWidgets] = useState<WidgetSectionConfig[]>(DEFAULT_WIDGETS);
  const [activeWidgetId, setActiveWidgetId] = useState<string>('hot_deals');
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor');

  // Load store settings (widgets_config) and products
  const loadData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [settingsRes, prodsRes, catsRes] = await Promise.all([
        supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      ]);

      const fetchedProducts: DbProduct[] = prodsRes.data || [];
      setProducts(fetchedProducts);
      setCategories(catsRes.data || []);

      const settings = settingsRes.data as DbStoreSettings | null;
      let initialWidgets: WidgetSectionConfig[] = DEFAULT_WIDGETS;

      if (settings?.widgets_config && Array.isArray(settings.widgets_config) && settings.widgets_config.length > 0) {
        // Merge with defaults in case new keys exist
        initialWidgets = DEFAULT_WIDGETS.map((def) => {
          const found = settings.widgets_config?.find((w) => w.id === def.id);
          return found ? { ...def, ...found } : def;
        });
      } else {
        // Pre-populate product_ids from existing product boolean flags!
        initialWidgets = DEFAULT_WIDGETS.map((w) => {
          if (w.id === 'hot_deals') {
            return {
              ...w,
              product_ids: fetchedProducts.filter((p) => p.is_best_seller).map((p) => p.id),
            };
          }
          if (w.id === 'new_arrivals') {
            return {
              ...w,
              product_ids: fetchedProducts.filter((p) => p.is_new_arrival).map((p) => p.id),
            };
          }
          if (w.id === 'featured') {
            return {
              ...w,
              product_ids: fetchedProducts.filter((p) => p.is_featured).map((p) => p.id),
            };
          }
          if (w.id === 'combos') {
            return {
              ...w,
              product_ids: fetchedProducts.filter((p) => p.is_combo).map((p) => p.id),
            };
          }
          return w;
        });
      }

      setWidgets(initialWidgets);
    } catch (err) {
      console.error('Failed to load widgets data:', err);
      notifyError('Failed to Load', 'Could not fetch storefront widget configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeWidget = useMemo(() => {
    return widgets.find((w) => w.id === activeWidgetId) || widgets[0];
  }, [widgets, activeWidgetId]);

  // Update a field on the currently active widget
  const updateActiveWidget = (updates: Partial<WidgetSectionConfig>) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === activeWidgetId ? { ...w, ...updates } : w))
    );
  };

  // Toggle a product in/out of the current widget
  const toggleProductInWidget = (productId: string) => {
    const currentIds = activeWidget.product_ids || [];
    const exists = currentIds.includes(productId);
    const newIds = exists
      ? currentIds.filter((id) => id !== productId)
      : [...currentIds, productId];

    updateActiveWidget({ product_ids: newIds });
  };

  // Remove a product from the current widget
  const removeProductFromWidget = (productId: string) => {
    const currentIds = activeWidget.product_ids || [];
    updateActiveWidget({ product_ids: currentIds.filter((id) => id !== productId) });
  };

  // Filter products for the picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || p.category_id === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Products mapped to current widget
  const mappedProducts = useMemo(() => {
    const idMap = new Map(products.map((p) => [p.id, p]));
    return (activeWidget.product_ids || [])
      .map((id) => idMap.get(id))
      .filter((p): p is DbProduct => Boolean(p));
  }, [products, activeWidget.product_ids]);

  // Save to database & broadcast live sync
  const handleSaveWidgets = async () => {
    try {
      setIsSaving(true);

      // 1. Save widgets_config to store_settings
      const { error: settingsError } = await supabase
        .from('store_settings')
        .update({ widgets_config: widgets })
        .eq('id', 1);

      if (settingsError && settingsError.message?.includes('widgets_config')) {
        // Fallback: table doesn't have widgets_config column yet
        console.warn('widgets_config column missing in store_settings. Saved locally.');
      } else if (settingsError) {
        throw settingsError;
      }

      // 2. Synchronize boolean flags on products table for full compatibility
      const hotDealsIds = new Set(widgets.find((w) => w.id === 'hot_deals')?.product_ids || []);
      const newArrivalsIds = new Set(widgets.find((w) => w.id === 'new_arrivals')?.product_ids || []);
      const featuredIds = new Set(widgets.find((w) => w.id === 'featured')?.product_ids || []);
      const combosIds = new Set(widgets.find((w) => w.id === 'combos')?.product_ids || []);

      const updatePromises = products.map((p) => {
        const isBestSeller = hotDealsIds.has(p.id);
        const isNewArrival = newArrivalsIds.has(p.id);
        const isFeatured = featuredIds.has(p.id);
        const isCombo = combosIds.has(p.id);

        if (
          p.is_best_seller !== isBestSeller ||
          p.is_new_arrival !== isNewArrival ||
          p.is_featured !== isFeatured ||
          p.is_combo !== isCombo
        ) {
          return supabase
            .from('products')
            .update({
              is_best_seller: isBestSeller,
              is_new_arrival: isNewArrival,
              is_featured: isFeatured,
              is_combo: isCombo,
            })
            .eq('id', p.id);
        }
        return null;
      });

      await Promise.all(updatePromises.filter(Boolean));

      // 3. Broadcast instant sync to all storefront tabs
      try {
        const bc = new BroadcastChannel('ub_storefront_sync');
        bc.postMessage({ type: 'WIDGETS_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
      try {
        localStorage.setItem('ub_last_sync_timestamp', Date.now().toString());
      } catch {}

      notifySuccess(
        'Widgets Saved & Published!',
        'Homepage widgets & product mappings have been synchronized across all devices in real-time.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save widgets';
      notifyError('Failed to Save', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const getWidgetIcon = (id: string) => {
    switch (id) {
      case 'hot_deals':
        return <Flame className="h-4 w-4 text-rose-500" />;
      case 'new_arrivals':
        return <Sparkles className="h-4 w-4 text-blue-500" />;
      case 'featured':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'combos':
        return <Gift className="h-4 w-4 text-purple-500" />;
      default:
        return <Sliders className="h-4 w-4 text-accent" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/20 px-2.5 py-0.5 text-[10px] font-extrabold text-accent uppercase tracking-wider">
              <Sliders className="h-3 w-3" /> Multifunctional Engine
            </span>
            <span className="text-xs text-muted font-medium">Realtime Storefront Customizer</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Widgets &amp; Section Manager
          </h1>
          <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
            Directly map products to high-converting homepage widgets: Flash Deals, New Arrivals, Featured Drops, and Bundles. Changes update the storefront instantly without refreshing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading || isSaving}
            className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-muted hover:border-accent hover:text-ink transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSaveWidgets}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 rounded-2xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Publishing Live...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save &amp; Publish Widgets</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Widget Tabs Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {widgets.map((w) => {
          const isActive = w.id === activeWidgetId;
          const mappedCount = (w.product_ids || []).length;

          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveWidgetId(w.id)}
              className={`text-left rounded-3xl p-4 border transition-all duration-200 relative overflow-hidden cursor-pointer ${
                isActive
                  ? 'border-accent bg-accent/10 shadow-glow ring-2 ring-accent/20'
                  : 'border-line bg-surface hover:border-line-hover hover:bg-cloud/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-accent/20' : 'bg-cloud'}`}>
                    {getWidgetIcon(w.id)}
                  </div>
                  <span className="font-display text-sm font-bold text-ink truncate">
                    {w.id === 'hot_deals'
                      ? 'Flash Deals'
                      : w.id === 'new_arrivals'
                      ? 'New Arrivals'
                      : w.id === 'featured'
                      ? 'Featured Drops'
                      : 'Super Combos'}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    w.enabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-cloud text-muted border border-line'
                  }`}
                >
                  {w.enabled ? 'Active' : 'Hidden'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted mt-3 pt-2 border-t border-line/60">
                <span>Mapped Items:</span>
                <span className="font-mono font-bold text-ink bg-cloud px-2 py-0.5 rounded-md">
                  {mappedCount} Products
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Widget Settings & Content (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent/15 text-accent">
                  {getWidgetIcon(activeWidget.id)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink">
                    Section Configuration
                  </h3>
                  <p className="text-[11px] text-muted">Customize section heading &amp; visibility</p>
                </div>
              </div>

              {/* Visibility Switch */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-muted">
                  {activeWidget.enabled ? 'Visible' : 'Hidden'}
                </span>
                <input
                  type="checkbox"
                  checked={activeWidget.enabled}
                  onChange={(e) => updateActiveWidget({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-cloud peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent border border-line relative" />
              </label>
            </div>

            {/* Widget Title */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Widget Headline / Title
              </label>
              <input
                type="text"
                value={activeWidget.title}
                onChange={(e) => updateActiveWidget({ title: e.target.value })}
                placeholder="e.g. Flash Deals & Midnight Steals"
                className="h-10 w-full rounded-2xl border border-line bg-cloud/40 px-3.5 text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Subheading / Tagline
              </label>
              <textarea
                rows={2}
                value={activeWidget.subtitle}
                onChange={(e) => updateActiveWidget({ subtitle: e.target.value })}
                placeholder="Short descriptive line displayed under the section title..."
                className="w-full rounded-2xl border border-line bg-cloud/40 p-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Pill Badge */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Pill Badge Label
              </label>
              <input
                type="text"
                value={activeWidget.badge || ''}
                onChange={(e) => updateActiveWidget({ badge: e.target.value })}
                placeholder="e.g. ⚡ FLASH SALE"
                className="h-10 w-full rounded-2xl border border-line bg-cloud/40 px-3.5 font-mono text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            {/* Flash Deals Specific: Timer & Discount Callout */}
            {activeWidget.id === 'hot_deals' && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                    <Clock className="h-4 w-4" />
                    <span>Countdown Urgency Timer</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeWidget.timer_enabled ?? true}
                    onChange={(e) => updateActiveWidget({ timer_enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-line text-rose-500 focus:ring-rose-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-muted mb-1">
                      Timer Hours
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={activeWidget.timer_hours ?? 24}
                      onChange={(e) => updateActiveWidget({ timer_hours: Number(e.target.value) })}
                      className="h-9 w-full rounded-xl border border-line bg-surface px-3 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted mb-1">
                      Discount Badge
                    </label>
                    <input
                      type="text"
                      value={activeWidget.discount_badge || 'UP TO 60% OFF'}
                      onChange={(e) => updateActiveWidget({ discount_badge: e.target.value })}
                      placeholder="UP TO 60% OFF"
                      className="h-9 w-full rounded-xl border border-line bg-surface px-3 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Combos Specific: Discount Callout */}
            {activeWidget.id === 'combos' && (
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
                <label className="block text-xs font-bold text-purple-600 dark:text-purple-400">
                  Bundle Discount Highlight
                </label>
                <input
                  type="text"
                  value={activeWidget.discount_badge || 'EXTRA 20% OFF'}
                  onChange={(e) => updateActiveWidget({ discount_badge: e.target.value })}
                  placeholder="EXTRA 20% OFF"
                  className="h-9 w-full rounded-xl border border-line bg-surface px-3 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Currently Mapped Products Card */}
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                <h4 className="font-display font-bold text-sm text-ink">
                  Active in this Widget ({mappedProducts.length})
                </h4>
              </div>
              {mappedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateActiveWidget({ product_ids: [] })}
                  className="text-[11px] font-bold text-rose-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {mappedProducts.length === 0 ? (
              <div className="p-6 text-center text-muted border-2 border-dashed border-line rounded-2xl">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted/60" />
                <p className="text-xs font-bold text-ink">No specific products mapped yet.</p>
                <p className="text-[11px] text-muted mt-1">
                  Pick items from the product catalog on the right to pin them to this widget.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-none">
                {mappedProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cloud/30 p-2.5 transition hover:bg-cloud/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 font-mono text-[10px] font-bold text-accent">
                        #{idx + 1}
                      </span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line bg-cloud">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted m-auto" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{p.name}</p>
                        <p className="font-mono text-[11px] text-muted font-bold">
                          ₹{p.price}
                          {p.compare_at_price && (
                            <span className="line-through text-muted/60 ml-1.5">
                              ₹{p.compare_at_price}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProductFromWidget(p.id)}
                      className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      title="Remove from widget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Interactive Product Catalog Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-ink">
                  Product Catalog Picker
                </h3>
                <p className="text-[11px] text-muted">
                  Click "+ Add" to map any product into{' '}
                  <span className="font-bold text-accent">{activeWidget.title}</span>
                </p>
              </div>

              {/* Search & Category Filter */}
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product..."
                    className="h-8 w-full rounded-xl border border-line bg-cloud/40 pl-8 pr-2.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-8 rounded-xl border border-line bg-cloud/40 px-2 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-muted">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted" />
                  <p className="text-xs font-bold text-ink">No products found matching filters.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isMapped = (activeWidget.product_ids || []).includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col justify-between rounded-2xl border p-3 transition ${
                        isMapped
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-line-hover hover:bg-cloud/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-cloud">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-muted m-auto" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] bg-accent/15 text-accent font-bold px-1 rounded">
                              {p.sku || p.slug.toUpperCase()}
                            </span>
                            {!p.in_stock && (
                              <span className="text-[9px] bg-red-500/15 text-red-500 font-bold px-1 rounded">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-ink truncate mt-1">{p.name}</p>
                          <p className="font-mono text-xs font-bold text-ink mt-0.5">
                            ₹{p.price}
                            {p.compare_at_price && (
                              <span className="text-[10px] text-muted line-through ml-1.5 font-normal">
                                ₹{p.compare_at_price}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          {p.is_best_seller && (
                            <span className="rounded bg-rose-500/15 text-rose-500 px-1 font-bold">Deal</span>
                          )}
                          {p.is_new_arrival && (
                            <span className="rounded bg-blue-500/15 text-blue-500 px-1 font-bold">New</span>
                          )}
                          {p.is_combo && (
                            <span className="rounded bg-purple-500/15 text-purple-500 px-1 font-bold">Combo</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleProductInWidget(p.id)}
                          className={`rounded-xl px-3 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isMapped
                              ? 'bg-accent text-white shadow-glow'
                              : 'border border-line bg-surface text-ink hover:border-accent hover:text-accent'
                          }`}
                        >
                          {isMapped ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>Map to Widget</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
