import React, { useEffect, useRef } from 'react';

export interface SettingsMenuProps {
  position?: { x: number; y: number };
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  onTogglePiP: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  position,
  currentSpeed,
  onSpeedChange,
  onTogglePiP,
  onDownload,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        bottom: '60px',
        right: '20px',
        zIndex: 50,
      }}
      className="w-64 bg-[#18181b] text-[#f4f4f5] rounded-lg shadow-2xl overflow-hidden py-1.5 border border-[#27272a] transition-all duration-150 ease-out font-sans select-none"
    >
      {/* Download Action Option */}
      <button
        onClick={onDownload}
        className="w-full px-4 py-3 flex items-center gap-4 text-left font-medium hover:bg-[#27272a] active:bg-[#3f3f46] transition-colors cursor-pointer"
      >
        <svg
          className="w-5 h-5 text-[#a1a1aa]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="text-[14.5px] tracking-wide">Download</span>
      </button>

      {/* Playback Speed Flyout Container */}
      <div className="relative group">
        <button className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left font-medium hover:bg-[#27272a] transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <svg
              className="w-5 h-5 text-[#a1a1aa]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-[14.5px] tracking-wide">Playback speed</span>
          </div>
          <span className="text-[11px] text-[#f4f4f5] font-bold bg-[#3f3f46] px-2 py-0.5 rounded-md tracking-wider">
            {currentSpeed}x
          </span>
        </button>

        {/* Floating Flyout Dark Sub-Menu */}
        <div className="hidden group-hover:block absolute right-full bottom-0 w-32 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl py-1 mr-1">
          {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`w-full px-4 py-2 text-sm text-left font-medium hover:bg-[#27272a] transition-colors cursor-pointer ${
                currentSpeed === speed
                  ? 'text-[#3b82f6] bg-[#1e3a8a]/30 font-semibold'
                  : 'text-[#e4e4e7]'
              }`}
            >
              {speed === 1.0 ? 'Normal' : `${speed}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Picture-in-Picture Option */}
      <button
        onClick={onTogglePiP}
        className="w-full px-4 py-3 flex items-center gap-4 text-left font-medium hover:bg-[#27272a] active:bg-[#3f3f46] transition-colors cursor-pointer"
      >
        <svg
          className="w-5 h-5 text-[#a1a1aa]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0v10m0-10L14 13M4 7v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z"
          />
        </svg>
        <span className="text-[14.5px] tracking-wide">Picture-in-picture</span>
      </button>
    </div>
  );
};

export default SettingsMenu;
