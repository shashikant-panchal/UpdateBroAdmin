import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Trash2,
  Search,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Package,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useActionModal } from '../context/ActionModalContext';

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  title: string | null;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    images: string[];
    price: number;
  } | null;
}

export const ReviewsManager: React.FC = () => {
  const { confirm, notifySuccess, notifyError } = useActionModal();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all reviews joined with products
  const fetchReviews = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          id, product_id, user_id, order_id, customer_name, customer_phone,
          rating, title, comment, verified_purchase, created_at,
          product:products ( id, name, images, price )
        `)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setReviews(data as unknown as AdminReview[]);
        if (data.length > 0 && !selectedReview) {
          setSelectedReview(data[0] as unknown as AdminReview);
        }
      } else if (error) {
        console.warn('Reviews fetch error:', error);
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Delete review handler with confirmation
  const handleDeleteReview = async (review: AdminReview) => {
    const isConfirmed = await confirm({
      title: 'Delete Customer Review?',
      message: `Are you sure you want to permanently delete the review from "${review.customer_name}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete Review',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      if (selectedReview?.id === review.id) {
        setSelectedReview(null);
      }

      notifySuccess('Review Deleted', 'The customer review has been permanently removed.');
    } catch (err: unknown) {
      notifyError('Delete Failed', err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = ratingFilter === 'all' || r.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  // Calculate stats
  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1)
    : '0.0';
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const verifiedCount = reviews.filter((r) => r.verified_purchase).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-ink flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-accent" />
            <span>Customer Reviews</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Realtime verified customer ratings, reviews moderation, and deletion options.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviews}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-accent transition self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Reviews */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs text-muted font-bold uppercase tracking-wider block">Total Reviews</span>
          <p className="font-mono text-2xl font-black text-ink mt-1">{totalCount}</p>
          <span className="text-[11px] text-muted mt-0.5 block">Published in catalog</span>
        </div>

        {/* Metric 2: Average Score */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs text-muted font-bold uppercase tracking-wider block">Average Rating</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-2xl font-black text-accent">{avgRating}</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${
                    s <= Math.round(Number(avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-line fill-line'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">Across all products</span>
        </div>

        {/* Metric 3: 5-Star Reviews */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs text-muted font-bold uppercase tracking-wider block">5-Star Ratings</span>
          <p className="font-mono text-2xl font-black text-emerald-500 mt-1">{fiveStarCount}</p>
          <span className="text-[11px] text-muted mt-0.5 block">
            {totalCount > 0 ? `${Math.round((fiveStarCount / totalCount) * 100)}% of total` : '0%'}
          </span>
        </div>

        {/* Metric 4: Verified Buyers */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs text-muted font-bold uppercase tracking-wider block">Verified Buyers</span>
          <p className="font-mono text-2xl font-black text-indigo-500 mt-1">{verifiedCount}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block">
            100% Authenticated
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search reviews by customer name, comment, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-cloud/50 pl-10 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none transition"
          />
        </div>

        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setRatingFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              ratingFilter === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'bg-cloud/50 text-muted hover:text-ink'
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => setRatingFilter(stars)}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                ratingFilter === stars
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-cloud/50 text-muted hover:text-ink'
              }`}
            >
              <span>{stars}</span>
              <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Split Review Workspace: List on left, Selected review preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: All Reviews List & Actions */}
        <div className="lg:col-span-7 space-y-3">
          {isLoading ? (
            <div className="py-24 text-center rounded-2xl border border-line bg-surface">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-muted">Loading customer reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-4 font-bold text-base text-ink">No Reviews Found</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                {searchQuery || ratingFilter !== 'all'
                  ? 'No reviews match your search or rating filters. Try resetting the filter.'
                  : 'Customer reviews will automatically appear here as verified buyers submit ratings for delivered orders.'}
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => {
              const isSelected = selectedReview?.id === rev.id;
              const prodImg = rev.product?.images?.[0];

              return (
                <motion.div
                  key={rev.id}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedReview(rev)}
                  className={`group relative rounded-2xl border p-4 transition cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-md'
                      : 'border-line bg-surface hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-cloud/50">
                        {prodImg ? (
                          <img
                            src={prodImg}
                            alt={rev.product?.name || 'Product'}
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted">
                            UB
                          </div>
                        )}
                      </div>

                      {/* Review Content Header */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-ink truncate">
                            {rev.customer_name}
                          </span>
                          {rev.verified_purchase && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="h-2.5 w-2.5" /> Verified Buyer
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-bold text-accent truncate mt-0.5">
                          {rev.product?.name || `Product ID: ${rev.product_id.slice(0, 8)}`}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-line fill-line'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted">
                            {new Date(rev.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Option Right on the Item */}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReview(rev);
                      }}
                      className="rounded-xl p-2 text-muted hover:bg-rose-500/15 hover:text-rose-500 transition cursor-pointer"
                      title="Delete this review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Review Text */}
                  {rev.title && (
                    <p className="mt-2.5 text-xs font-bold text-ink line-clamp-1">
                      {rev.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                    {rev.comment}
                  </p>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Column: Full Details & Moderation Action */}
        <div className="lg:col-span-5">
          {selectedReview ? (
            <div className="sticky top-20 rounded-3xl border border-line bg-surface p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Review Details &amp; Actions
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteReview(selectedReview)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Review</span>
                </button>
              </div>

              {/* Product Info Strip */}
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-cloud/30 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
                  {selectedReview.product?.images?.[0] ? (
                    <img
                      src={selectedReview.product.images[0]}
                      alt={selectedReview.product.name}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted">
                      UB
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Reviewed Item</span>
                  <p className="text-xs font-bold text-ink truncate mt-0.5">
                    {selectedReview.product?.name || selectedReview.product_id}
                  </p>
                  {selectedReview.product?.price && (
                    <p className="font-mono text-xs font-bold text-accent mt-0.5">
                      ₹{selectedReview.product.price}
                    </p>
                  )}
                </div>
              </div>

              {/* Customer Profile & Rating Info */}
              <div className="space-y-3 rounded-2xl border border-line bg-cloud/20 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white font-bold text-xs uppercase">
                      {selectedReview.customer_name[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-ink">{selectedReview.customer_name}</p>
                      {selectedReview.customer_phone && (
                        <p className="text-[10px] text-muted font-mono">{selectedReview.customer_phone}</p>
                      )}
                    </div>
                  </div>
                  {selectedReview.verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Verified Buyer
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= selectedReview.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-line fill-line'
                        }`}
                      />
                    ))}
                    <span className="font-mono font-bold text-ink ml-1.5">{selectedReview.rating} of 5</span>
                  </div>
                  <span className="text-[10px] text-muted">
                    {new Date(selectedReview.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Review Body */}
              <div className="space-y-2">
                {selectedReview.title && (
                  <h4 className="font-bold text-sm text-ink">{selectedReview.title}</h4>
                )}
                <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-ink leading-relaxed">
                  "{selectedReview.comment}"
                </div>
              </div>

              {/* Order reference if available */}
              {selectedReview.order_id && (
                <div className="text-[10px] text-muted font-mono">
                  Linked Order ID: {selectedReview.order_id}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">
              <MessageSquare className="mx-auto h-8 w-8 text-muted/50 mb-2" />
              <p className="text-xs font-bold">Select a review from the list to inspect full details and delete options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
