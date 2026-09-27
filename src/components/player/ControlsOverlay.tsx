import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Subtitles,
  Cast,
  Settings,
  MoreVertical,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  SkipForward,
  Plus,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Maximize,
  Minimize,
} from 'lucide-react';
import { VideoPlayerState } from '../../types';

interface ControlsOverlayProps {
  state: VideoPlayerState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onOpenSettingsMenu: (e: React.MouseEvent) => void;
  onOpenQualityMenu?: (e: React.MouseEvent) => void;
  onToggleSubtitles?: () => void;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  // Metadata
  movieTitle?: string;
  studioName?: string;
  categoryTag?: string;
  currentQuality?: string;
  isSubtitlesActive?: boolean;
  // Bottom toolbar actions
  onNextEpisode?: () => void;
  onToggleMyList?: () => void;
  isInMyList?: boolean;
  onLike?: () => void;
  isLiked?: boolean;
  onDislike?: () => void;
  isDisliked?: boolean;
  onShare?: () => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  return hrs > 0
    ? `${hrs}:${paddedMins}:${paddedSecs}`
    : `${paddedMins}:${paddedSecs}`;
};

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  onPlayPause,
  onSeek,
  onOpenSettingsMenu,
  onOpenQualityMenu,
  onToggleSubtitles,
  onToggleFullscreen,
  onClose,
  movieTitle = 'Your Love Is Flowing to the Nations',
  studioName = 'Sakalund International',
  categoryTag = 'Gospel Movie',
  currentQuality = '1080p',
  isSubtitlesActive = false,
  onNextEpisode,
  onToggleMyList,
  isInMyList = false,
  onLike,
  isLiked = false,
  onDislike,
  isDisliked = false,
  onShare,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);

  const progressPercent = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  return (
    <div
      className="absolute inset-0 flex flex-col justify-between pointer-events-auto select-none overflow-hidden transition-opacity duration-300"
      onMouseMove={() => setControlsVisible(true)}
    >
      {/* ========================================================
          1. TOP APP BAR (Back, Title, Studio • Tag, 1080p pill, CC, Cast, Gear, 3-Dots)
         ======================================================== */}
      <div className="pt-3 px-4 sm:px-6 pb-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-start justify-between gap-3 z-30">
        {/* Left: Back button + Title info */}
        <div className="flex items-center gap-3.5 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <h2 className="text-white text-base sm:text-lg font-bold truncate leading-tight drop-shadow">
              {movieTitle}
            </h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300 font-medium truncate mt-0.5">
              <span>{studioName}</span>
              {categoryTag && (
                <>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">{categoryTag}</span>
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 hover:bg-black/90 border border-white/25 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Video Quality"
          >
            <span>{currentQuality}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Subtitles / CC button */}
          <button
            onClick={onToggleSubtitles}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isSubtitlesActive
                ? 'text-red-500 bg-white/15'
                : 'text-white hover:bg-white/15'
            }`}
            title="Subtitles / Closed Captions"
            aria-label="Subtitles"
          >
            <Subtitles className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Wireless Cast Icon */}
          <button
            onClick={() => {
              if ((window as any).chrome?.cast) {
                // Cast API if present
              }
            }}
            className="p-1.5 text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            title="Cast to screen"
            aria-label="Cast to screen"
          >
            <Cast className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettingsMenu}
            className="p-1.5 text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </button>

          {/* 3-Dots Overflow Menu */}
          <button
            onClick={onOpenSettingsMenu}
            className="p-1.5 text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            title="More Options"
            aria-label="More Options"
          >
            <MoreVertical className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* ========================================================
          2. CENTER CONTROLS (Rewind 10s, Huge Play/Pause Circle, Forward 10s)
         ======================================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="flex items-center gap-6 sm:gap-10 pointer-events-auto">
          {/* Rewind 10s Circle Button */}
          <button
            onClick={() => onSeek(state.currentTime - 10)}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw className="w-7 h-7 stroke-[2]" />
              <span className="absolute text-[10px] font-black font-mono">10</span>
            </div>
          </button>

          {/* Center Giant Play / Pause Circle Button */}
          <button
            onClick={onPlayPause}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title={state.isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
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
            onClick={() => onSeek(state.currentTime + 10)}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw className="w-7 h-7 stroke-[2]" />
              <span className="absolute text-[10px] font-black font-mono">10</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. BOTTOM TIMELINE & ACTIONS BAR
         ======================================================== */}
      <div className="pt-6 pb-4 px-4 sm:px-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2 z-30 pointer-events-auto">
        {/* Scrub Track with Glowing Red Handle */}
        <div className="relative w-full flex items-center h-4 group/slider cursor-pointer">
          <input
            type="range"
            min={0}
            max={state.duration || 0}
            step="0.1"
            value={state.currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full accent-red-600 h-1 sm:h-1.5 cursor-pointer bg-zinc-700/80 rounded-lg appearance-none outline-none transition-all group-hover/slider:h-2"
            style={{
              background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
        </div>

        {/* Timestamps: Current Time (left) and Total Time (right) */}
        <div className="flex items-center justify-between text-xs font-mono font-medium text-zinc-300 -mt-1 select-none">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        {/* Secondary Bottom Toolbar (Next Episode, Add to My List, Like, Dislike, Share, Full Screen) */}
        <div className="flex items-center justify-between pt-2 text-white">
          {/* Left Actions */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Next Episode */}
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current stroke-none" />
              <span className="hidden xs:inline">Next Episode</span>
            </button>

            {/* Add to My List */}
            <button
              onClick={onToggleMyList}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Like */}
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isLiked ? 'text-red-500' : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="hidden xs:inline">Like</span>
            </button>

            {/* Dislike */}
            <button
              onClick={onDislike}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isDisliked ? 'text-red-500' : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
              <span className="hidden xs:inline">Dislike</span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden xs:inline">Share</span>
            </button>

            {/* Full Screen */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
