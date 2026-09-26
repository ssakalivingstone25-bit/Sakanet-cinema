import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  PictureInPicture2,
  Tv,
  Subtitles,
  Download,
} from 'lucide-react';
import { PlaybackSlider } from './PlaybackSlider';

interface ControlsOverlayProps {
  movieTitle: string;
  genre: string;
  isOfflinePlayback?: boolean;
  showControls: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isTheaterMode: boolean;
  showSettings: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeekRelative: (seconds: number) => void;
  onSeekAbsolute: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onToggleTheaterMode: () => void;
  onTogglePiP: () => void;
  formatTime: (seconds: number) => string;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  movieTitle,
  genre,
  isOfflinePlayback,
  showControls,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  isMuted,
  isFullscreen,
  isTheaterMode,
  showSettings,
  onClose,
  onTogglePlay,
  onSeekRelative,
  onSeekAbsolute,
  onVolumeChange,
  onToggleMute,
  onToggleSettings,
  onToggleFullscreen,
  onToggleTheaterMode,
  onTogglePiP,
  formatTime,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Volume icon logic
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5 text-red-500" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5 text-zinc-300" />;
    return <Volume2 className="w-5 h-5 text-white" />;
  };

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Top Header Bar */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-105"
            title="Back / Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
              <span>{movieTitle}</span>
              {isOfflinePlayback && (
                <span className="text-[10px] font-sans font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                  OFFLINE MEDIA
                </span>
              )}
            </h2>
            <p className="text-[11px] text-zinc-400 font-sans">{genre} · Sakanet Ultra HD Cinema</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Picture in Picture */}
          <button
            onClick={onTogglePiP}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all"
            title="Picture-in-Picture (P)"
          >
            <PictureInPicture2 className="w-4 h-4 text-red-500" />
            <span className="hidden md:inline">Mini Player</span>
          </button>

          <span className="text-xs font-mono text-red-500 bg-red-950/60 border border-red-800/40 px-2.5 py-1 rounded hidden sm:inline">
            SAKANET CINEMA
          </span>
        </div>
      </div>

      {/* Center Big Play/Pause Button on Hover / Inactivity */}
      <div className="self-center my-auto pointer-events-auto">
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all transform hover:scale-110 active:scale-95 group"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white" />
          ) : (
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white ml-1" />
          )}
        </button>
      </div>

      {/* Bottom Controls Cluster */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 pointer-events-auto">
        {/* Seek Progress Bar */}
        <PlaybackSlider
          currentTime={currentTime}
          duration={duration}
          bufferedEnd={bufferedEnd}
          onSeek={onSeekAbsolute}
          formatTime={formatTime}
        />

        {/* Lower Toolbar: Playback, Rewind, Volume, Time & Right Actions */}
        <div className="flex items-center justify-between gap-3 text-white pt-1">
          {/* Left Cluster */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Play/Pause */}
            <button
              onClick={onTogglePlay}
              className="text-white hover:text-red-500 transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => onSeekRelative(-10)}
              className="text-zinc-400 hover:text-white transition-colors relative"
              title="Rewind 10s (←)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold">10</span>
            </button>

            {/* Fast Forward 10s */}
            <button
              onClick={() => onSeekRelative(10)}
              className="text-zinc-400 hover:text-white transition-colors relative"
              title="Fast Forward 10s (→)"
            >
              <RotateCw className="w-4 h-4" />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold">10</span>
            </button>

            {/* Volume Management Cluster with Hover Slider */}
            <div
              className="relative flex items-center gap-1.5"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={onToggleMute}
                className="text-zinc-300 hover:text-white transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {renderVolumeIcon()}
              </button>

              <div
                className={`transition-all duration-200 overflow-hidden flex items-center ${
                  showVolumeSlider ? 'w-20 sm:w-24 opacity-100 mr-2' : 'w-0 opacity-0'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-red-600 h-1 rounded-lg bg-zinc-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Dual Time Tracking (Current / Total) */}
            <div className="text-[11px] sm:text-xs font-mono text-zinc-300 flex items-center gap-1 select-none">
              <span className="font-semibold text-white">{formatTime(currentTime)}</span>
              <span className="text-zinc-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Settings Pop-over Toggle */}
            <button
              onClick={onToggleSettings}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings ? 'text-red-500 bg-white/10' : 'text-zinc-400 hover:text-white'
              }`}
              title="Playback Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theater Mode */}
            <button
              onClick={onToggleTheaterMode}
              className={`p-1.5 rounded-lg hidden sm:inline transition-colors ${
                isTheaterMode ? 'text-red-500 bg-white/10' : 'text-zinc-400 hover:text-white'
              }`}
              title="Theater Mode (T)"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
