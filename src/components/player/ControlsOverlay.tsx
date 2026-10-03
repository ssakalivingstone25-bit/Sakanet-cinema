import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sliders,
  ArrowLeft,
  Cast,
  Lock,
  Unlock,
  PictureInPicture,
  Crop,
} from 'lucide-react';
import { VideoPlayerState } from '../../types';

interface ControlsOverlayProps {
  state: VideoPlayerState;
  movieTitle?: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenSettingsMenu: (e: React.MouseEvent) => void;
  onTogglePiP: () => void;
  onToggleOrientationLock: () => void;
  isOrientationLocked: boolean;
  onToggleCrop: () => void;
  isCropActive: boolean;
  onClose: () => void;
  onNextEpisode?: () => void;
  onCast?: () => void;
  gestureFeedback?: {
    type: 'speed' | 'rewind' | 'next';
    label: string;
  } | null;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  movieTitle,
  onPlayPause,
  onSeek,
  onToggleMute,
  onToggleFullscreen,
  onOpenSettingsMenu,
  onTogglePiP,
  onToggleOrientationLock,
  isOrientationLocked,
  onToggleCrop,
  isCropActive,
  onClose,
  onNextEpisode,
  onCast,
  gestureFeedback,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3.5s of inactivity while video is playing
  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
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
    };
  }, [state.isPlaying]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Screen Tap toggle
  const handleOverlayTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[data-no-toggle="true"]')) {
      return;
    }
    const next = !controlsVisible;
    setControlsVisible(next);
    if (!next) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  };

  // Rewind 10 seconds
  const handleRewind10s = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSeek(Math.max(0, state.currentTime - 10));
    resetHideTimer();
  };

  // Next content or Skip Forward 10 seconds
  const handleNextOrForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNextEpisode) {
      onNextEpisode();
    } else {
      onSeek(Math.min(state.duration, state.currentTime + 10));
    }
    resetHideTimer();
  };

  const progressPercent =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div
      onClick={handleOverlayTap}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`absolute inset-0 flex flex-col justify-between select-none overflow-hidden transition-opacity duration-300 z-30 ${
        controlsVisible
          ? 'opacity-100 pointer-events-auto bg-black/45 cursor-default'
          : 'opacity-0 pointer-events-none bg-transparent cursor-none'
      }`}
    >
      {/* Transient Gesture Feedback HUD */}
      {gestureFeedback && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
          <div className="px-4 py-2 rounded-xl bg-black/85 backdrop-blur-xl border border-white/20 text-white font-bold text-xs shadow-2xl flex items-center gap-2">
            <span>{gestureFeedback.label}</span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. TOP BAR
          - Left: Clean Back Arrow + Movie Title
          - Right: Horizontal row of subtle white icons:
            [ Cast ] [ PiP ] [ Mute ] [ Lock ]
         ======================================================== */}
      <div
        className="pt-3 px-3 sm:px-5 pb-2 flex items-center justify-between z-30 transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
        data-no-toggle="true"
      >
        {/* Back Button & Title */}
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer drop-shadow-md shrink-0"
            title="Back to catalog"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          {movieTitle && (
            <span className="text-xs sm:text-sm font-semibold text-white/95 truncate drop-shadow-md">
              {movieTitle}
            </span>
          )}
        </div>

        {/* Right Subtle Action Icons Row */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          {/* Cast Icon */}
          <button
            onClick={onCast}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
            title="Cast to Device"
            aria-label="Cast to Device"
          >
            <Cast className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Picture-in-Picture Icon */}
          <button
            onClick={onTogglePiP}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
            title="Picture-in-Picture"
            aria-label="Picture-in-Picture"
          >
            <PictureInPicture className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Volume / Mute Icon */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
            title={state.isMuted ? 'Unmute' : 'Mute'}
            aria-label={state.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.isMuted ? (
              <VolumeX className="w-4 h-4 stroke-[2]" />
            ) : (
              <Volume2 className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          {/* Screen Orientation Lock Icon */}
          <button
            onClick={onToggleOrientationLock}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
            title={isOrientationLocked ? 'Unlock Orientation' : 'Lock Orientation'}
            aria-label={isOrientationLocked ? 'Unlock Orientation' : 'Lock Orientation'}
          >
            {isOrientationLocked ? (
              <Lock className="w-4 h-4 stroke-[2]" />
            ) : (
              <Unlock className="w-4 h-4 stroke-[2]" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          2. CENTER PLAYBACK CONTROLS (Proportional & Refined)
          Center Controls: Includes Play / Pause buttons, a Next button,
          and a Previous (10s) skip button.
          - Previous (10s) Skip Button
          - Play / Pause Button
          - Next Button
         ======================================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className="flex items-center justify-center gap-7 sm:gap-12 md:gap-14 pointer-events-auto"
          data-no-toggle="true"
        >
          {/* Previous (10s) Skip Button */}
          <button
            onClick={handleRewind10s}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm shadow-md"
            title="Previous (10s) Skip"
            aria-label="Previous 10 seconds"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] font-bold leading-none -mt-0.5">10</span>
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={onPlayPause}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title={state.isPlaying ? 'Pause' : 'Play'}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-black text-black stroke-none" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black text-black stroke-none ml-0.5" />
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={handleNextOrForward}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm shadow-md"
            title={onNextEpisode ? 'Next Movie' : 'Forward 10 seconds'}
            aria-label="Next button"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-white stroke-none" />
          </button>
        </div>
      </div>

      {/* ========================================================
          3. PROGRESS BAR & BOTTOM CONTROLS
          - Progress Bar: Located beneath playback controls to track video duration
          - Bottom Left: Current / Total Time
          - Bottom Right Icons:
            - Other Controls button (opens popup menu)
            - Full Screen / Play toggle (rotates display to landscape)
         ======================================================== */}
      <div
        className="px-3 sm:px-6 pb-2.5 sm:pb-4 flex flex-col gap-1.5 select-none z-30 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        data-no-toggle="true"
      >
        {/* Progress Bar (Located beneath playback controls) */}
        <div className="relative flex items-center h-4 cursor-pointer group/slider w-full">
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
            className="w-full h-1 cursor-pointer bg-white/25 rounded-full appearance-none outline-none transition-all group-hover/slider:h-1.5 accent-red-600"
            style={{
              background: `linear-gradient(to right, #e50914 0%, #e50914 ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%, rgba(255,255,255,0.25) 100%)`,
            }}
          />
        </div>

        {/* Bottom Status & Right Action Icons */}
        <div className="flex items-center justify-between">
          {/* Bottom Left: Time tracking */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-white/90 drop-shadow-md">
            <span className="font-semibold text-white">{formatTime(state.currentTime)}</span>
            <span className="text-white/60">/</span>
            <span className="text-white/70">{formatTime(state.duration)}</span>
          </div>

          {/* Bottom Right Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Aspect Ratio / Fit Toggle */}
            <button
              onClick={onToggleCrop}
              className={`p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer drop-shadow-md ${
                isCropActive ? 'text-amber-400' : 'text-white/90 hover:text-white'
              }`}
              title="Toggle Aspect Ratio (Fit / Cover)"
              aria-label="Toggle Aspect Ratio"
            >
              <Crop className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Other Controls Button (Opens popup menu) */}
            <button
              onClick={onOpenSettingsMenu}
              className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
              title="Other Controls (Popup Menu)"
              aria-label="Other Controls"
            >
              <Sliders className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Full Screen / Play Toggle (Rotates display to landscape) */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-md"
              title={state.isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              aria-label="Full Screen"
            >
              {state.isFullscreen ? (
                <Minimize className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <Maximize className="w-4 h-4 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsOverlay;
