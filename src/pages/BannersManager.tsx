import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbBanner } from '../types/database';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useActionModal } from '../context/ActionModalContext';

export const BannersManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [banners, setBanners] = useState<DbBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<DbBanner | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCtaText, setFormCtaText] = useState('');
  const [formCtaLink, setFormCtaLink] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBanners = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, subtitle, cta_text, cta_link, image_url, sort_order, is_active, created_at')
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setBanners(data as DbBanner[]);
      }
    } catch (err) {
      console.warn('Failed to load banners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openAddModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormCtaText('');
    setFormCtaLink('');
    setFormImages([]);
    setFormSortOrder(banners.length + 1);
    setFormIsActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: DbBanner) => {
    setEditingBanner(b);
    setFormTitle(b.title);
    setFormSubtitle(b.subtitle || '');
    setFormCtaText(b.cta_text);
    setFormCtaLink(b.cta_link);
    setFormImages(b.image_url ? [b.image_url] : []);
    setFormSortOrder(b.sort_order);
    setFormIsActive(b.is_active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formImages.length === 0) {
      setErrorMsg('Please provide a banner title and at least one image.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        cta_text: formCtaText.trim() || 'Shop Now',
        cta_link: formCtaLink.trim() || '/shop',
        image_url: formImages[0],
        sort_order: formSortOrder,
        is_active: formIsActive,
      };

      if (editingBanner) {
        const { error } = await supabase.from('banners').update(payload).eq('id', editingBanner.id);
        if (error) throw error;
        notifySuccess('Banner Updated', `"${payload.title}" updated successfully.`);
      } else {
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
        notifySuccess('Banner Created', `"${payload.title}" is now added to the carousel.`);
      }

      setIsModalOpen(false);
      fetchBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save banner failed';
      setErrorMsg(msg);
      notifyError('Failed to Save', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Delete Hero Banner?',
      message: `Are you sure you want to delete banner "${title}" from the homepage carousel?`,
      confirmText: 'Yes, Delete',
      cancelText: 'Keep Banner',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (!error) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        notifySuccess('Banner Deleted', `"${title}" was removed.`);
      } else {
        notifyError('Delete Failed', error.message);
      }
    } catch (err: unknown) {
      notifyError('Delete Error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleActive = async (b: DbBanner) => {
    const updated = !b.is_active;
    setBanners((prev) =>
      prev.map((item) => (item.id === b.id ? { ...item, is_active: updated } : item))
    );

    try {
      await supabase.from('banners').update({ is_active: updated }).eq('id', b.id);
      notifyInfo(
        updated ? 'Banner Visible' : 'Banner Hidden',
        `"${b.title}" carousel slide updated.`
      );
    } catch {
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: b.is_active } : item))
      );
      notifyError('Update Failed', 'Could not update banner status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Hero Banners Manager</h1>
          <p className="text-xs text-muted mt-1">
            Control the high-impact widescreen homepage carousel slides, CTA links, and messaging.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Add Hero Banner</span>
        </button>
      </div>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`banner-skeleton-${idx}`}
              className="animate-pulse overflow-hidden rounded-3xl border border-line bg-surface shadow-sm space-y-4 p-4"
            >
              <div className="aspect-[21/9] w-full rounded-2xl bg-cloud/80 border border-line" />
              <div className="space-y-2 pt-1">
                <div className="h-4 w-48 bg-cloud/80 rounded-md" />
                <div className="h-3 w-32 bg-cloud/60 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-line/60">
                <div className="h-5 w-20 bg-cloud/80 rounded-full" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                  <div className="h-8 w-8 bg-cloud/80 rounded-xl" />
                </div>
              </div>
            </div>
          ))
        ) : banners.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted">
            <ImageIcon className="mx-auto h-8 w-8 text-muted mb-2" />
            <p className="text-xs font-bold text-ink">No banners configured yet.</p>
          </div>
        ) : (
          banners.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm space-y-4 hover:border-accent/40 transition"
            >
              {/* Banner Visual Preview Card */}
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-black">
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 flex flex-col justify-end text-white">
                  <span className="text-[10px] font-black uppercase tracking-wider text-accent">
                    Slide #{b.sort_order}
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-black">{b.title}</h3>
                  {b.subtitle && <p className="text-xs opacity-90 line-clamp-1">{b.subtitle}</p>}
                </div>
              </div>

              {/* Bottom Details & Controls */}
              <div className="p-5 pt-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(b)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      b.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-cloud text-muted'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${b.is_active ? 'bg-emerald-500' : 'bg-muted'}`} />
                    <span>{b.is_active ? 'Active' : 'Inactive'}</span>
                  </button>

                  <span className="font-mono text-xs text-muted truncate max-w-[140px]">
                    CTA: {b.cta_text} ({b.cta_link})
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(b)}
                    className="rounded-xl border border-line bg-cloud/50 p-2 text-ink hover:border-accent hover:text-accent transition"
                    title="Edit Banner"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.title)}
                    className="rounded-xl border border-line bg-cloud/50 p-2 text-muted hover:border-red-500 hover:text-red-500 transition"
                    title="Delete Banner"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit Banner Drawer */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl text-ink max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h3 className="font-display font-black text-base text-ink">
                  {editingBanner ? 'Edit Hero Banner' : 'Add Hero Banner'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-1.5 text-muted hover:bg-cloud"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBanner} className="mt-4 space-y-4">
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter banner title..."
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Subtitle / Punchline
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Enter banner subtitle (optional)..."
                    className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={formCtaText}
                      onChange={(e) => setFormCtaText(e.target.value)}
                      placeholder="Button label..."
                      className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                      CTA Link Target
                    </label>
                    <input
                      type="text"
                      value={formCtaLink}
                      onChange={(e) => setFormCtaLink(e.target.value)}
                      placeholder="/shop or URL..."
                      className="h-10 w-full rounded-2xl border border-line bg-cloud/30 px-3 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>
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

                {/* Cloudinary Banner Image Upload */}
                <div>
                  <CloudinaryUploader
                    images={formImages}
                    onChange={setFormImages}
                    multiple={false}
                    maxFiles={1}
                    preset="banner"
                    label="Banner Widescreen Graphic"
                  />
                </div>

                {/* Live Banner Preview Inside Drawer */}
                {formImages.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted mb-1 uppercase tracking-wider">
                      Live Preview Card
                    </label>
                    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-line bg-black">
                      <img
                        src={formImages[0]}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                        <h4 className="font-display text-sm font-black text-white">
                          {formTitle || 'Banner Title'}
                        </h4>
                        <p className="text-[11px] opacity-80 line-clamp-1">
                          {formSubtitle || 'Punchline will appear here.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 rounded-2xl border border-line bg-cloud/20 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Active Banner</span>
                    <span className="text-[10px] text-muted">Show in homepage hero carousel</span>
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
                    {isSubmitting ? 'Saving...' : 'Save Banner'}
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
