import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbCategory } from '../types/database';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useActionModal } from '../context/ActionModalContext';
import { notifyStorefrontSync } from '../lib/syncStorefront';

export const CategoriesManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formImageUrl, setFormImageUrl] = useState<string[]>([]);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, sort_order, is_active, created_at')
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setCategories(data as DbCategory[]);
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormImageUrl([]);
    setFormSortOrder(categories.length + 1);
    setFormIsActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: DbCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormImageUrl(cat.image_url ? [cat.image_url] : []);
    setFormSortOrder(cat.sort_order);
    setFormIsActive(cat.is_active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      const slugified = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormSlug(slugified);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setErrorMsg('Please provide a name and slug.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        image_url: formImageUrl[0] || null,
        sort_order: formSortOrder,
        is_active: formIsActive,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
        notifySuccess('Category Updated', `"${payload.name}" updated successfully.`);
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
        notifySuccess('Category Created', `"${payload.name}" is now available in catalog.`);
      }

      notifyStorefrontSync();
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setErrorMsg(msg);
      notifyError('Failed to Save', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Category?',
      message: `Are you sure you want to delete category "${name}"? Products assigned to it will become uncategorized.`,
      confirmText: 'Yes, Delete',
      cancelText: 'Keep Category',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        notifySuccess('Category Deleted', `"${name}" was deleted successfully.`);
        notifyStorefrontSync();
      } else {
        notifyError('Delete Failed', error.message);
      }
    } catch (err: unknown) {
      notifyError('Delete Error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleActive = async (cat: DbCategory) => {
    const updated = !cat.is_active;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: updated } : c))
    );

    try {
      await supabase.from('categories').update({ is_active: updated }).eq('id', cat.id);
      notifyInfo(
        updated ? 'Category Activated' : 'Category Hidden',
        `"${cat.name}" visibility updated.`
      );
      notifyStorefrontSync();
    } catch {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: cat.is_active } : c))
      );
      notifyError('Update Failed', 'Could not update category status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Categories Manager</h1>
          <p className="text-xs text-muted mt-1">
            Organize catalog taxonomy, visual category tiles, and ordering on customer storefront.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`category-skeleton-${idx}`}
              className="animate-pulse rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-cloud/80 border border-line" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-cloud/80 rounded-md" />
                  <div className="h-3 w-16 bg-cloud/60 rounded-md" />
                </div>
              </div>
              <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                <div className="h-5 w-16 bg-cloud/80 rounded-full" />
                <div className="flex gap-1.5">
                  <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                  <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                </div>
              </div>
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted">
            <Layers className="mx-auto h-8 w-8 text-muted mb-2" />
            <p className="text-xs font-bold text-ink">No categories found. Create your first category!</p>
          </div>
        ) : (
          categories.map((cat) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4 hover:border-accent/40 transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-line bg-cloud flex items-center justify-center">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Layers className="h-6 w-6 text-muted" />
                  )}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-ink truncate">{cat.name}</h3>
                    <span className="font-mono text-[10px] text-muted">#{cat.sort_order}</span>
                  </div>
                  <p className="font-mono text-xs text-accent truncate">/{cat.slug}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line/60 pt-3">
                <button
                  type="button"
                  onClick={() => handleToggleActive(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cat.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-cloud text-muted'
                    }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cat.is_active ? 'bg-emerald-500' : 'bg-muted'}`} />
                  <span>{cat.is_active ? 'Active' : 'Inactive'}</span>
                </button>

                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="rounded-xl border border-line bg-cloud/50 p-2 text-ink hover:border-accent hover:text-accent transition"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="rounded-xl border border-line bg-cloud/50 p-2 text-muted hover:border-red-500 hover:text-red-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl text-ink"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h3 className="font-display font-black text-base text-ink">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-1.5 text-muted hover:bg-cloud"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter category name..."
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Slug / URL Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="category-slug"
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 font-mono text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <CloudinaryUploader
                    images={formImageUrl}
                    onChange={setFormImageUrl}
                    multiple={false}
                    maxFiles={1}
                    preset="category"
                    label="Category Thumbnail Image"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-line bg-cloud/20 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Active Category</span>
                    <span className="text-[10px] text-muted">Show in customer storefront navigation</span>
                  </div>
                </label>

                <div className="pt-3 border-t border-line flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-line px-4 py-2 text-xs font-bold text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
