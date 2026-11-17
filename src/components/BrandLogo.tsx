import React from 'react';
import { LOGO_PATHS } from '../data/logoPaths';

export type BrandLogoVariant =
  | 'full'
  | 'horizontal'
  | 'monogram'
  | 'monogramReg'
  | 'wordmark';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  color?: string;
  showSubtitle?: boolean;
  ariaLabel?: string;
}

/**
 * UPDATE BRO® Brand Typography
 * Precision Geometric Monogram, Extended Wordmark, and "Power Your World" tagline.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  className = '',
  color,
  showSubtitle = true,
  ariaLabel = 'UPDATE BRO® — Power Your World',
}) => {
  if (variant === 'monogram') {
    return (
      <svg
        viewBox={LOGO_PATHS.ubOnly.viewBox}
        fill={color ?? 'currentColor'}
        fillRule="evenodd"
        clipRule="evenodd"
        className={className}
        role="img"
        aria-label={ariaLabel}
      >
        <path d={LOGO_PATHS.ubOnly.d} />
      </svg>
    );
  }

  if (variant === 'monogramReg') {
    return (
      <svg
        viewBox={LOGO_PATHS.monogramReg.viewBox}
        fill={color ?? 'currentColor'}
        fillRule="evenodd"
        clipRule="evenodd"
        className={className}
        role="img"
        aria-label={ariaLabel}
      >
        <path d={LOGO_PATHS.monogramReg.d} />
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return (
      <svg
        viewBox={LOGO_PATHS.wordmark.viewBox}
        fill={color ?? 'currentColor'}
        fillRule="evenodd"
        clipRule="evenodd"
        className={className}
        role="img"
        aria-label={ariaLabel}
      >
        <path d={LOGO_PATHS.wordmark.d} />
      </svg>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={`flex flex-col items-center text-center select-none ${className}`}
        style={color ? { color } : undefined}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Monogram + Registered Mark */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox={LOGO_PATHS.monogramReg.viewBox}
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            className="h-14 w-auto shrink-0 drop-shadow-[0_4px_16px_rgba(255,106,0,0.25)] sm:h-16"
          >
            <path d={LOGO_PATHS.monogramReg.d} />
          </svg>
        </div>

        {/* Wordmark */}
        <svg
          viewBox={LOGO_PATHS.wordmark.viewBox}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          className="mt-2 h-5 w-auto shrink-0 sm:h-6"
        >
          <path d={LOGO_PATHS.wordmark.d} />
        </svg>

        {/* Power Your World */}
        {showSubtitle && (
          <div className="mt-2 flex items-center gap-2">
            <span className="h-[1px] w-5 bg-gradient-to-r from-transparent to-accent/80" />
            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">
              Power Your World
            </span>
            <span className="h-[1px] w-5 bg-gradient-to-l from-transparent to-accent/80" />
          </div>
        )}
      </div>
    );
  }

  // Horizontal lockup optimized for Navbar, Sidebar & Top Bar
  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      style={color ? { color } : undefined}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Monogram */}
      <svg
        viewBox={LOGO_PATHS.monogramReg.viewBox}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        className="h-7 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105"
      >
        <path d={LOGO_PATHS.monogramReg.d} />
      </svg>

      {/* Typography with sub-brand */}
      <div className="flex flex-col text-left">
        <svg
          viewBox={LOGO_PATHS.wordmark.viewBox}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          className="h-3.5 w-auto shrink-0 sm:h-4"
        >
          <path d={LOGO_PATHS.wordmark.d} />
        </svg>

        {showSubtitle && (
          <div className="mt-0.5 flex items-center gap-1">
            <span className="h-[1px] w-2.5 bg-accent/60" />
            <span className="text-[7px] font-black uppercase tracking-[0.16em] text-accent">
              Power Your World
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
