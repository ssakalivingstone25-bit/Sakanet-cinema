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

export const MovieCard: React.FC<MovieCardProps> = ({
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
  const isPaused = downloadItem?.status === 'paused';

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative flex flex-col shrink-0 w-44 md:w-56 cursor-pointer select-none transition-all duration-300 hover:scale-[1.03] hover:z-20"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-[#18181b] border border-white/5 shadow-md group-hover:shadow-2xl group-hover:shadow-red-950/40 group-hover:border-red-600/40 transition-all duration-300">
        {!imgError ? (
          <img
            src={movie.thumbnail_url}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-black text-center">
            <span className="text-red-500 font-display font-bold text-lg mb-1 tracking-wider">SAKANET</span>
            <span className="text-zinc-300 text-xs font-medium line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Subtle Dark Vignette & Red Edge Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges (Functional & Status) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[11px] font-medium pointer-events-none">
          {movie.download_permission === 'vip' ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold drop-shadow-sm bg-black/60 px-1.5 py-0.5 rounded text-[10px]">
              <Lock className="w-2.5 h-2.5" /> VIP
            </span>
          ) : movie.download_permission === 'premium' ? (
            <span className="text-red-400 font-semibold drop-shadow-sm bg-black/60 px-1.5 py-0.5 rounded text-[10px]">
              PRO
            </span>
          ) : (
            <span />
          )}

          {/* Download Status Badge if present */}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-black/70 px-1.5 py-0.5 rounded text-[10px]">
              <Check className="w-2.5 h-2.5" /> Offline
            </span>
          )}
          {isDownloading && (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-black/70 px-1.5 py-0.5 rounded text-[10px] animate-pulse">
              {downloadItem?.progress}%
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(movie);
              }}
              title="Stream Movie"
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-red-600 hover:text-white transition-all transform hover:scale-110 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(movie);
              }}
              title={isCompleted ? 'Downloaded' : isDownloading ? 'Downloading' : 'Download Offline'}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                isCompleted
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                  : isDownloading
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                  : 'border-white/30 bg-black/50 text-white hover:border-red-500 hover:text-red-500'
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
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                isInWatchlist
                  ? 'border-red-500 bg-red-600/30 text-white'
                  : 'border-white/30 bg-black/50 text-white hover:border-white'
              }`}
            >
              {isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium">
            <span className="text-amber-400 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {movie.rating}
            </span>
            <span className="text-zinc-500">·</span>
            <span>{movie.duration_minutes}m</span>
            <span className="text-zinc-500">·</span>
            <span>{movie.release_year}</span>
          </div>
        </div>
      </div>

      {/* Card Info Beneath */}
      <div className="mt-2 flex flex-col">
        <h4 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-red-400 transition-colors">
          {movie.title}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5 font-normal">
          <span>{movie.genre}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{movie.video_qualities[0] || '1080p'}</span>
        </div>
      </div>
    </div>
  );
};
