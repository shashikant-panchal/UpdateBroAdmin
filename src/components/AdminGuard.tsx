import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, LogIn, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth, ADMIN_EMAIL, ADMIN_PASSWORD } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isAdmin, isLoading, signInWithCredentials } = useAuth();

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // If user is authenticated as admin, grant immediate entry!
  if (user && isAdmin) {
    return <>{children}</>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await signInWithCredentials(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials. Please verify email and password.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = () => {
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 text-ink">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-7 sm:p-8 shadow-2xl"
      >
        {/* Top Typography Branding */}
        <div className="text-center">
          <div className="flex flex-col items-center">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-ink tracking-tight">
              UPDATE BRO<span className="text-accent">®</span>
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-[1px] w-4 bg-accent/60" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Power Your World
              </span>
              <span className="h-[1px] w-4 bg-accent/60" />
            </div>
          </div>

          <h2 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
            Master Admin Portal
          </h2>

          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Enter authorized administrator credentials to manage live catalog, orders, and store settings.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 font-medium"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@updatebro.in"
              className="h-11 w-full rounded-2xl border border-line bg-cloud/40 px-3.5 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="h-11 w-full rounded-2xl border border-line bg-cloud/40 pl-3.5 pr-10 font-mono text-xs text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Quick Auto-fill button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAutoFill}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent hover:underline transition"
            >
              <KeyRound className="h-3 w-3" />
              <span>Auto-fill Admin Credentials</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition active:scale-[0.98] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Admin'}</span>
          </button>
        </form>

        {/* Footer Link back to storefront */}
        <div className="mt-6 border-t border-line pt-4 text-center">
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
