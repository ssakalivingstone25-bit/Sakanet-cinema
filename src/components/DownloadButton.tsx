import React from 'react';
import { Download, Pause, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { DownloadItem } from '../types';

interface DownloadButtonProps {
  downloadItem?: DownloadItem;
  onStartDownload: () => void;
  onPauseResume: (status: string) => void;
  variant?: 'compact' | 'full';
  showNotification?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  downloadItem,
  onStartDownload,
  onPauseResume,
  variant = 'compact',
  showNotification = true,
}) => {
  const isCompleted = downloadItem?.status === 'completed';
  const isDownloading = downloadItem?.status === 'downloading';
  const isPaused = downloadItem?.status === 'paused';
  const hasError = downloadItem?.error_message;

  if (variant === 'full') {
    return (
      <div className="space-y-3">
        {/* Download Status Notification */}
        {showNotification && downloadItem && (
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${
            isCompleted
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : isDownloading
              ? 'bg-amber-950/40 border-amber-500/40'
              : isPaused
              ? 'bg-amber-950/60 border-amber-500/50'
              : 'bg-red-950/40 border-red-500/40'
          }`}>
            <div className="pt-0.5">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isDownloading ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : isPaused ? (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              ) : (
                <Download className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="flex-1 text-xs">
              <div className={`font-semibold ${
                isCompleted
                  ? 'text-emerald-300'
                  : isDownloading
                  ? 'text-amber-300'
                  : 'text-red-300'
              }`}>
                {isCompleted
                  ? 'Downloaded - Ready to Watch Offline'
                  : isDownloading
                  ? 'Downloading file...'
                  : isPaused
                  ? 'Download Paused'
                  : 'Starting download...'}
              </div>
              <div className="text-zinc-400 mt-0.5">
                {isDownloading && downloadItem
                  ? `${downloadItem.downloaded_mb} MB / ${downloadItem.file_size_mb} MB at ${downloadItem.download_speed_mbps} MB/s`
                  : isPaused && downloadItem
                  ? `${downloadItem.progress}% complete - See notification for status`
                  : 'Tap Details to manage download'}
              </div>
            </div>
          </div>
        )}

        {/* Main Download Button */}
        <button
          onClick={() => {
            if (downloadItem && (isDownloading || isPaused)) {
              onPauseResume(downloadItem.status);
            } else {
              onStartDownload();
            }
          }}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
            isCompleted
              ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 cursor-default'
              : isDownloading
              ? 'bg-amber-600/20 border border-amber-500/50 text-amber-300 hover:bg-amber-600/30'
              : isPaused
              ? 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50'
              : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50 shadow-lg shadow-red-600/30'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Downloaded</span>
            </>
          ) : isDownloading ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Pause Download</span>
            </>
          ) : isPaused ? (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Resume Download</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Download Movie</span>
            </>
          )}
        </button>

        {/* Progress Bar */}
        {downloadItem && !isCompleted && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{downloadItem.progress}%</span>
              <span className="font-mono">
                {downloadItem.current_chunk}/{downloadItem.total_chunks} chunks
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPaused ? 'bg-amber-500' : 'bg-red-600'
                }`}
                style={{ width: `${downloadItem.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact variant for headers/cards
  return (
    <button
      onClick={() => {
        if (downloadItem && (isDownloading || isPaused)) {
          onPauseResume(downloadItem.status);
        } else {
          onStartDownload();
        }
      }}
      className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all ${
        isCompleted
          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
          : isDownloading
          ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 animate-pulse'
          : isPaused
          ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
          : 'bg-zinc-900/80 border-white/20 text-white hover:border-red-500 hover:text-red-400'
      }`}
      title={
        isCompleted
          ? 'Ready to download'
          : isDownloading
          ? 'Pause download'
          : isPaused
          ? 'Resume download'
          : 'Download for offline viewing'
      }
    >
      {isCompleted ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span className="hidden sm:inline">Offline</span>
        </>
      ) : isDownloading ? (
        <>
          <Pause className="w-4 h-4" />
          <span className="hidden sm:inline">{downloadItem?.progress || 0}%</span>
        </>
      ) : isPaused ? (
        <>
          <Play className="w-4 h-4 fill-current" />
          <span className="hidden sm:inline">Resume</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </>
      )}
    </button>
  );
};
