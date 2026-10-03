import React, { useState } from 'react';
import { X, Play, ChevronDown } from 'lucide-react';
import { Movie, DownloadItem } from '../types';
import { DownloadButton } from './DownloadButton';

interface EnhancedMovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (movie: Movie, startTime?: number) => void;
  onToggleWatchlist: (movieId: string) => void;
  isInWatchlist: boolean;
  downloadItem?: DownloadItem;
  onReviewAdded: () => void;
}

export const EnhancedMovieDetailsModal: React.FC<EnhancedMovieDetailsModalProps> = ({
  movie,
  onClose,
  onPlay,
  onToggleWatchlist,
  isInWatchlist,
  downloadItem,
  onReviewAdded,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Backdrop Dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Compact Modal - Matches Screenshot Style */}
      <div className="relative w-full max-w-2xl bg-[#1a1a1f] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center border border-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Poster + Quick Actions Layout */}
        <div className="flex flex-col sm:flex-row gap-6 p-6">
          {/* Movie Poster */}
          <div className="w-full sm:w-40 shrink-0">
            <img
              src={movie.poster_url || movie.thumbnail_url}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="w-full rounded-lg object-cover shadow-lg"
            />
          </div>

          {/* Movie Info & Actions */}
          <div className="flex-1 space-y-4">
            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-2 text-xs text-red-500 mb-1">
                <span className="font-semibold">{movie.genre}</span>
                {movie.secondary_genre && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span>{movie.secondary_genre}</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{movie.title}</h2>
              <p className="text-xs text-zinc-400">
                {movie.release_year} · {movie.duration_minutes} min
              </p>
            </div>

            {/* Synopsis */}
            <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
              {movie.synopsis}
            </p>

            {/* Primary Actions */}
            <div className="space-y-2">
              <button
                onClick={() => onPlay(movie, 0)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-4 py-3 rounded-lg shadow-lg shadow-red-600/30 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Now</span>
              </button>

              {/* Download Button - Full Variant */}
              <DownloadButton
                downloadItem={downloadItem}
                onStartDownload={() => {/* handled by parent */}}
                onPauseResume={() => {/* handled by parent */}}
                variant="full"
                showNotification={true}
              />
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onToggleWatchlist(movie.id)}
                className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${
                  isInWatchlist
                    ? 'bg-red-600/30 border-red-500/60 text-red-300'
                    : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
              </button>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-semibold py-2 px-3 rounded-lg bg-zinc-900/60 border border-white/10 text-zinc-300 hover:border-white/20 transition-all flex items-center gap-1"
              >
                <span>Details</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Details Section */}
        {showDetails && (
          <div className="border-t border-white/10 px-6 py-4 bg-zinc-900/30 space-y-3 max-h-64 overflow-y-auto">
            {/* Cast & Crew */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-zinc-400 mb-2">Director</h4>
              <p className="text-sm text-white">{movie.director}</p>
            </div>

            {/* Cast */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-zinc-400 mb-2">Cast</h4>
              <div className="flex flex-wrap gap-1.5">
                {movie.cast.slice(0, 5).map((actor, idx) => (
                  <span
                    key={idx}
                    className="bg-zinc-800/60 text-zinc-300 px-2 py-0.5 rounded text-[11px]"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>

            {/* Technical Specs */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-zinc-400 mb-2">
                Video & Audio
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Qualities</span>
                  {movie.video_qualities.slice(0, 2).join(', ')}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Audio</span>
                  {movie.audio_tracks.slice(0, 1).join(', ')}
                </div>
              </div>
            </div>

            {/* Rating */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-zinc-400 mb-1">Rating</h4>
              <p className="text-sm text-amber-400 font-semibold">
                ⭐ {movie.rating.toFixed(1)} / 5.0
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
