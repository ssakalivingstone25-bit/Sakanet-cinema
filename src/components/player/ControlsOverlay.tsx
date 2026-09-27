import React, { useState } from 'react';
import { Volume2, Volume1, VolumeX, Play, Pause, Maximize, Minimize, MoreVertical, X } from 'lucide-react';
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
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  const effectiveVolume = state.isMuted ? 0 : state.volume;

  // Render appropriate speaker icon depending on volume level and mute state
  const renderVolumeIcon = () => {
    if (state.isMuted || effectiveVolume === 0) {
      return <VolumeX className="w-5 h-5 text-red-400 group-hover/vol:text-red-300" />;
    }
    if (effectiveVolume < 0.5) {
      return <Volume1 className="w-5 h-5 text-[#a1a1aa] group-hover/vol:text-white" />;
    }
    return <Volume2 className="w-5 h-5 text-[#a1a1aa] group-hover/vol:text-white" />;
  };

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
              aria-label="Close player"
            >
              <X className="w-5 h-5" />
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
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Main Play/Pause Button */}
            <button
              onClick={onPlayPause}
              className="text-[#e4e4e7] hover:text-white transform hover:scale-105 transition-all outline-none cursor-pointer flex items-center justify-center p-1 rounded-md hover:bg-white/10"
              title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            {/* Volume Control: Speaker Icon Button + Volume Slider */}
            {onVolumeChange && (
              <div
                className="group/vol relative flex items-center gap-2"
                onMouseEnter={() => setIsVolumeHovered(true)}
                onMouseLeave={() => setIsVolumeHovered(false)}
              >
                {/* Speaker Mute/Unmute Button */}
                <button
                  onClick={onToggleMute}
                  className="p-1 rounded-md text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                  title={state.isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  aria-label={state.isMuted ? 'Unmute' : 'Mute'}
                >
                  {renderVolumeIcon()}
                </button>

                {/* Always-interactive volume slider that expands on hover or remains accessible */}
                <div
                  className={`flex items-center transition-all duration-200 ease-out overflow-hidden ${
                    isVolumeHovered ? 'w-20 sm:w-24 opacity-100' : 'w-16 sm:w-20 opacity-80 group-hover/vol:opacity-100'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={effectiveVolume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    aria-label="Volume slider"
                    className="w-full accent-[#3b82f6] h-1.5 bg-[#27272a] rounded-lg cursor-pointer appearance-none outline-none"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                        effectiveVolume * 100
                      }%, #27272a ${effectiveVolume * 100}%, #27272a 100%)`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Code Duration Numbers Tracker */}
            <span className="font-mono text-xs font-medium tracking-wider text-[#a1a1aa] select-none ml-1">
              <span className="text-[#f4f4f5]">{formatTime(state.currentTime)}</span> / {formatTime(state.duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-md transition-all outline-none cursor-pointer"
                title={state.isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                aria-label={state.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {state.isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Anchor Config Toggle */}
            <button
              onClick={onOpenMenu}
              className="p-1.5 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-md transition-all outline-none cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsOverlay;
