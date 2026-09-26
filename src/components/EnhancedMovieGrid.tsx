import React, { useState } from 'react';
import { Play, Plus, Check, Star, Download } from 'lucide-react';
import { Movie, DownloadItem } from '../types';
import { DownloadButton } from './DownloadButton';
import { downloadEngine } from '../services/downloadEngine';

interface EnhancedMovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  watchlist: string[];
  downloads: DownloadItem[];
  columns?: number;
}

export const EnhancedMovieGrid: React.FC<EnhancedMovieGridProps> = ({
  movies,
  onSelectMovie,
  onPlayMovie,
  onToggleWatchlist,
  watchlist,
  downloads,
  columns = 4,
}) => {
  const getDownloadItem = (movieId: string) =>
    downloads.find((d) => d.movie_id === movieId);

  if (movies.length === 0) {
    return (
      <div className="col-span-full text-center py-16">
        <p className="text-zinc-400 text-sm">
          No movies found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-4 ${
        columns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
        columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
      }`}
    >
      {movies.map((movie) => {
        const downloadItem = getDownloadItem(movie.id);
        const isInWatchlist = watchlist.includes(movie.id);

        return (
          <div
            key={movie.id}
            className="group relative bg-zinc-900/50 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all hover:shadow-lg hover:shadow-red-600/10 hover:-translate-y-1"
          >
            {/* Poster Image */}
            <div
              className="relative w-full aspect-[3/4.5] overflow-hidden bg-black cursor-pointer"
              onClick={() => onSelectMovie(movie)}
            >
              <img
                src={movie.thumbnail_url}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Download Badge */}
              {downloadItem?.status === 'completed' && (
                <div className="absolute top-2 right-2 bg-emerald-600/90 text-emerald-100 px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-lg">
                  <Check className="w-3 h-3" />
                  Downloaded
                </div>
              )}

              {/* Featured Badge */}
              {movie.is_featured && (
                <div className="absolute top-2 left-2 bg-red-600/90 text-white px-2 py-1 rounded-lg text-[10px] font-semibold shadow-lg">
                  Featured
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayMovie(movie);
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-all transform scale-0 group-hover:scale-100"
                  title="Play movie"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMovie(movie);
                  }}
                  className="bg-zinc-900/90 hover:bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                  title="View details"
                >
                  Details
                </button>
              </div>
            </div>

            {/* Movie Info */}
            <div className="p-3 space-y-2">
              {/* Title */}
              <h3
                className="font-semibold text-sm text-white line-clamp-2 hover:text-red-400 transition-colors cursor-pointer"
                onClick={() => onSelectMovie(movie)}
              >
                {movie.title}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{movie.genre}</span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="font-semibold">{movie.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => onToggleWatchlist(movie.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border transition-all text-xs font-medium ${
                    isInWatchlist
                      ? 'bg-red-600/30 border-red-500/60 text-red-300'
                      : 'bg-zinc-800/60 border-white/10 text-zinc-300 hover:border-white/20'
                  }`}
                  title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Saved</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Save</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadEngine.triggerDownload(movie)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    downloadItem?.status === 'completed'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-800/60 border-white/10 text-zinc-300 hover:border-white/20'
                  }`}
                  title="Download for offline"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
