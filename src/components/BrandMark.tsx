import React from 'react';

interface BrandMarkProps {
  logoUrl?: string;
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  logoUrl,
  size = 34,
  className = '',
}) => {
  if (logoUrl && logoUrl.trim().length > 0) {
    return (
      <img
        src={logoUrl}
        alt="MIX NEXUS IP emblem"
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className={`rounded-lg object-cover border border-white/10 shrink-0 ${className}`}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#0D1322" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" stroke="#8B5CF6" strokeOpacity="0.35" />
      <path
        d="M20 6L32 11.5V20.5C32 27.6 26.8 32.5 20 34.5C13.2 32.5 8 27.6 8 20.5V11.5L20 6Z"
        fill="#07090E"
        stroke="#8B5CF6"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 24.5V15.5L20 20.5L26 15.5V24.5"
        stroke="#F8FAFC"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="11.5" r="1.4" fill="#A78BFA" />
    </svg>
  );
};
