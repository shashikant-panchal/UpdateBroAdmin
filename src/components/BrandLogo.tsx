import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'monogram' | 'full';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'h-6 w-6 text-accent',
  variant = 'monogram',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="UPDATE BRO®"
    >
      {/* Precision Geometric Monogram */}
      <path
        d="M20 18 H40 V60 C40 72 48 80 60 80 C72 80 80 72 80 60 V18 H60 V60 C60 62 58 64 56 64 C54 64 52 62 52 60 V18 H20 Z"
        fill="currentColor"
      />
      <circle cx="75" cy="25" r="12" fill="#FF6A00" />
    </svg>
  );
};
