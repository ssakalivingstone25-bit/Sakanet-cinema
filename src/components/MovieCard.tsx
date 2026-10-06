import React, { useState } from 'react';
import { Play, Download, Plus, Check, Star, Lock } from 'lucide-react';
import { Movie, DownloadItem } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  onPlay: (movie: Movie) => void;
  onDownload: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  isInWatchlist: boolean;
  downloadItem?: DownloadItem;
}

export const MovieCard: React.FC<MovieCardProps> = React.memo(({
  movie,
  onSelect,
  onPlay,
  onDownload,
  onToggleWatchlist,
  isInWatchlist,
  downloadItem,
}) => {
  const [imgError, setImgError] = useState(false);

  const isCompleted = downloadItem?.status === 'completed';
  const isDownloading = downloadItem?.status === 'downloading';

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative flex flex-col justify-between shrink-0 w-48 md:w-56 cursor-pointer select-none rounded-2xl border border-white/[0.08] hover:border-red-500/50 focus-within:border-red-500/50 bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] will-change-transform overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent"
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] shadow-inner">
        {!imgError ? (
          <img
            src={movie.poster_url || movie.thumbnail_url}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-900 to-black text-center">
            <span className="text-red-500 font-display font-bold text-lg mb-1 tracking-wider">SAKANET</span>
            <span className="text-zinc-300 text-xs font-medium line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Subtle Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent pointer-events-none" />

        {/* Top Badges (Pill style with blurred background) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {movie.download_permission === 'vip' ? (
            <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-amber-400 border border-amber-500/30 shadow-sm">
              <Lock className="w-2.5 h-2.5" /> VIP
            </span>
          ) : movie.download_permission === 'premium' ? (
            <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-red-400 border border-red-500/30 shadow-sm">
              PRO
            </span>
          ) : (
            <span />
          )}

          {/* Download Status Badge if present */}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Check className="w-2.5 h-2.5" /> Offline
            </span>
          )}
          {isDownloading && (
            <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-amber-400 border border-amber-500/30 shadow-sm animate-pulse">
              {downloadItem?.progress}%
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/95 via-black/50 to-transparent backdrop-blur-[1px]">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(movie);
              }}
              title="Stream Movie"
              className="w-10 h-10 rounded-full bg-[#E50914] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(229,9,20,0.5)] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(movie);
              }}
              title={isCompleted ? 'Downloaded' : isDownloading ? 'Downloading' : 'Download Offline'}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${
                isCompleted
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                  : isDownloading
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                  : 'border-white/20 bg-black/50 text-white hover:border-red-500 hover:text-red-400'
              }`}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(movie.id);
              }}
              title={isInWatchlist ? 'Remove from My List' : 'Add to My List'}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${
                isInWatchlist
                  ? 'border-red-500 bg-red-600/30 text-white'
                  : 'border-white/20 bg-black/50 text-white hover:border-white'
              }`}
            >
              {isInWatchlist ? <Check className="w-4 h-4 text-red-400" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <span className="text-amber-400 flex items-center gap-0.5 font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {movie.rating}
            </span>
            <span className="text-zinc-500">·</span>
            <span>{movie.duration_minutes}m</span>
            <span className="text-zinc-500">·</span>
            <span className="font-mono">{movie.release_year}</span>
          </div>
        </div>
      </div>

      {/* Card Info Beneath */}
      <div className="mt-3 flex flex-col justify-between flex-1">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-red-400 transition-colors">
            {movie.title}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-normal">
            <span className="truncate max-w-[90px]">{movie.genre}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 font-mono text-[11px]">{movie.video_qualities?.[0] || '1080p'}</span>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] mt-2.5">
          <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide text-zinc-400 border border-white/[0.06]">
            {movie.file_size_mb ? `${movie.file_size_mb} MB` : 'Stream'}
          </span>
          <span className="text-[11px] text-[#E50914] font-bold truncate max-w-[90px]">
            {movie.vj_name || 'VJ Junior'}
          </span>
        </div>
      </div>
    </div>
  );
});
