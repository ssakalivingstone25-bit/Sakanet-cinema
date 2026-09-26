import React, { useState } from 'react';
import { Settings, Check, ChevronRight, Gauge, Layers, Subtitles, Volume2 } from 'lucide-react';

interface SettingsMenuProps {
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  selectedQuality: string;
  onSelectQuality: (quality: string) => void;
  availableQualities: string[];
  selectedAudio: string;
  onSelectAudio: (audio: string) => void;
  audioTracks: string[];
  selectedSubtitle: string;
  onSelectSubtitle: (sub: string) => void;
  subtitles: string[];
  isOpen: boolean;
  onClose: () => void;
}

type MenuPage = 'main' | 'speed' | 'quality' | 'audio' | 'subtitles';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  playbackSpeed,
  onChangeSpeed,
  selectedQuality,
  onSelectQuality,
  availableQualities,
  selectedAudio,
  onSelectAudio,
  audioTracks,
  selectedSubtitle,
  onSelectSubtitle,
  subtitles,
  isOpen,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState<MenuPage>('main');

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 right-4 sm:right-8 z-50 w-64 bg-[#121215]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 shadow-2xl text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Page: Main Root Menu */}
      {currentPage === 'main' && (
        <div className="space-y-1">
          <div className="px-3 py-1.5 font-bold text-white text-xs border-b border-white/10 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-red-500" />
            <span>Playback Settings</span>
          </div>

          {/* Speed Item */}
          <button
            onClick={() => setCurrentPage('speed')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
              <span>Speed</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="text-[11px] font-mono">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Quality Item */}
          <button
            onClick={() => setCurrentPage('quality')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Quality</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="text-[11px] font-mono text-red-400">{selectedQuality}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Audio Track Item */}
          <button
            onClick={() => setCurrentPage('audio')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Audio</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400 max-w-[110px] truncate">
              <span className="text-[11px] truncate">{selectedAudio.split(' ')[0]}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </div>
          </button>

          {/* Subtitles Item */}
          <button
            onClick={() => setCurrentPage('subtitles')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Subtitles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Subtitles</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="text-[11px]">{selectedSubtitle}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Page: Playback Speed */}
      {currentPage === 'speed' && (
        <div className="space-y-1">
          <button
            onClick={() => setCurrentPage('main')}
            className="w-full px-3 py-1.5 font-bold text-white text-xs border-b border-white/10 flex items-center gap-1.5 hover:text-red-400"
          >
            <span>‹</span>
            <span>Playback Speed</span>
          </button>
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => {
                onChangeSpeed(speed);
                setCurrentPage('main');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span>{speed === 1 ? '1.0x (Normal)' : `${speed}x`}</span>
              {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-red-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Page: Video Quality */}
      {currentPage === 'quality' && (
        <div className="space-y-1">
          <button
            onClick={() => setCurrentPage('main')}
            className="w-full px-3 py-1.5 font-bold text-white text-xs border-b border-white/10 flex items-center gap-1.5 hover:text-red-400"
          >
            <span>‹</span>
            <span>Video Resolution</span>
          </button>
          {availableQualities.map((quality) => (
            <button
              key={quality}
              onClick={() => {
                onSelectQuality(quality);
                setCurrentPage('main');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span>{quality}</span>
              {selectedQuality === quality && <Check className="w-3.5 h-3.5 text-red-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Page: Audio Tracks */}
      {currentPage === 'audio' && (
        <div className="space-y-1">
          <button
            onClick={() => setCurrentPage('main')}
            className="w-full px-3 py-1.5 font-bold text-white text-xs border-b border-white/10 flex items-center gap-1.5 hover:text-red-400"
          >
            <span>‹</span>
            <span>Audio Tracks</span>
          </button>
          {(audioTracks.length ? audioTracks : ['English [Stereo]']).map((track) => (
            <button
              key={track}
              onClick={() => {
                onSelectAudio(track);
                setCurrentPage('main');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span className="truncate pr-2">{track}</span>
              {selectedAudio === track && <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Page: Subtitles */}
      {currentPage === 'subtitles' && (
        <div className="space-y-1">
          <button
            onClick={() => setCurrentPage('main')}
            className="w-full px-3 py-1.5 font-bold text-white text-xs border-b border-white/10 flex items-center gap-1.5 hover:text-red-400"
          >
            <span>‹</span>
            <span>Subtitles / Captions</span>
          </button>
          {['Off', ...(subtitles.length ? subtitles : ['English [CC]'])].map((sub) => (
            <button
              key={sub}
              onClick={() => {
                onSelectSubtitle(sub);
                setCurrentPage('main');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
            >
              <span>{sub}</span>
              {selectedSubtitle === sub && <Check className="w-3.5 h-3.5 text-red-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
