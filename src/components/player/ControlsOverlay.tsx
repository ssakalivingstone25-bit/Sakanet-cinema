import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  ArrowLeft,
  ChevronDown,
  Cast,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Plus,
  Check,
  SkipForward,
} from 'lucide-react';
import { VideoPlayerState } from '../../types';

interface ControlsOverlayProps {
  state: VideoPlayerState;
  movieTitle: string;
  studioName?: string;
  categoryTag?: string;
  currentQuality?: string;
  currentSubtitle?: string;
  isSubtitlesActive?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenSettingsMenu: (e: React.MouseEvent) => void;
  onOpenQualityMenu?: (e: React.MouseEvent) => void;
  onToggleSubtitles?: () => void;
  onClose?: () => void;
  onNextEpisode?: () => void;
  onToggleMyList?: () => void;
  isInMyList?: boolean;
  onLike?: () => void;
  isLiked?: boolean;
  onDislike?: () => void;
  isDisliked?: boolean;
  onShare?: () => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  movieTitle,
  studioName = 'Sakanet Cinema',
  categoryTag = '1080p FHD',
  currentQuality = '1080p',
  currentSubtitle = 'Off',
  isSubtitlesActive = false,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onOpenSettingsMenu,
  onOpenQualityMenu,
  onToggleSubtitles,
  onClose,
  onNextEpisode,
  onToggleMyList,
  isInMyList = false,
  onLike,
  isLiked = false,
  onDislike,
  isDisliked = false,
  onShare,
}) => {
  // Controls visibility with auto-fade timer
  // When active, controls are "bold highlighted"; when inactive, completely ghost/faded out.
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Transient feedback animation for center tap actions (rewind, forward, play/pause)
  const [tapFeedback, setTapFeedback] = useState<'rewind' | 'forward' | 'play' | 'pause' | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Auto fade controls after 3.5 seconds of inactivity if currently playing
    if (state.isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [state.isPlaying]);

  // Handle tap on the main video screen container:
  // Reclining/tapping again anywhere fades the controls out.
  // Clicking brings them back bold & highlighted.
  // ONLY pauses when clicking directly on the center Play/Pause icon.
  const handleScreenTap = (e: React.MouseEvent) => {
    // If clicking directly on interactive control buttons, don't toggle screen visibility
    if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) {
      resetHideTimer();
      return;
    }

    if (controlsVisible) {
      setControlsVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  };

  const triggerFeedback = (action: 'rewind' | 'forward' | 'play' | 'pause') => {
    setTapFeedback(action);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setTapFeedback(null);
    }, 700);
  };

  const handleCenterRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeek(state.currentTime - 10);
    triggerFeedback('rewind');
    resetHideTimer();
  };

  const handleCenterForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeek(state.currentTime + 10);
    triggerFeedback('forward');
    resetHideTimer();
  };

  // Center Play/Pause button: The ONLY place where clicking pauses or plays the video
  const handleCenterPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPause();
    triggerFeedback(!state.isPlaying ? 'play' : 'pause');
    resetHideTimer();
  };

  const progressPercent = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  return (
    <div
      onClick={handleScreenTap}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`absolute inset-0 flex flex-col justify-between select-none overflow-hidden transition-all duration-300 z-30 ${
        controlsVisible
          ? 'opacity-100 pointer-events-auto bg-black/40 backdrop-blur-[2px] cursor-default'
          : 'opacity-0 pointer-events-none bg-transparent cursor-none'
      }`}
    >
      {/* ========================================================
          1. TOP APP BAR (Back, Title, VJ • Tag, 1080p pill, CC, Cast, Gear, 3-Dots)
          Ghost-style frosted bar with bold highlighted typography
         ======================================================== */}
      <div
        className="pt-3 px-4 sm:px-6 pb-4 bg-gradient-to-b from-black/95 via-black/70 to-transparent flex items-start justify-between gap-3 z-30 transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Back button + Title info */}
        <div className="flex items-center gap-3.5 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 border border-white/15 shadow-md active:scale-95"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <h2 className="text-white text-base sm:text-lg font-black tracking-tight truncate leading-tight drop-shadow-md">
              {movieTitle}
            </h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-200 font-semibold truncate mt-0.5">
              <span className="text-red-300 bg-red-950/80 px-2 py-0.2 rounded border border-red-800/50">
                {studioName}
              </span>
              {categoryTag && (
                <>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300">{categoryTag}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Top Actions: Quality Pill, CC, Cast, Settings Gear, 3-Dots */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-0.5">
          {/* Quality Pill (e.g. 1080p ⌄) */}
          <button
            onClick={onOpenQualityMenu || onOpenSettingsMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/95 border border-white/30 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            title="Video Quality"
          >
            <span>{currentQuality}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-300" />
          </button>

          {/* Subtitles / CC button */}
          <button
            onClick={onToggleSubtitles}
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              isSubtitlesActive
                ? 'text-red-400 bg-red-950/60 border-red-600/50 shadow-md'
                : 'text-white bg-black/60 hover:bg-white/15 border-white/15'
            }`}
            title="Subtitles / Closed Captions"
            aria-label="Subtitles"
          >
            <Subtitles className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettingsMenu}
            className="p-2 text-white bg-black/60 hover:bg-white/15 rounded-xl border border-white/15 transition-all cursor-pointer shadow-md"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* 3-Dots Overflow Menu */}
          <button
            onClick={onOpenSettingsMenu}
            className="p-2 text-white bg-black/60 hover:bg-white/15 rounded-xl border border-white/15 transition-all cursor-pointer shadow-md"
            title="More Options"
            aria-label="More Options"
          >
            <MoreVertical className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* ========================================================
          2. CENTER CONTROLS (Rewind 10s, Huge Play/Pause Circle, Forward 10s)
          Featuring tap-to-fade transient animations & bold ghost style
          NOTE: Only clicking directly on the center Play/Pause icon pauses the stream!
         ======================================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="flex items-center gap-6 sm:gap-10 pointer-events-auto">
          {/* Rewind 10s Circle Button */}
          <button
            onClick={handleCenterRewind}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/75 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md border border-white/25 shadow-2xl transition-all active:scale-90 cursor-pointer ${
              tapFeedback === 'rewind' ? 'scale-125 bg-red-600/60 border-red-400' : 'hover:scale-105'
            }`}
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw className="w-7 h-7 stroke-[2.2]" />
              <span className="absolute text-[10px] font-black font-mono">10</span>
            </div>
          </button>

          {/* Center Giant Play / Pause Circle Button (ONLY pause trigger) */}
          <button
            onClick={handleCenterPlayPause}
            className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-2xl transition-all active:scale-95 cursor-pointer ${
              tapFeedback === 'play' || tapFeedback === 'pause'
                ? 'scale-115 ring-4 ring-red-400/50'
                : 'hover:scale-105'
            }`}
            title={state.isPlaying ? 'Pause' : 'Play'}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <Pause className="w-9 h-9 fill-current stroke-none" />
            ) : (
              <Play className="w-9 h-9 fill-current stroke-none ml-1" />
            )}
          </button>

          {/* Forward 10s Circle Button */}
          <button
            onClick={handleCenterForward}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/75 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md border border-white/25 shadow-2xl transition-all active:scale-90 cursor-pointer ${
              tapFeedback === 'forward' ? 'scale-125 bg-red-600/60 border-red-400' : 'hover:scale-105'
            }`}
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw className="w-7 h-7 stroke-[2.2]" />
              <span className="absolute text-[10px] font-black font-mono">10</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. BOTTOM TIMELINE & ACTIONS BAR
          Elevated with pb-14 sm:pb-16 and bottom margin to stay completely clear of bottom badges (Netlify badge) and device navigation bars
         ======================================================== */}
      <div
        className="pt-6 pb-14 sm:pb-16 px-4 sm:px-8 mb-2 sm:mb-4 bg-gradient-to-t from-black/95 via-black/85 to-transparent flex flex-col gap-2 z-30 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrub Track with Glowing Red Handle */}
        <div className="relative w-full flex items-center h-4 group/slider cursor-pointer">
          <input
            type="range"
            min={0}
            max={state.duration || 0}
            step="0.1"
            value={state.currentTime}
            onChange={(e) => {
              onSeek(parseFloat(e.target.value));
              resetHideTimer();
            }}
            className="w-full accent-red-600 h-2 sm:h-2.5 cursor-pointer bg-zinc-700/80 rounded-lg appearance-none outline-none transition-all group-hover/slider:h-3"
            style={{
              background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
        </div>

        {/* Timestamps: Current Time (left) and Total Time (right) */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-200 -mt-0.5 select-none drop-shadow">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        {/* Secondary Bottom Toolbar (Next Episode, Add to My List, Like, Dislike, Share, Full Screen) */}
        <div className="flex items-center justify-between pt-2.5 text-white">
          {/* Left Actions */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Next Episode */}
            <button
              onClick={() => {
                onNextEpisode?.();
                resetHideTimer();
              }}
              className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 text-zinc-300" />
              <span className="hidden xs:inline">Next Episode</span>
            </button>

            {/* In My List */}
            <button
              onClick={() => {
                onToggleMyList?.();
                resetHideTimer();
              }}
              className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isInMyList ? (
                <>
                  <Check className="w-4 h-4 text-red-500 stroke-[2.5]" />
                  <span className="text-white">In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden xs:inline">Add to My List</span>
                </>
              )}
            </button>
          </div>

          {/* Right Actions: Like, Dislike, Share, Full Screen */}
          <div className="flex items-center gap-5 sm:gap-7">
            {/* Like */}
            <button
              onClick={() => {
                onLike?.();
                resetHideTimer();
              }}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                isLiked ? 'text-red-500' : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="hidden xs:inline">Like</span>
            </button>

            {/* Dislike */}
            <button
              onClick={() => {
                onDislike?.();
                resetHideTimer();
              }}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                isDisliked ? 'text-red-500' : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
              <span className="hidden xs:inline">Dislike</span>
            </button>

            {/* Share */}
            <button
              onClick={() => {
                onShare?.();
                resetHideTimer();
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden xs:inline">Share</span>
            </button>

            {/* Full Screen */}
            {onToggleFullscreen && (
              <button
                onClick={() => {
                  onToggleFullscreen();
                  resetHideTimer();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/15"
                title={state.isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {state.isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
                <span className="hidden xs:inline">Full Screen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsOverlay;
