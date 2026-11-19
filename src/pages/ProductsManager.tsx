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
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbCategory, DbProduct } from '../types/database';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useActionModal } from '../context/ActionModalContext';

export const ProductsManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formComparePrice, setFormComparePrice] = useState<number | ''>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>(['']);
  const [formInStock, setFormInStock] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          .select('id, name, slug, description, price, compare_at_price, category_id, images, highlights, in_stock, is_featured, created_at')
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
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormPrice('');
    setFormComparePrice('');
    setFormCategoryId(categories[0]?.id || '');
    setFormImages([]);
    setFormHighlights(['']);
    setFormInStock(true);
    setFormIsFeatured(false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: DbProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormDescription(p.description || '');
    setFormPrice(p.price);
    setFormComparePrice(p.compare_at_price || '');
    setFormCategoryId(p.category_id || '');
    setFormImages(p.images || []);
    setFormHighlights(p.highlights && p.highlights.length > 0 ? p.highlights : ['']);
    setFormInStock(p.in_stock);
    setFormIsFeatured(p.is_featured);
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

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDescription.trim() || null,
        price: Number(formPrice),
        compare_at_price: formComparePrice !== '' ? Number(formComparePrice) : null,
        category_id: formCategoryId || null,
        images: formImages.filter((img) => img.trim() !== ''),
        highlights: formHighlights.filter((h) => h.trim() !== ''),
        in_stock: formInStock,
        is_featured: formIsFeatured,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        notifySuccess('Product Updated!', `"${payload.name}" was updated successfully.`);
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        notifySuccess('Product Created!', `"${payload.name}" is now live in store.`);
      }

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
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_featured: product.is_featured } : p))
      );
      notifyError('Update Failed', 'Could not update featured status.');
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

    return matchesSearch && matchesCat;
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
            Manage catalog items, pricing, multi-image Cloudinary media, and live stock statuses.
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
                <th className="py-3.5 px-4 text-center">In Stock</th>
                <th className="py-3.5 px-4 text-center">Featured</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-2 text-xs font-semibold">Loading products...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Package className="mx-auto h-8 w-8 text-muted mb-2" />
                    <p className="text-xs font-bold text-ink">No products found.</p>
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
                            <p className="font-bold text-ink truncate">{p.name}</p>
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
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(p)}
                          className={`rounded-full p-1.5 transition ${
                            p.is_featured ? 'text-amber-500 bg-amber-500/10' : 'text-muted hover:text-ink'
                          }`}
                        >
                          <Star className={`h-4 w-4 ${p.is_featured ? 'fill-amber-500' : ''}`} />
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

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter product title..."
                    className="h-11 w-full rounded-2xl border border-line bg-cloud/30 px-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
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
                    label="Product Gallery (Cloudinary Optimized)"
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

                <div className="pt-2 border-t border-line">
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Product Description
                  </label>
                  <textarea
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide in-depth hardware engineering specs, driver size, battery playtime..."
                    className="w-full rounded-2xl border border-line bg-cloud/30 p-3.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                  <label className="flex items-center gap-3 rounded-2xl border border-line bg-cloud/20 p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formInStock}
                      onChange={(e) => setFormInStock(e.target.checked)}
                      className="h-4 w-4 rounded text-accent focus:ring-accent"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">In Stock</span>
                      <span className="text-[10px] text-muted">Visible for customer purchase</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-line bg-cloud/20 p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded text-accent focus:ring-accent"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">Featured / Bestseller</span>
                      <span className="text-[10px] text-muted">Promoted on homepage showcase</span>
                    </div>
                  </label>
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
