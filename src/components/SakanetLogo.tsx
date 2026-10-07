import React from 'react';

interface SakanetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  className?: string;
  textClassName?: string;
}

export const SakanetLogo: React.FC<SakanetLogoProps> = ({
  size = 'md',
  showText = true,
  animated = false,
  className = '',
  textClassName = '',
}) => {
  // Dimension mappings for the logo mark
  const iconDimensions = {
    sm: { box: 28, radius: 7, playW: 10, stroke: 3 },
    md: { box: 36, radius: 9, playW: 13, stroke: 4 },
    lg: { box: 52, radius: 14, playW: 18, stroke: 5 },
    xl: { box: 76, radius: 20, playW: 26, stroke: 7 },
  }[size];

  const textSizeClasses = {
    sm: { brand: 'text-lg', subtitle: 'text-[9px] tracking-[0.2em]' },
    md: { brand: 'text-xl sm:text-2xl', subtitle: 'text-[10px] tracking-[0.22em]' },
    lg: { brand: 'text-2xl sm:text-3xl', subtitle: 'text-xs tracking-[0.25em]' },
    xl: { brand: 'text-3xl sm:text-4xl', subtitle: 'text-sm tracking-[0.28em]' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual Logo Mark: Stylized Cinema Reel S + Embedded Play Action Glyph */}
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/15 shadow-lg shadow-red-950/40 group overflow-hidden ${
          animated ? 'animate-pulse' : ''
        }`}
        style={{
          width: iconDimensions.box,
          height: iconDimensions.box,
        }}
      >
        {/* Subtle radial crimson ambient glow behind the icon */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(229,9,20,0.35),transparent_70%)] pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1.5 transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sakanetRedGrad" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#FF2E38" />
              <stop offset="50%" stopColor="#E50914" />
              <stop offset="100%" stopColor="#8E060D" />
            </linearGradient>
            <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
            </linearGradient>
            <filter id="logoDrop" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#E50914" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Stylized Modern Cinematic "S" Ribbon */}
          <path
            d="M78 26 C78 14 62 10 50 10 C30 10 18 20 18 36 C18 52 38 56 54 62 C70 68 76 74 76 84 C76 96 58 98 44 98 C28 98 16 90 16 78"
            stroke="url(#sakanetRedGrad)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logoDrop)"
          />

          {/* Micro Top Highlight Curve */}
          <path
            d="M50 10 C62 10 74 13 74 22"
            stroke="url(#innerGlow)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Centered Cinema Play Glyphs */}
          <polygon
            points="46,42 62,50 46,58"
            fill="#FFFFFF"
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          />
        </svg>

        {/* Micro-thin top edge bevel highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      </div>

      {/* Typography: Brand Wordmark + Subtitle */}
      {showText && (
        <div className={`flex flex-col text-left leading-none ${textClassName}`}>
          <div className="flex items-center gap-1">
            <span
              className={`font-black font-display tracking-tight text-white drop-shadow-sm ${textSizeClasses.brand}`}
            >
              SAKANET
            </span>
          </div>
          <span
            className={`font-bold font-sans text-red-500 uppercase mt-0.5 ${textSizeClasses.subtitle}`}
          >
            CINEMA
          </span>
        </div>
      )}
    </div>
  );
};
