import React from 'react';

interface BinanceLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const BinanceLogo: React.FC<BinanceLogoProps> = ({
  size = 24,
  showWordmark = true,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M16 4L10.35 9.65L12.47 11.77L16 8.24L19.53 11.77L21.65 9.65L16 4Z"
          fill="#F0B90B"
        />
        <path
          d="M6.12 13.88L4 16L6.12 18.12L8.24 16L6.12 13.88Z"
          fill="#F0B90B"
        />
        <path
          d="M16 11.76L11.76 16L16 20.24L20.24 16L16 11.76Z"
          fill="#F0B90B"
        />
        <path
          d="M25.88 13.88L23.76 16L25.88 18.12L28 16L25.88 13.88Z"
          fill="#F0B90B"
        />
        <path
          d="M16 23.76L12.47 20.23L10.35 22.35L16 28L21.65 22.35L19.53 20.23L16 23.76Z"
          fill="#F0B90B"
        />
      </svg>
      {showWordmark && (
        <span className="font-semibold tracking-wider text-[#F0B90B] text-xs sm:text-sm whitespace-nowrap">
          BINANCE
        </span>
      )}
    </span>
  );
};
