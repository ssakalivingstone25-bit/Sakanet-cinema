import React, { useEffect, useRef } from 'react';
import {
  Settings,
  Clock,
  Subtitles,
  Volume2,
  PictureInPicture,
  Download,
  Flag,
  ChevronRight,
  Check,
} from 'lucide-react';

export interface QualityOption {
  label: string;
  value: string;
}

export interface SettingsMenuProps {
  onClose: () => void;
  // Quality
  currentQuality: string;
  availableQualities: string[];
  onQualityChange: (quality: string) => void;
  // Speed
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  // Subtitles
  currentSubtitle: string;
  availableSubtitles: string[];
  onSubtitleChange: (sub: string) => void;
  // Audio Tracks
  currentAudioTrack: string;
  availableAudioTracks: string[];
  onAudioTrackChange: (track: string) => void;
  // PiP toggle
  isPiPEnabled: boolean;
  onTogglePiP: () => void;
  // Download
  onDownload: () => void;
  // Report
  onReport: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onClose,
  currentQuality,
  availableQualities,
  onQualityChange,
  currentSpeed,
  onSpeedChange,
  currentSubtitle,
  availableSubtitles,
  onSubtitleChange,
  currentAudioTrack,
  availableAudioTracks,
  onAudioTrackChange,
  isPiPEnabled,
  onTogglePiP,
  onDownload,
  onReport,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Submenu navigation state: null = root menu, or 'quality' | 'speed' | 'subtitles' | 'audio'
  const [activeSubmenu, setActiveSubmenu] = React.useState<
    'quality' | 'speed' | 'subtitles' | 'audio' | null
  >(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div
      ref={menuRef}
      className="absolute top-14 right-4 z-50 w-72 sm:w-80 bg-[#121217]/95 backdrop-blur-2xl text-white rounded-2xl border border-white/10 shadow-2xl py-2 px-1 select-none overflow-hidden transition-all duration-200 ease-out"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Quality Submenu */}
      {activeSubmenu === 'quality' && (
        <div className="py-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-xs font-bold text-zinc-300">
            <button
              onClick={() => setActiveSubmenu(null)}
              className="text-red-400 hover:text-white"
            >
              ← Back
            </button>
            <span>Select Video Quality</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {availableQualities.map((q) => (
              <button
                key={q}
                onClick={() => {
                  onQualityChange(q);
                  setActiveSubmenu(null);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
              >
                <span className={currentQuality === q ? 'text-red-400 font-bold' : 'text-zinc-200'}>
                  {q}
                </span>
                {currentQuality === q && <Check className="w-4 h-4 text-red-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Playback Speed Submenu */}
      {activeSubmenu === 'speed' && (
        <div className="py-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-xs font-bold text-zinc-300">
            <button
              onClick={() => setActiveSubmenu(null)}
              className="text-red-400 hover:text-white"
            >
              ← Back
            </button>
            <span>Playback Speed</span>
          </div>
          <div className="py-1">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onSpeedChange(s);
                  setActiveSubmenu(null);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
              >
                <span className={currentSpeed === s ? 'text-red-400 font-bold' : 'text-zinc-200'}>
                  {s === 1.0 ? 'Normal (1.0x)' : `${s}x`}
                </span>
                {currentSpeed === s && <Check className="w-4 h-4 text-red-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Subtitles / CC Submenu */}
      {activeSubmenu === 'subtitles' && (
        <div className="py-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-xs font-bold text-zinc-300">
            <button
              onClick={() => setActiveSubmenu(null)}
              className="text-red-400 hover:text-white"
            >
              ← Back
            </button>
            <span>Subtitles / Closed Captions</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              onClick={() => {
                onSubtitleChange('Off');
                setActiveSubmenu(null);
              }}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
            >
              <span className={currentSubtitle === 'Off' ? 'text-red-400 font-bold' : 'text-zinc-200'}>
                Off
              </span>
              {currentSubtitle === 'Off' && <Check className="w-4 h-4 text-red-400" />}
            </button>
            {availableSubtitles.map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  onSubtitleChange(sub);
                  setActiveSubmenu(null);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
              >
                <span className={currentSubtitle === sub ? 'text-red-400 font-bold' : 'text-zinc-200'}>
                  {sub}
                </span>
                {currentSubtitle === sub && <Check className="w-4 h-4 text-red-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Audio Track Submenu */}
      {activeSubmenu === 'audio' && (
        <div className="py-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-xs font-bold text-zinc-300">
            <button
              onClick={() => setActiveSubmenu(null)}
              className="text-red-400 hover:text-white"
            >
              ← Back
            </button>
            <span>Audio Tracks</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {availableAudioTracks.map((trk) => (
              <button
                key={trk}
                onClick={() => {
                  onAudioTrackChange(trk);
                  setActiveSubmenu(null);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors"
              >
                <span className={currentAudioTrack === trk ? 'text-red-400 font-bold' : 'text-zinc-200'}>
                  {trk}
                </span>
                {currentAudioTrack === trk && <Check className="w-4 h-4 text-red-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Root Menu matching Screenshot EXACTLY */}
      {!activeSubmenu && (
        <div className="space-y-0.5 text-xs sm:text-[13px]">
          {/* 1. Quality */}
          <button
            onClick={() => setActiveSubmenu('quality')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
              <Settings className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="font-medium">Quality</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 text-xs font-semibold">
              <span>{currentQuality}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 2. Playback speed */}
          <button
            onClick={() => setActiveSubmenu('speed')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
              <Clock className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="font-medium">Playback speed</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 text-xs font-semibold">
              <span>{currentSpeed === 1 ? '1.0x' : `${currentSpeed}x`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 3. Subtitles / CC */}
          <button
            onClick={() => setActiveSubmenu('subtitles')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
              <Subtitles className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="font-medium">Subtitles / CC</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 text-xs font-semibold">
              <span>{currentSubtitle}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 4. Audio track */}
          <button
            onClick={() => setActiveSubmenu('audio')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
              <Volume2 className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="font-medium">Audio track</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 text-xs font-semibold">
              <span className="truncate max-w-[100px]">{currentAudioTrack}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 5. Picture in picture Toggle */}
          <div className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-xl hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 text-zinc-200">
              <PictureInPicture className="w-4 h-4 text-zinc-400" />
              <span className="font-medium">Picture in picture</span>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={onTogglePiP}
              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                isPiPEnabled ? 'bg-red-600' : 'bg-zinc-700'
              }`}
              title="Toggle Picture in Picture"
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform transform absolute top-0.5 left-0.5 ${
                  isPiPEnabled ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 6. Download */}
          <button
            onClick={onDownload}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span className="font-medium">Download</span>
          </button>

          {/* 7. Report */}
          <button
            onClick={onReport}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer"
          >
            <Flag className="w-4 h-4 text-zinc-400" />
            <span className="font-medium">Report</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
