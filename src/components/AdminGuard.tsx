import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, profile, isAdmin, isLoading, signInWithGoogle, refreshProfile } = useAuth();
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);

  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || 'https://www.updatebro.in';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="font-mono text-xs font-bold text-muted">Authenticating Admin Session...</p>
        </div>
      </div>
    );
  }

  // If user is admin, allow access!
  if (user && (isAdmin || profile?.role === 'admin')) {
    return <>{children}</>;
  }

  const handleClaimAdmin = async () => {
    if (!user) return;
    try {
      setIsPromoting(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (!error) {
        setPromoteMsg('Admin role granted! Refreshing...');
        await refreshProfile();
      } else {
        setPromoteMsg(`Error: ${error.message}`);
      }
    } catch (err: unknown) {
      setPromoteMsg(err instanceof Error ? err.message : 'Failed to promote');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 text-ink">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-7 sm:p-8 shadow-2xl text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
          <Lock className="h-8 w-8" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <BrandLogo variant="monogram" className="h-5 w-5 text-accent" />
          <span className="font-display text-xl font-black text-ink">UPDATE BRO®</span>
        </div>

        <h2 className="mt-2 text-sm font-bold uppercase tracking-wider text-accent">
          Admin Portal Access
        </h2>

        {!user ? (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Please sign in with your authorized administrator account to access store controls, orders, and inventory.
            </p>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-cloud/70 px-4 py-3.5 text-xs font-bold text-ink shadow-sm transition hover:border-accent hover:bg-surface active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4 text-accent" />
              <span>Sign In with Admin Google Account</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-line bg-cloud/50 p-3.5 text-xs">
              <span className="text-muted">Signed in as:</span>
              <p className="font-bold text-ink truncate">{user.email}</p>
              <span className="inline-block mt-1 text-[10px] font-mono uppercase text-muted">
                Role: <strong className="text-accent">{profile?.role || 'customer'}</strong>
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              This account does not have administrator privileges yet.
            </p>

            {promoteMsg && (
              <p className="text-xs font-semibold text-accent">{promoteMsg}</p>
            )}

            <button
              type="button"
              onClick={handleClaimAdmin}
              disabled={isPromoting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              <span>{isPromoting ? 'Promoting...' : 'Make this account Admin'}</span>
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-line pt-4">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go to Customer Storefront (updatebro.in)</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
