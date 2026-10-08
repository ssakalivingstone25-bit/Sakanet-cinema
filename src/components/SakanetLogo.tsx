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
  // Exact size configuration ensuring sharp rendering across mobile and desktop
  const sizeConfig = {
    sm: {
      height: 'h-8 sm:h-9',
      maxW: 'max-w-[130px]',
      iconOnly: 'w-8 h-8 rounded-lg',
    },
    md: {
      height: 'h-10 sm:h-11',
      maxW: 'max-w-[160px]',
      iconOnly: 'w-10 h-10 rounded-xl',
    },
    lg: {
      height: 'h-16 sm:h-18',
      maxW: 'max-w-[220px]',
      iconOnly: 'w-16 h-16 rounded-2xl',
    },
    xl: {
      height: 'h-28 sm:h-36',
      maxW: 'max-w-[320px]',
      iconOnly: 'w-28 h-28 sm:w-36 sm:h-36 rounded-3xl',
    },
  }[size];

  if (!showText) {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden bg-black/60 border border-white/10 shadow-lg ${sizeConfig.iconOnly} ${className}`}
      >
        <img
          src="/logo.png"
          alt="Sakanet Cinema Logo"
          referrerPolicy="no-referrer"
          loading="eager"
          className={`w-full h-full object-cover object-top scale-110 select-none ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center select-none group cursor-pointer ${className}`}
    >
      <img
        src="/logo.png"
        alt="Sakanet Cinema App"
        referrerPolicy="no-referrer"
        loading="eager"
        className={`${sizeConfig.height} ${sizeConfig.maxW} w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_4px_16px_rgba(229,9,20,0.35)] ${
          animated ? 'animate-pulse' : ''
        }`}
      />
    </div>
  );
};

export default SakanetLogo;
