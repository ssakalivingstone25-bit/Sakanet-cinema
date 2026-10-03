import React, { useState } from 'react';
import {
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Smartphone,
  HardDrive,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { DownloadItem, Movie, UserProfile } from '../types';
import { downloadEngine } from '../services/downloadEngine';
import { storageService } from '../services/storageService';

interface OfflineDownloadsViewProps {
  downloads: DownloadItem[];
  movies: Movie[];
  user?: UserProfile;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: (offline: boolean) => void;
  onPlayMovie?: (movie: Movie, isOffline: boolean) => void;
  onSelectMovie?: (movie: Movie) => void;
}

export const OfflineDownloadsView: React.FC<OfflineDownloadsViewProps> = ({
  downloads,
  movies,
  onSelectMovie,
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const activeDownloads = downloads.filter((d) => d.status !== 'completed');

  const filteredDownloads =
    filter === 'completed'
      ? completedDownloads
      : filter === 'active'
      ? activeDownloads
      : downloads;

  const totalDownloadedMb = downloads.reduce(
    (acc, curr) => acc + (curr.status === 'completed' ? curr.file_size_mb : curr.downloaded_mb),
    0
  );

  const handlePauseResume = (id: string, currentStatus: string) => {
    if (currentStatus === 'downloading') {
      downloadEngine.pause(id);
    } else if (currentStatus === 'paused') {
      downloadEngine.resume(id);
    }
  };

  const handleDelete = (id: string) => {
    storageService.removeDownload(id);
  };

  const handleClearAll = () => {
    storageService.clearAllDownloads();
    setShowClearConfirm(false);
  };

  const handleReDownloadToPhone = (item: DownloadItem) => {
    if (item.blob_url) {
      downloadEngine.triggerDirectDeviceDownload(
        item.blob_url,
        `${item.movie_title.replace(/\s+/g, '_')}.mp4`
      );
    } else {
      const movie = movies.find((m) => m.id === item.movie_id);
      if (movie) {
        downloadEngine.triggerDownload(movie);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none pb-24">
      {/* Top Banner (Proportional & Humanistic) */}
      <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E50914] inline-block shadow-[0_0_8px_#E50914]" />
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Phone Storage Downloads
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
            All downloaded films are transferred directly to your device storage in real time for genuine offline access.
          </p>
        </div>

        {downloads.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-400 font-mono">
              {downloads.length} {downloads.length === 1 ? 'file' : 'files'} ({(totalDownloadedMb / 1024).toFixed(2)} GB)
            </span>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Records</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121319] border border-white/15 rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <h3 className="text-base font-bold text-white">Clear Download History?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This clears your download history list in the app. The actual movie files in your phone's Downloads folder remain safe on your device.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-3.5 py-1.5 rounded-lg bg-[#E50914] hover:bg-red-600 text-xs font-bold text-white shadow-lg cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#E50914] text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/80'
            }`}
          >
            All ({downloads.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'completed'
                ? 'bg-[#E50914] text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/80'
            }`}
          >
            Downloaded ({completedDownloads.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'active'
                ? 'bg-[#E50914] text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/80'
            }`}
          >
            In Progress ({activeDownloads.length})
          </button>
        </div>
      </div>

      {/* Downloads List (Proportional, Clean, Movie Name + Tick Verification) */}
      {filteredDownloads.length === 0 ? (
        <div className="bg-[#121319] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/10 text-zinc-500 mx-auto flex items-center justify-center">
            <Download className="w-5 h-5 text-[#E50914]" />
          </div>
          <h3 className="text-sm font-semibold text-white">No downloads in this view</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Browse the cinema catalog and tap the download icon on any movie to stream and save it straight into your device downloads folder.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDownloads.map((item) => {
            const movie = movies.find((m) => m.id === item.movie_id);
            const isCompleted = item.status === 'completed';
            const isDownloading = item.status === 'downloading';
            const isPaused = item.status === 'paused';

            return (
              <div
                key={item.id}
                className="bg-[#121319] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Movie Title & Confirmation Tick (No full video player embedded) */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Status Indicator Icon */}
                  <div className="shrink-0 pt-0.5 sm:pt-0">
                    {isCompleted ? (
                      <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : isDownloading ? (
                      <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-[#E50914] animate-pulse">
                        <Download className="w-5 h-5 animate-bounce" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
                        <Pause className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        onClick={() => movie && onSelectMovie?.(movie)}
                        className="text-sm sm:text-base font-bold text-white hover:text-red-400 transition-colors cursor-pointer truncate"
                      >
                        {item.movie_title}
                      </h4>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Downloaded</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span className="font-mono text-zinc-300">
                        {(item.file_size_mb / 1024).toFixed(2)} GB
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-zinc-500" />
                        <span>Saved to Phone Downloads folder</span>
                      </span>
                      {item.completed_at && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500 text-[11px]">
                            {new Date(item.completed_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Network paused warning banner */}
                    {item.error_message && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{item.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex flex-col sm:items-end justify-center gap-2 shrink-0">
                  {!isCompleted && (
                    <div className="w-full sm:w-56 space-y-1">
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span className="text-zinc-300">
                          {isDownloading ? `${item.download_speed_mbps} MB/s` : 'Paused'}
                        </span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPaused ? 'bg-amber-500' : 'bg-[#E50914]'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Re-download button if already completed */}
                    {isCompleted && (
                      <button
                        onClick={() => handleReDownloadToPhone(item)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Save again to phone"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Save to Phone Again</span>
                      </button>
                    )}

                    {/* Pause / Resume button if active */}
                    {!isCompleted && (
                      <button
                        onClick={() => handlePauseResume(item.id, item.status)}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors"
                        title={isDownloading ? 'Pause download' : 'Resume download'}
                      >
                        {isDownloading ? (
                          <Pause className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-400 fill-current" />
                        )}
                      </button>
                    )}

                    {/* Delete record action */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 bg-zinc-900 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 rounded-lg border border-white/10 transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OfflineDownloadsView;
