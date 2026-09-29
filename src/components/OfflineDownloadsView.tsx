import React, { useState } from 'react';
import {
  Download,
  Play,
  Pause,
  Trash2,
  HardDrive,
  Wifi,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderOpen,
} from 'lucide-react';
import { DownloadItem, Movie, UserProfile } from '../types';
import { downloadEngine } from '../services/downloadEngine';
import { storageService } from '../services/storageService';

interface OfflineDownloadsViewProps {
  downloads: DownloadItem[];
  movies: Movie[];
  user: UserProfile;
  isOfflineMode: boolean;
  onToggleOfflineMode: (offline: boolean) => void;
  onPlayMovie: (movie: Movie, isOffline: boolean) => void;
  onSelectMovie: (movie: Movie) => void;
}

export const OfflineDownloadsView: React.FC<OfflineDownloadsViewProps> = ({
  downloads,
  movies,
  user,
  isOfflineMode,
  onToggleOfflineMode,
  onPlayMovie,
  onSelectMovie,
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

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
  const quotaUsedPercent = Math.min(
    100,
    Math.round((totalDownloadedMb / user.download_quota_limit_mb) * 100)
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    storageService.clearAllDownloads();
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F20D28] inline-block shadow-[0_0_8px_#F20D28]" />
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Downloaded Movies
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Watch your downloaded movies offline anytime without an active internet connection.
          </p>
        </div>

        {downloads.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono">
              {downloads.length} {downloads.length === 1 ? 'movie' : 'movies'} ({(totalDownloadedMb / 1024).toFixed(2)} GB)
            </span>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* In-App Confirmation Modal for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121216] border border-white/15 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Clear All Downloads?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will remove all downloaded movies from your offline library. You can download them again anytime.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-[#F20D28] hover:bg-red-600 text-xs font-bold text-white shadow-lg cursor-pointer"
              >
                Clear Downloads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60'
            }`}
          >
            All Downloads ({downloads.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60'
            }`}
          >
            Offline Ready ({completedDownloads.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'active'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60'
            }`}
          >
            In Progress ({activeDownloads.length})
          </button>
        </div>
      </div>

      {/* Downloads List */}
      {filteredDownloads.length === 0 ? (
        <div className="bg-[#121216] border border-white/5 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 text-zinc-500 mx-auto flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No downloads in this view</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Browse the catalog and tap the download icon on any movie to stage it for offline watching.
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
                className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Movie Info */}
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => movie && onSelectMovie(movie)}
                    className="relative w-16 h-22 rounded-md overflow-hidden bg-zinc-900 shrink-0 cursor-pointer group"
                  >
                    <img
                      src={item.thumbnail_url}
                      alt={item.movie_title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  </div>

                  <div>
                    <h4
                      onClick={() => movie && onSelectMovie(movie)}
                      className="text-sm md:text-base font-semibold text-white cursor-pointer hover:text-red-400 transition-colors"
                    >
                      {item.movie_title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span>{movie?.genre || 'Cinema'}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="font-mono">
                        {(item.file_size_mb / 1024).toFixed(2)} GB
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        Chunk {item.current_chunk}/{item.total_chunks}
                      </span>
                    </div>

                    {/* Offline playback status label */}
                    {isCompleted && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready for Offline Playback</span>
                      </div>
                    )}

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
                <div className="flex flex-col md:items-end justify-center gap-2">
                  {!isCompleted && (
                    <div className="w-full md:w-64 space-y-1">
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span className="text-zinc-300">
                          {isDownloading ? `${item.download_speed_mbps} MB/s` : 'Paused'}
                        </span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPaused ? 'bg-amber-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {/* Play Button: always works if downloaded or if online */}
                    <button
                      onClick={() => {
                        if (!movie) return;
                        if (isCompleted && item.blob_url) {
                          onPlayMovie({ ...movie, file_url: item.blob_url }, true);
                        } else {
                          onPlayMovie(movie, isCompleted);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isCompleted ? 'Play Movie' : 'Stream Now'}</span>
                    </button>

                    {/* Direct Save to Device Button if already downloaded */}
                    {isCompleted && item.blob_url && (
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = item.blob_url!;
                          a.download = `${item.movie_title.replace(/\s+/g, '_')}.mp4`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors"
                        title="Save MP4 Video File"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {/* Pause / Resume button if active */}
                    {!isCompleted && (
                      <button
                        onClick={() => handlePauseResume(item.id, item.status)}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors"
                        title={isDownloading ? 'Pause download' : 'Resume download'}
                      >
                        {isDownloading ? (
                          <Pause className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-400 fill-current" />
                        )}
                      </button>
                    )}

                    {/* Delete action */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-zinc-900 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 rounded-lg border border-white/10 transition-colors"
                      title="Remove Download"
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
