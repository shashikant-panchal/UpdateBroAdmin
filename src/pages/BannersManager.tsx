import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Video,
  Film,
  Sparkles,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbBanner, BannerMediaType } from '../types/database';
import { CloudinaryUploader, type VideoUploadData } from '../components/CloudinaryUploader';
import { useActionModal } from '../context/ActionModalContext';
import { notifyStorefrontSync } from '../lib/syncStorefront';

export const BannersManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError, notifyInfo } = useActionModal();
  const [banners, setBanners] = useState<DbBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<DbBanner | null>(null);

  // Form Fields
  const [formMediaType, setFormMediaType] = useState<BannerMediaType>('image');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCtaText, setFormCtaText] = useState('');
  const [formCtaLink, setFormCtaLink] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formVideoData, setFormVideoData] = useState<VideoUploadData | null>(null);
  const [formPosterImages, setFormPosterImages] = useState<string[]>([]);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});

  const fetchBanners = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, subtitle, cta_text, cta_link, image_url, media_type, video_url, poster_url, sort_order, is_active, created_at')
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
    setFormMediaType('image');
    setFormTitle('');
    setFormSubtitle('');
    setFormCtaText('Shop Now');
    setFormCtaLink('/shop');
    setFormImages([]);
    setFormVideoData(null);
    setFormPosterImages([]);
    setFormSortOrder(banners.length + 1);
    setFormIsActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: DbBanner) => {
    setEditingBanner(b);
    const mediaType: BannerMediaType = b.media_type || (b.video_url ? 'video' : 'image');
    setFormMediaType(mediaType);
    setFormTitle(b.title);
    setFormSubtitle(b.subtitle || '');
    setFormCtaText(b.cta_text || 'Shop Now');
    setFormCtaLink(b.cta_link || '/shop');
    setFormImages(b.image_url ? [b.image_url] : []);

    if (b.video_url) {
      setFormVideoData({
        videoUrl: b.video_url,
        posterUrl: b.poster_url || b.image_url || '',
      });
    } else {
      setFormVideoData(null);
    }

    setFormPosterImages(b.poster_url ? [b.poster_url] : b.image_url ? [b.image_url] : []);
    setFormSortOrder(b.sort_order);
    setFormIsActive(b.is_active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      setErrorMsg('Please enter a banner title.');
      return;
    }

    if (formMediaType === 'video') {
      if (!formVideoData?.videoUrl) {
        setErrorMsg('Please upload an HD video clip (≤ 30s) or provide a video URL.');
        return;
      }
    } else {
      if (formImages.length === 0) {
        setErrorMsg('Please upload at least one widescreen banner graphic.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Auto-derived or custom poster URL
      const finalPosterUrl =
        formPosterImages[0] ||
        formVideoData?.posterUrl ||
        formImages[0] ||
        '';

      const payload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        cta_text: formCtaText.trim() || 'Shop Now',
        cta_link: formCtaLink.trim() || '/shop',
        // Keep image_url populated with the auto-generated poster image URL even when media_type = 'video'
        // so existing storefront/admin queries and fallback cards never break.
        image_url: formMediaType === 'video' ? finalPosterUrl : formImages[0],
        media_type: formMediaType,
        video_url: formMediaType === 'video' ? formVideoData?.videoUrl : null,
        poster_url: formMediaType === 'video' ? finalPosterUrl : null,
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

      notifyStorefrontSync();
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
        notifyStorefrontSync();
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
      notifyStorefrontSync();
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
            Control widescreen homepage carousel slides, high-clarity videos (≤ 30s), and CTAs.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition self-start cursor-pointer"
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
          banners.map((b) => {
            const isVideo = b.media_type === 'video' && b.video_url;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm space-y-4 hover:border-accent/40 transition group"
              >
                {/* Banner Visual Preview Card */}
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-black">
                  {isVideo ? (
                    <video
                      src={b.video_url || ''}
                      poster={b.poster_url || b.image_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration;
                        if (Number.isFinite(d) && d > 0 && b.id) {
                          setVideoDurations((prev) => ({ ...prev, [b.id]: d }));
                        }
                      }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {/* Top-Right Badge: HD VIDEO vs IMAGE */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {isVideo ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/30 backdrop-blur-md shadow-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                        </span>
                        <span>HD VIDEO</span>
                        {videoDurations[b.id] ? (
                          <>
                            <span className="text-amber-400/50">•</span>
                            <span className="font-mono text-white/90">
                              {Math.round(videoDurations[b.id])}s
                            </span>
                          </>
                        ) : null}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 border border-white/20 backdrop-blur-md">
                        <ImageIcon className="h-2.5 w-2.5" />
                        <span>IMAGE</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 flex flex-col justify-end text-white pointer-events-none">
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider cursor-pointer transition ${
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
                      className="rounded-xl border border-line bg-cloud/50 p-2 text-ink hover:border-accent hover:text-accent transition cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id, b.title)}
                      className="rounded-xl border border-line bg-cloud/50 p-2 text-muted hover:border-red-500 hover:text-red-500 transition cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add / Edit Banner Drawer / Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl text-ink max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-base text-ink">
                    {editingBanner ? 'Edit Hero Banner' : 'Add Hero Banner'}
                  </h3>
                  {formMediaType === 'video' && (
                    <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-500">
                      HD Video (≤ 30s)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-1.5 text-muted hover:bg-cloud cursor-pointer transition"
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

                {/* Media Type Switcher (Segmented Toggle) */}
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Banner Media Format
                  </label>
                  <div className="flex rounded-2xl border border-line bg-cloud/40 p-1">
                    <button
                      type="button"
                      onClick={() => setFormMediaType('image')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                        formMediaType === 'image'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Image Banner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMediaType('video')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                        formMediaType === 'video'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Video Banner (≤ 30s HD)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Next-Gen 120W HyperCharge Flagship"
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
                    placeholder="e.g. Pure Copper Architecture • 0-100% in 18 Mins"
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
                      placeholder="Shop Now"
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

                {/* MEDIA UPLOADER SECTION */}
                {formMediaType === 'video' ? (
                  <div className="space-y-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Film className="h-3.5 w-3.5 text-accent" />
                          <span>HD Video Banner Clip (≤ 30s)</span>
                        </label>
                      </div>
                      <CloudinaryUploader
                        mediaType="video"
                        videoData={formVideoData}
                        onVideoChange={(v) => {
                          setFormVideoData(v);
                          if (v?.posterUrl && formPosterImages.length === 0) {
                            setFormPosterImages([v.posterUrl]);
                          }
                        }}
                        images={formPosterImages}
                        onChange={setFormPosterImages}
                        multiple={false}
                        maxFiles={1}
                        preset="banner"
                        label="Upload Video"
                      />
                    </div>

                    {/* Poster Frame Customization (Shown only when video is uploaded) */}
                    {formVideoData?.videoUrl && (
                      <div className="p-3.5 rounded-2xl border border-line bg-cloud/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                            Poster Image (Fallback / Instant Pre-Load)
                          </label>
                          {formPosterImages[0] && formPosterImages[0] !== formVideoData.posterUrl && (
                            <button
                              type="button"
                              onClick={() => setFormPosterImages(formVideoData.posterUrl ? [formVideoData.posterUrl] : [])}
                              className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                            >
                              Reset to Auto-Extracted Frame
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed">
                          By default, Cloudinary extracts frame 0 (<code className="font-mono text-accent">so_0</code>) as the instant poster. You can keep it or upload a custom image.
                        </p>
                        <CloudinaryUploader
                          mediaType="image"
                          images={formPosterImages}
                          onChange={setFormPosterImages}
                          multiple={false}
                          maxFiles={1}
                          preset="banner"
                          label="Custom Poster Thumbnail"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <CloudinaryUploader
                      mediaType="image"
                      images={formImages}
                      onChange={setFormImages}
                      multiple={false}
                      maxFiles={1}
                      preset="banner"
                      label="Banner Widescreen Graphic"
                    />
                  </div>
                )}

                {/* Live Banner Preview Inside Drawer */}
                {((formMediaType === 'image' && formImages.length > 0) || (formMediaType === 'video' && formVideoData?.videoUrl)) && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted mb-1.5 uppercase tracking-wider">
                      Live Preview Inside Carousel
                    </label>
                    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-line bg-black shadow-md">
                      {formMediaType === 'video' && formVideoData?.videoUrl ? (
                        <video
                          src={formVideoData.videoUrl}
                          poster={formPosterImages[0] || formVideoData.posterUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={formImages[0]}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      )}

                      {formMediaType === 'video' && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/30 backdrop-blur-md">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                          </span>
                          <span>HD VIDEO</span>
                          {formVideoData?.duration ? (
                            <>
                              <span className="text-amber-400/50">•</span>
                              <span className="font-mono text-white/90">
                                {Math.round(formVideoData.duration)}s
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white pointer-events-none">
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
                    className="rounded-2xl border border-line px-4 py-2 text-xs font-bold text-muted hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50 cursor-pointer"
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
