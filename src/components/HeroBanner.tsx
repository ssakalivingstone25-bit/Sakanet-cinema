import React, { useState } from 'react';
import { Play, Download, Info, Plus, Check, Star, ShieldCheck, Sparkles } from 'lucide-react';
import { Movie, DownloadItem } from '../types';

interface HeroBannerProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  onDownload: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  isInWatchlist: boolean;
  downloadItem?: DownloadItem;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onPlay,
  onSelect,
  onDownload,
  onToggleWatchlist,
  isInWatchlist,
  downloadItem,
}) => {
  const [imgError, setImgError] = useState(false);

  const isCompleted = downloadItem?.status === 'completed';
  const isDownloading = downloadItem?.status === 'downloading';

  return (
    <div className="relative w-full h-[65vh] min-h-[500px] max-h-[720px] select-none overflow-hidden bg-black">
      {/* Background Cinematic Banner */}
      <div className="absolute inset-0">
        {!imgError ? (
          <img
            src={movie.banner_url || movie.thumbnail_url}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top opacity-60 scale-105 animate-pulse duration-[12000ms]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-black via-zinc-950 to-red-950 opacity-80" />
        )}

        {/* Cinematic Scrim Overlays */}
        {/* Left-to-right fade for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent w-full md:w-3/4" />
        {/* Bottom-to-top fade into content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
        {/* Top subtle vignette */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#09090b]/90 to-transparent" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-12 flex flex-col justify-end pb-12 md:pb-16">
        <div className="max-w-2xl">
          {/* Subtle Editorial Kicker */}
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider uppercase text-red-500">
            <span className="flex items-center gap-1 bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 text-[11px]">
              <Sparkles className="w-3 h-3" /> SAKANET SPOTLIGHT
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">{movie.genre}</span>
            {movie.secondary_genre && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">{movie.secondary_genre}</span>
              </>
            )}
          </div>

          {/* Title in High-Character Display font */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display text-white tracking-tight text-balance leading-none mb-3 drop-shadow-md">
            {movie.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300 mb-4 font-medium">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {movie.rating.toFixed(1)}
              <span className="text-zinc-500 font-normal">({movie.review_count})</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>{movie.release_year}</span>
            <span className="text-zinc-600">·</span>
            <span>{movie.duration_minutes} min</span>
            <span className="text-zinc-600">·</span>
            <span className="border border-white/20 px-1 py-0.2 text-[10px] rounded text-zinc-300">
              {movie.video_qualities[0] || '4K UHD'}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-[11px] text-zinc-400 hidden sm:inline">
              Dolby Atmos
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-sm md:text-base text-zinc-300 line-clamp-3 mb-6 font-normal leading-relaxed max-w-xl text-balance">
            {movie.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Play Stream Primary CTA */}
            <button
              onClick={() => onPlay(movie)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm md:text-base px-6 py-2.5 rounded-lg shadow-lg shadow-red-700/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Stream Now</span>
            </button>

            {/* Offline Download Action */}
            <button
              onClick={() => onDownload(movie)}
              className={`flex items-center gap-2 font-medium text-sm md:text-base px-5 py-2.5 rounded-lg border transition-all hover:scale-105 active:scale-95 backdrop-blur-md ${
                isCompleted
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : isDownloading
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 animate-pulse'
                  : 'bg-zinc-900/80 border-white/20 text-white hover:bg-zinc-800 hover:border-red-500'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {isCompleted
                  ? 'Downloaded (Offline Ready)'
                  : isDownloading
                  ? `Downloading ${downloadItem?.progress}%`
                  : 'Download Offline'}
              </span>
            </button>

            {/* More Details & Reviews */}
            <button
              onClick={() => onSelect(movie)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm md:text-base px-4 py-2.5 rounded-lg border border-white/15 transition-all backdrop-blur-md"
            >
              <Info className="w-4 h-4 text-zinc-300" />
              <span>Details & Reviews</span>
            </button>

            {/* Watchlist toggle */}
            <button
              onClick={() => onToggleWatchlist(movie.id)}
              title={isInWatchlist ? 'In My List' : 'Add to My List'}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all ${
                isInWatchlist
                  ? 'border-red-500 bg-red-600/30 text-white'
                  : 'border-white/20 bg-zinc-900/80 text-zinc-300 hover:border-white hover:text-white'
              }`}
            >
              {isInWatchlist ? <Check className="w-5 h-5 text-red-400" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
