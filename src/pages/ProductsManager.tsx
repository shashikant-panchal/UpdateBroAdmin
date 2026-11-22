import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Star,
  AlertCircle,
  Flame,
  Sparkles,
  Gift,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbCategory, DbProduct } from '../types/database';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useActionModal } from '../context/ActionModalContext';
import { notifyStorefrontSync } from '../lib/syncStorefront';

type ProductTagFilter = 'all' | 'bestseller' | 'newarrival' | 'combo' | 'featured' | 'catalogonly' | 'outofstock';

export const ProductsManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<ProductTagFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formComparePrice, setFormComparePrice] = useState<number | ''>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>(['']);
  const [formWarranty, setFormWarranty] = useState('1 Year Official Replacement Warranty');
  const [formSpecs, setFormSpecs] = useState<{ label: string; value: string }[]>([]);
  const [formInStock, setFormInStock] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsNewArrival, setFormIsNewArrival] = useState(false);
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateProductId = (productList: DbProduct[]) => {
    const nextNum = productList.length + 1;
    const candidate = `PRD${String(nextNum).padStart(4, '0')}`;
    const exists = productList.some((p) => p.sku === candidate);
    if (!exists) return candidate;
    return `PRD${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [prodsRes, catsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('categories')
          .select('id, name, slug')
          .order('name', { ascending: true }),
      ]);

      if (!prodsRes.error && prodsRes.data) {
        setProducts(prodsRes.data as DbProduct[]);
      }
      if (!catsRes.error && catsRes.data) {
        setCategories(catsRes.data as DbCategory[]);
      }
    } catch (err) {
      console.warn('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormSku(generateProductId(products));
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormPrice('');
    setFormComparePrice('');
    setFormCategoryId(categories[0]?.id || '');
    setFormImages([]);
    setFormHighlights(['']);
    setFormWarranty('1 Year Official Replacement Warranty');
    setFormSpecs([
      { label: 'Bluetooth Version', value: '5.4' },
      { label: 'Battery Backup', value: '48 Hours Total' },
      { label: 'Fast Charging', value: '10 Mins = 5 Hours' },
      { label: 'Water Resistance', value: 'IPX5' },
    ]);
    setFormInStock(true);
    setFormIsFeatured(false);
    setFormIsBestSeller(false);
    setFormIsNewArrival(false);
    setFormIsCombo(false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: DbProduct) => {
    setEditingProduct(p);
    setFormSku(p.sku || p.slug.toUpperCase());
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormDescription(p.description || '');
    setFormPrice(p.price);
    setFormComparePrice(p.compare_at_price || '');
    setFormCategoryId(p.category_id || '');
    setFormImages(p.images || []);

    // Cleanly extract canonical warranty without duplication
    let detectedWarranty = p.warranty?.trim() || '';
    if (!detectedWarranty && p.highlights) {
      const wHl = p.highlights.find((h) => /warranty/i.test(h));
      if (wHl) {
        detectedWarranty = wHl.replace(/^.*?:\s*/i, '').trim();
      }
    }
    if (!detectedWarranty && p.specs) {
      const wSpec = p.specs.find((s) => /warranty/i.test(s.label));
      if (wSpec) {
        detectedWarranty = wSpec.value?.trim() || '';
      }
    }
    if (!detectedWarranty) {
      detectedWarranty = '1 Year Official Replacement Warranty';
    }

    // Filter out warranty from highlights so it is NEVER duplicated in highlights list
    const cleanHighlights = (p.highlights || []).filter(
      (h) => !/warranty/i.test(h) && h.trim() !== ''
    );

    // Filter out warranty from specs so it is NEVER duplicated in technical specs list
    const cleanRawSpecs = (
      p.specs && p.specs.length > 0
        ? p.specs
        : (p.highlights || []).map((h) => {
            const idx = h.indexOf(':');
            return idx > 0
              ? { label: h.slice(0, idx).trim(), value: h.slice(idx + 1).trim() }
              : { label: 'Spec', value: h };
          })
    ).filter((s) => !/warranty/i.test(s.label) && !/warranty/i.test(s.value) && s.label.trim() !== '');

    setFormHighlights(cleanHighlights.length > 0 ? cleanHighlights : ['']);
    setFormWarranty(detectedWarranty);
    setFormSpecs(cleanRawSpecs);
    setFormInStock(p.in_stock);
    setFormIsFeatured(p.is_featured ?? false);
    setFormIsBestSeller(p.is_best_seller ?? false);
    setFormIsNewArrival(p.is_new_arrival ?? false);
    setFormIsCombo(p.is_combo ?? false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProduct) {
      const slugified = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormSlug(slugified);
    }
  };

  const handleDescriptionChange = (val: string) => {
    const lines = val.split('\n');
    if (lines.length > 5) {
      setFormDescription(lines.slice(0, 5).join('\n'));
      return;
    }
    if (val.length > 320) {
      setFormDescription(val.slice(0, 320));
      return;
    }
    setFormDescription(val);
  };

  const handleAddSpec = () => {
    setFormSpecs([...formSpecs, { label: '', value: '' }]);
  };

  const handleUpdateSpec = (index: number, field: 'label' | 'value', val: string) => {
    const updated = [...formSpecs];
    updated[index] = { ...updated[index], [field]: val };
    setFormSpecs(updated);
  };

  const handleRemoveSpec = (index: number) => {
    setFormSpecs(formSpecs.filter((_, i) => i !== index));
  };

  const handleAddHighlight = () => {
    setFormHighlights([...formHighlights, '']);
  };

  const handleUpdateHighlight = (index: number, val: string) => {
    const updated = [...formHighlights];
    updated[index] = val;
    setFormHighlights(updated);
  };

  const handleRemoveHighlight = (index: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim() || formPrice === '') {
      setErrorMsg('Please fill in Name, Slug, and Price.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Clean specs - warranty has its own dedicated field and should not be a spec
      const cleanSpecs = formSpecs.filter(
        (s) => s.label.trim() !== '' && s.value.trim() !== '' && !/warranty/i.test(s.label) && !/warranty/i.test(s.value)
      );

      // Clean highlights - strip any legacy embedded warranty strings
      const cleanHighlights = formHighlights.filter(
        (h) => h.trim() !== '' && !/warranty/i.test(h)
      );

      const canonicalWarranty = formWarranty.trim() || '1 Year Official Replacement Warranty';

      const payload: Record<string, unknown> = {
        name: formName.trim(),
        slug: formSlug.trim(),
        sku: formSku.trim() || generateProductId(products),
        description: formDescription.trim() || null,
        price: Number(formPrice),
        compare_at_price: formComparePrice !== '' ? Number(formComparePrice) : null,
        category_id: formCategoryId || null,
        images: formImages.filter((img) => img.trim() !== ''),
        highlights: cleanHighlights,
        specs: cleanSpecs,
        warranty: canonicalWarranty,
        in_stock: formInStock,
        is_featured: formIsFeatured,
        is_best_seller: formIsBestSeller,
        is_new_arrival: formIsNewArrival,
        is_combo: formIsCombo,
      };

      let saveErr: any = null;
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        saveErr = error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        saveErr = error;
      }

      // If database is missing optional new columns (sku, warranty, specs), retry gracefully
      if (
        saveErr &&
        (saveErr.message?.includes('sku') ||
          saveErr.message?.includes('warranty') ||
          saveErr.message?.includes('specs'))
      ) {
        const safePayload = { ...payload };
        delete safePayload.sku;
        delete safePayload.warranty;
        delete safePayload.specs;

        // Embed single canonical warranty into highlights without duplicating
        const fallbackHighlights = cleanHighlights.filter((h) => !/warranty/i.test(h));
        if (canonicalWarranty) fallbackHighlights.push(`Warranty: ${canonicalWarranty}`);
        cleanSpecs.forEach((s) => {
          const specStr = `${s.label}: ${s.value}`;
          if (!fallbackHighlights.some((h) => h.toLowerCase() === specStr.toLowerCase())) {
            fallbackHighlights.push(specStr);
          }
        });
        safePayload.highlights = fallbackHighlights;

        if (editingProduct) {
          const { error: retryErr } = await supabase
            .from('products')
            .update(safePayload)
            .eq('id', editingProduct.id);
          if (retryErr) throw retryErr;
        } else {
          const { error: retryErr } = await supabase.from('products').insert(safePayload);
          if (retryErr) throw retryErr;
        }
      } else if (saveErr) {
        throw saveErr;
      }

      // Broadcast instant sync and invalidate storefront client cache
      notifyStorefrontSync();

      notifySuccess(
        editingProduct ? 'Product Updated' : 'Product Created',
        `"${payload.name}" is now live with updated warranty & specs.`
      );

      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      setErrorMsg(msg);
      notifyError('Failed to Save', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStock = async (product: DbProduct) => {
    const newStock = !product.in_stock;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, in_stock: newStock } : p))
    );

    try {
      await supabase
        .from('products')
        .update({ in_stock: newStock })
        .eq('id', product.id);

      notifyInfo(
        newStock ? 'Marked In Stock' : 'Marked Out of Stock',
        `"${product.name}" inventory status updated.`
      );
      notifyStorefrontSync();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, in_stock: product.in_stock } : p))
      );
      notifyError('Update Failed', 'Could not update inventory status.');
    }
  };

  const handleToggleFeatured = async (product: DbProduct) => {
    const newFeatured = !product.is_featured;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_featured: newFeatured } : p))
    );

    try {
      await supabase
        .from('products')
        .update({ is_featured: newFeatured })
        .eq('id', product.id);

      notifyInfo(
        newFeatured ? 'Featured on Storefront' : 'Removed from Featured',
        `"${product.name}" showcase preference saved.`
      );
      notifyStorefrontSync();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_featured: product.is_featured } : p))
      );
      notifyError('Update Failed', 'Could not update featured status.');
    }
  };

  const handleToggleBestSeller = async (product: DbProduct) => {
    const newVal = !product.is_best_seller;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_best_seller: newVal } : p))
    );

    try {
      await supabase
        .from('products')
        .update({ is_best_seller: newVal })
        .eq('id', product.id);

      notifyInfo(
        newVal ? 'Tagged as Best Seller' : 'Removed from Best Sellers',
        `"${product.name}" widget tag updated.`
      );
      notifyStorefrontSync();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_best_seller: product.is_best_seller } : p))
      );
      notifyError('Update Failed', 'Could not update Best Seller tag.');
    }
  };

  const handleToggleNewArrival = async (product: DbProduct) => {
    const newVal = !product.is_new_arrival;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_new_arrival: newVal } : p))
    );

    try {
      await supabase
        .from('products')
        .update({ is_new_arrival: newVal })
        .eq('id', product.id);

      notifyInfo(
        newVal ? 'Tagged as New Arrival' : 'Removed from New Arrivals',
        `"${product.name}" widget tag updated.`
      );
      notifyStorefrontSync();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_new_arrival: product.is_new_arrival } : p))
      );
      notifyError('Update Failed', 'Could not update New Arrival tag.');
    }
  };

  const handleToggleCombo = async (product: DbProduct) => {
    const newVal = !product.is_combo;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_combo: newVal } : p))
    );

    try {
      await supabase
        .from('products')
        .update({ is_combo: newVal })
        .eq('id', product.id);

      notifyInfo(
        newVal ? 'Tagged as Power Combo' : 'Removed from Combos',
        `"${product.name}" combo widget status updated.`
      );
      notifyStorefrontSync();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_combo: product.is_combo } : p))
      );
      notifyError('Update Failed', 'Could not update Combo tag.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Product?',
      message: `Are you sure you want to delete "${name}"? This will permanently remove it from the storefront.`,
      confirmText: 'Yes, Delete',
      cancelText: 'Keep Product',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        notifySuccess('Product Deleted', `"${name}" was deleted successfully.`);
        notifyStorefrontSync();
      } else {
        notifyError('Delete Failed', error.message);
      }
    } catch (err: unknown) {
      notifyError('Delete Error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;

    const matchesTag =
      tagFilter === 'all' ||
      (tagFilter === 'bestseller' && p.is_best_seller) ||
      (tagFilter === 'newarrival' && p.is_new_arrival) ||
      (tagFilter === 'combo' && p.is_combo) ||
      (tagFilter === 'featured' && p.is_featured) ||
      (tagFilter === 'catalogonly' && !p.is_best_seller && !p.is_new_arrival && !p.is_combo && !p.is_featured) ||
      (tagFilter === 'outofstock' && !p.in_stock);

    return matchesSearch && matchesCat && matchesTag;
  });

  const liveDiscountPercent =
    formPrice !== '' && formComparePrice !== '' && Number(formComparePrice) > Number(formPrice)
      ? Math.round(((Number(formComparePrice) - Number(formPrice)) / Number(formComparePrice)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Products Inventory</h1>
          <p className="text-xs text-muted mt-1">
            Manage catalog items, pricing, Best Sellers, New Arrivals, Combos, and live stock statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Tabs for Quick Tag Filtering */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: `All Products (${products.length})` },
          { key: 'bestseller', label: `🔥 Best Sellers (${products.filter((p) => p.is_best_seller).length})` },
          { key: 'newarrival', label: `⚡ New Arrivals (${products.filter((p) => p.is_new_arrival).length})` },
          { key: 'combo', label: `🎁 Combos (${products.filter((p) => p.is_combo).length})` },
          { key: 'featured', label: `⭐ Featured (${products.filter((p) => p.is_featured).length})` },
          {
            key: 'catalogonly',
            label: `📦 Catalog Only (${
              products.filter((p) => !p.is_best_seller && !p.is_new_arrival && !p.is_combo && !p.is_featured).length
            })`,
          },
          { key: 'outofstock', label: `Out of Stock (${products.filter((p) => !p.in_stock).length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTagFilter(tab.key as ProductTagFilter)}
            className={`whitespace-nowrap rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              tagFilter === tab.key
                ? 'bg-accent text-white shadow-glow'
                : 'border border-line bg-surface text-muted hover:border-accent hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or slug..."
            className="h-10 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-2xl border border-line bg-surface px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none w-full sm:w-auto"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-cloud/50 text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Price / MRP</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Storefront Badges &amp; Widgets</th>
                <th className="py-3.5 px-4 text-center">In Stock</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`product-skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-cloud/80 border border-line" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3.5 w-40 bg-cloud/80 rounded-md" />
                          <div className="h-2.5 w-24 bg-cloud/60 rounded-md" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-16 bg-cloud/80 rounded-md" />
                        <div className="h-2.5 w-12 bg-cloud/60 rounded-md" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-20 bg-cloud/80 rounded-xl" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5">
                        <div className="h-5 w-16 bg-cloud/80 rounded-full" />
                        <div className="h-5 w-14 bg-cloud/60 rounded-full" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="h-6 w-11 bg-cloud/80 rounded-full mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                        <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Package className="mx-auto h-8 w-8 text-muted mb-2" />
                    <p className="text-xs font-bold text-ink">No products found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="hover:bg-cloud/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-line bg-cloud flex items-center justify-center">
                            {p.images?.[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted" />
                            )}
                          </div>
                          <div className="truncate max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-ink truncate">{p.name}</p>
                              <span className="font-mono text-[9px] bg-accent/15 text-accent font-bold px-1.5 py-0.5 rounded shrink-0">
                                {p.sku || p.slug.toUpperCase()}
                              </span>
                            </div>
                            <p className="font-mono text-[10px] text-muted truncate">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-ink">₹{p.price}</p>
                        {p.compare_at_price && (
                          <p className="font-mono text-[11px] text-muted line-through">
                            ₹{p.compare_at_price}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-xl bg-cloud px-2.5 py-1 text-[11px] font-semibold text-muted">
                          {cat?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-muted font-medium">Placement:</span>
                            {!(p.is_best_seller || p.is_new_arrival || p.is_combo || p.is_featured) ? (
                              <span className="rounded-md bg-cloud px-1.5 py-0.5 font-semibold text-muted/80">
                                Catalog Only
                              </span>
                            ) : (
                              <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-bold text-accent">
                                Active in Widgets
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Best Seller toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleBestSeller(p)}
                              title={p.is_best_seller ? 'Click to remove from Best Sellers & Flash Deals' : 'Click to add to Best Sellers & Flash Deals'}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shadow-sm ${
                                p.is_best_seller
                                  ? 'bg-rose-500 text-white shadow-rose-500/20'
                                  : 'bg-cloud text-muted border border-line hover:border-rose-500/40 hover:text-rose-500'
                              }`}
                            >
                              <Flame className={`h-3 w-3 ${p.is_best_seller ? 'fill-white' : ''}`} />
                              <span>Best Seller</span>
                            </button>

                            {/* New Arrival toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleNewArrival(p)}
                              title={p.is_new_arrival ? 'Click to remove from New Arrivals' : 'Click to add to New Arrivals'}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shadow-sm ${
                                p.is_new_arrival
                                  ? 'bg-blue-500 text-white shadow-blue-500/20'
                                  : 'bg-cloud text-muted border border-line hover:border-blue-500/40 hover:text-blue-500'
                              }`}
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>New</span>
                            </button>

                            {/* Combo toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleCombo(p)}
                              title={p.is_combo ? 'Click to remove from Combos widget' : 'Click to add to Combos widget'}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shadow-sm ${
                                p.is_combo
                                  ? 'bg-purple-500 text-white shadow-purple-500/20'
                                  : 'bg-cloud text-muted border border-line hover:border-purple-500/40 hover:text-purple-500'
                              }`}
                            >
                              <Gift className="h-3 w-3" />
                              <span>Combo</span>
                            </button>

                            {/* Featured toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(p)}
                              title={p.is_featured ? 'Click to remove from Featured' : 'Click to feature on homepage'}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shadow-sm ${
                                p.is_featured
                                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                                  : 'bg-cloud text-muted border border-line hover:border-amber-500/40 hover:text-amber-500'
                              }`}
                            >
                              <Star className={`h-3 w-3 ${p.is_featured ? 'fill-white' : ''}`} />
                              <span>Featured</span>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStock(p)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            p.in_stock ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              p.in_stock ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="rounded-xl border border-line bg-surface p-2 text-ink hover:border-accent hover:text-accent transition"
                            title="Edit Product"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="rounded-xl border border-line bg-surface p-2 text-muted hover:border-red-500 hover:text-red-500 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl text-ink"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-black text-base text-ink">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-2 text-muted hover:bg-cloud hover:text-ink transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5">
                {errorMsg && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. UPDATE BRO Storm ANC Earbuds"
                      className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                        Product ID (SKU) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormSku(generateProductId(products))}
                        title="Generate random Product ID"
                        className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Randomize ID</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                      placeholder="PRD0001"
                      className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Slug / URL Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="product-slug"
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="1499"
                      className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                        MRP (₹)
                      </label>
                      {liveDiscountPercent > 0 && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-black text-accent">
                          {liveDiscountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formComparePrice}
                      onChange={(e) =>
                        setFormComparePrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="2999"
                      className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-line">
                  <CloudinaryUploader
                    images={formImages}
                    onChange={setFormImages}
                    multiple={true}
                    maxFiles={6}
                    preset="product"
                    label="Product Photos & Gallery"
                  />
                </div>

                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">
                      Key Feature Highlights
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHighlight}
                      className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Highlight</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formHighlights.map((hl, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                          placeholder={`Highlight #${idx + 1}`}
                          className="h-9 flex-1 rounded-xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                        {formHighlights.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(idx)}
                            className="rounded-xl p-2 text-muted hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description (Restricted to 4-5 lines) */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">
                      Product Description (Max 4–5 Lines)
                    </label>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span
                        className={
                          formDescription.split('\n').length >= 5
                            ? 'text-amber-500 font-bold'
                            : 'text-muted'
                        }
                      >
                        {formDescription ? formDescription.split('\n').length : 0} / 5 lines
                      </span>
                      <span className="text-muted">•</span>
                      <span
                        className={
                          formDescription.length >= 300 ? 'text-amber-500 font-bold' : 'text-muted'
                        }
                      >
                        {formDescription.length} / 320 chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={formDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Provide concise hardware overview: sound profile, playtime, premium materials (max 4-5 lines)..."
                    className="w-full rounded-2xl border border-line bg-cloud/30 p-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    Restricted to 4–5 lines for clean, balanced presentation in customer quick-view dialogs.
                  </p>
                </div>

                {/* Warranty Coverage */}
                <div className="pt-2 border-t border-line">
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Official Warranty Coverage
                  </label>
                  <input
                    type="text"
                    value={formWarranty}
                    onChange={(e) => setFormWarranty(e.target.value)}
                    placeholder="1 Year Official Replacement Warranty"
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted font-medium">Quick Presets:</span>
                    {[
                      '1 Year Official Replacement Warranty',
                      '6 Months Brand Warranty',
                      '2 Years Extended Warranty',
                      '7 Days Hassle-Free Replacement',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormWarranty(preset)}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition ${
                          formWarranty === preset
                            ? 'border-accent bg-accent text-white'
                            : 'border-line bg-cloud/40 text-muted hover:border-accent hover:text-ink'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold text-muted uppercase tracking-wider block">
                        Technical Specifications
                      </label>
                      <span className="text-[10px] text-muted">
                        Feeds the customer &ldquo;Technical Specs&rdquo; tab in product quick view.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="text-xs font-bold text-accent hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Spec Row</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formSpecs.map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={spec.label}
                          onChange={(e) => handleUpdateSpec(idx, 'label', e.target.value)}
                          placeholder="Spec (e.g. Battery Life)"
                          className="h-9 w-2/5 rounded-xl border border-line bg-cloud/30 px-3 text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                          placeholder="Value (e.g. 48 Hours Playtime)"
                          className="h-9 flex-1 rounded-xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpec(idx)}
                          className="rounded-xl p-2 text-muted hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                        Storefront Widget Placement &amp; Visibility
                      </label>
                      <p className="text-[11px] text-muted mt-0.5">
                        Products show in the general catalog by default. Select specific widgets below to showcase them on the homepage.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* In Stock */}
                    <label
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                        formInStock
                          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formInStock}
                        onChange={(e) => setFormInStock(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink block">In Stock &amp; Available</span>
                        <span className="text-[10px] text-muted">Customers can purchase this item</span>
                      </div>
                    </label>

                    {/* Best Seller / Flash Deal */}
                    <label
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                        formIsBestSeller
                          ? 'border-rose-500/50 bg-rose-500/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formIsBestSeller}
                        onChange={(e) => setFormIsBestSeller(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink block flex items-center gap-1">
                          <Flame className="h-3 w-3 text-rose-500 fill-rose-500" />
                          <span>Best Seller / Flash Deal</span>
                        </span>
                        <span className="text-[10px] text-muted">Exclusively feeds the Best Sellers &amp; Flash Deals section</span>
                      </div>
                    </label>

                    {/* New Arrival */}
                    <label
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                        formIsNewArrival
                          ? 'border-blue-500/50 bg-blue-500/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formIsNewArrival}
                        onChange={(e) => setFormIsNewArrival(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink block flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          <span>New Arrival Section</span>
                        </span>
                        <span className="text-[10px] text-muted">Exclusively feeds the New Arrivals showcase</span>
                      </div>
                    </label>

                    {/* Featured */}
                    <label
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                        formIsFeatured
                          ? 'border-amber-500/50 bg-amber-500/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formIsFeatured}
                        onChange={(e) => setFormIsFeatured(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink block flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span>Featured Spotlight</span>
                        </span>
                        <span className="text-[10px] text-muted">Promoted prominently on homepage hero grid</span>
                      </div>
                    </label>

                    {/* Power Combo */}
                    <label
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition sm:col-span-2 ${
                        formIsCombo
                          ? 'border-purple-500/50 bg-purple-500/10 shadow-sm'
                          : 'border-line bg-cloud/20 hover:border-muted/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formIsCombo}
                        onChange={(e) => setFormIsCombo(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink block flex items-center gap-1">
                          <Gift className="h-3 w-3 text-purple-500" />
                          <span>Power Combo Pack</span>
                        </span>
                        <span className="text-[10px] text-muted">Exclusively feeds the Value Combos &amp; Bundle Deals widget</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-line px-5 py-2.5 text-xs font-bold text-muted hover:text-ink transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-accent px-6 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
