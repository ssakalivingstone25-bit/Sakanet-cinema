import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, DownloadItem } from '../types';
import { MovieCard } from './MovieCard';

interface MovieRailProps {
  title: string;
  subtitle?: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onDownloadMovie: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  watchlist: string[];
  downloads: DownloadItem[];
}

export const MovieRail: React.FC<MovieRailProps> = ({
  title,
  subtitle,
  movies,
  onSelectMovie,
  onPlayMovie,
  onDownloadMovie,
  onToggleWatchlist,
  watchlist,
  downloads,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -480 : 480;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="relative my-8 px-4 md:px-12 group/rail">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block" />
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-zinc-400 hidden sm:inline-block font-normal">
              {subtitle}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {movies.length} {movies.length === 1 ? 'title' : 'titles'}
        </span>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute -left-3 md:-left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-16 bg-black/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-all rounded-r-md backdrop-blur-sm border-r border-y border-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex items-start gap-4 overflow-x-auto hide-scrollbar py-2 px-1 scroll-smooth"
        >
          {movies.map((movie) => {
            const dl = downloads.find((d) => d.movie_id === movie.id);
            const inList = watchlist.includes(movie.id);

            return (
              <MovieCard
                key={movie.id}
                movie={movie}
                onSelect={onSelectMovie}
                onPlay={onPlayMovie}
                onDownload={onDownloadMovie}
                onToggleWatchlist={onToggleWatchlist}
                isInWatchlist={inList}
                downloadItem={dl}
              />
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute -right-3 md:-right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-16 bg-black/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-all rounded-l-md backdrop-blur-sm border-l border-y border-white/10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
};
