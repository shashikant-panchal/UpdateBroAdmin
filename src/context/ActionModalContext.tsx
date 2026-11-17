import React, { createContext, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
} from 'lucide-react';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ActionAlertOptions {
  title: string;
  message?: string;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ActionModalContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  notify: (options: ActionAlertOptions) => void;
  notifySuccess: (title: string, message?: string) => void;
  notifyError: (title: string, message?: string) => void;
  notifyInfo: (title: string, message?: string) => void;
}

const ActionModalContext = createContext<ActionModalContextValue | undefined>(undefined);

export const ActionModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
  });

  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  // Notify Alert State
  const [notifyState, setNotifyState] = useState<{
    isOpen: boolean;
    options: ActionAlertOptions;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
  });

  const notifyTimerRef = useRef<number | null>(null);

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        isOpen: true,
        options: {
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          variant: 'danger',
          ...options,
        },
      });
    });
  };

  const handleConfirmAction = (result: boolean) => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  };

  const notify = (options: ActionAlertOptions) => {
    if (notifyTimerRef.current) {
      window.clearTimeout(notifyTimerRef.current);
    }

    setNotifyState({
      isOpen: true,
      options: {
        variant: 'success',
        duration: 2800,
        ...options,
      },
    });

    const duration = options.duration ?? 2800;
    if (duration > 0) {
      notifyTimerRef.current = window.setTimeout(() => {
        setNotifyState((prev) => ({ ...prev, isOpen: false }));
      }, duration);
    }
  };

  const notifySuccess = (title: string, message?: string) => {
    notify({ title, message, variant: 'success' });
  };

  const notifyError = (title: string, message?: string) => {
    notify({ title, message, variant: 'error', duration: 4000 });
  };

  const notifyInfo = (title: string, message?: string) => {
    notify({ title, message, variant: 'info' });
  };

  const closeNotify = () => {
    if (notifyTimerRef.current) {
      window.clearTimeout(notifyTimerRef.current);
    }
    setNotifyState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ActionModalContext.Provider
      value={{
        confirm,
        notify,
        notifySuccess,
        notifyError,
        notifyInfo,
      }}
    >
      {children}

      {/* 1. ANIMATED CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl text-center text-ink"
            >
              {/* Icon Emblem */}
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                  confirmState.options.variant === 'danger'
                    ? 'border-red-500/30 bg-red-500/15 text-red-500 shadow-[0_0_24px_rgba(239,68,68,0.25)]'
                    : confirmState.options.variant === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                    : 'border-accent/30 bg-accent/15 text-accent shadow-glow'
                }`}
              >
                {confirmState.options.variant === 'danger' ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : confirmState.options.variant === 'warning' ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <Info className="h-7 w-7" />
                )}
              </div>

              {/* Title & Message */}
              <h3 className="font-display text-lg font-black text-ink">
                {confirmState.options.title}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {confirmState.options.message}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleConfirmAction(false)}
                  className="w-1/2 rounded-2xl border border-line px-4 py-2.5 text-xs font-bold text-muted hover:bg-cloud hover:text-ink transition active:scale-95"
                >
                  {confirmState.options.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAction(true)}
                  className={`w-1/2 rounded-2xl px-4 py-2.5 text-xs font-bold text-white transition shadow-sm active:scale-95 ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-red-500 hover:bg-red-600 shadow-[0_4px_16px_rgba(239,68,68,0.35)]'
                      : 'bg-accent hover:bg-accent-hover shadow-glow'
                  }`}
                >
                  {confirmState.options.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. ANIMATED ACTION FEEDBACK MODAL */}
      <AnimatePresence>
        {notifyState.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl text-center text-ink"
            >
              <button
                type="button"
                onClick={closeNotify}
                className="absolute right-3.5 top-3.5 rounded-full p-1 text-muted hover:bg-cloud hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className={`mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                  notifyState.options.variant === 'error'
                    ? 'border-red-500/30 bg-red-500/15 text-red-500 shadow-[0_0_24px_rgba(239,68,68,0.25)]'
                    : notifyState.options.variant === 'info'
                    ? 'border-blue-500/30 bg-blue-500/15 text-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.25)]'
                    : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
                }`}
              >
                {notifyState.options.variant === 'error' ? (
                  <XCircle className="h-7 w-7" />
                ) : notifyState.options.variant === 'info' ? (
                  <Info className="h-7 w-7" />
                ) : (
                  <CheckCircle2 className="h-7 w-7" />
                )}
              </motion.div>

              <h4 className="font-display text-base font-black text-ink">
                {notifyState.options.title}
              </h4>

              {notifyState.options.message && (
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  {notifyState.options.message}
                </p>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={closeNotify}
                  className="rounded-2xl bg-cloud/70 px-6 py-2 text-xs font-bold text-ink border border-line hover:border-accent transition active:scale-95"
                >
                  Dismiss
                </button>
              </div>

              {/* Auto-Dismiss Progress Bar Indicator */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: (notifyState.options.duration ?? 2800) / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${
                  notifyState.options.variant === 'error'
                    ? 'bg-red-500'
                    : notifyState.options.variant === 'info'
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                }`}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ActionModalContext.Provider>
  );
};

export const useActionModal = (): ActionModalContextValue => {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error('useActionModal must be used within an ActionModalProvider');
  }
  return context;
};
