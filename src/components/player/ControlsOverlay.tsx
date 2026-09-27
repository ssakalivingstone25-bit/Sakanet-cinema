import React, { useState } from 'react';
import { VideoPlayerState } from '../../types';

interface ControlsOverlayProps {
  state: VideoPlayerState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  movieTitle?: string;
  onClose?: () => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = hrs > 0 && mins < 10 ? `0${mins}` : mins;
  const paddedSecs = secs < 10 ? `0${secs}` : secs;

  return hrs > 0 ? `${hrs}:${paddedMins}:${paddedSecs}` : `${mins}:${paddedSecs}`;
};

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  onPlayPause,
  onSeek,
  onOpenMenu,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  movieTitle,
  onClose,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
      {/* Top bar with Title & Close (if provided) */}
      <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/60 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {movieTitle && (
            <span className="text-white font-medium text-sm drop-shadow-md truncate max-w-md">
              {movieTitle}
            </span>
          )}
        </div>
      </div>

      {/* Bottom controls panel matching user spec */}
      <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 ease-in-out pointer-events-auto">
        {/* Slider Range Track */}
        <div className="w-full flex items-center h-2 group/track">
          <input
            type="range"
            min={0}
            max={state.duration || 0}
            step="0.1"
            value={state.currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full accent-[#3b82f6] h-1.5 cursor-pointer bg-[#27272a] rounded-lg appearance-none outline-none transition-all group-hover/track:h-2"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                (state.currentTime / (state.duration || 1)) * 100
              }%, #27272a ${(state.currentTime / (state.duration || 1)) * 100}%, #27272a 100%)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[#f4f4f5] text-sm">
          <div className="flex items-center gap-4">
            {/* Main Action Trigger */}
            <button
              onClick={onPlayPause}
              className="text-[#e4e4e7] hover:text-white transform hover:scale-105 transition-all outline-none cursor-pointer"
              title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {state.isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume Quick Control */}
            {onVolumeChange && (
              <div
                className="relative flex items-center gap-1.5"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={onToggleMute}
                  className="text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                  title={state.isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {state.isMuted || state.volume === 0 ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <div
                  className={`transition-all duration-200 overflow-hidden flex items-center ${
                    showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={state.isMuted ? 0 : state.volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-[#3b82f6] h-1 bg-[#27272a] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Code Duration Numbers Tracker */}
            <span className="font-mono text-xs font-medium tracking-wider text-[#a1a1aa] select-none">
              <span className="text-[#f4f4f5]">{formatTime(state.currentTime)}</span> / {formatTime(state.duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-md transition-all outline-none cursor-pointer"
                title={state.isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {state.isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5M15 9l5-5m0 0l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5M15 15l5 5m0 0l-5 0m5 0l0-5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            )}

            {/* Anchor Config Toggle */}
            <button
              onClick={onOpenMenu}
              className="p-1.5 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-md transition-all outline-none cursor-pointer"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsOverlay;
