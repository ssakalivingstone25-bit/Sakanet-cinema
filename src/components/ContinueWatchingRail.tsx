import React, { useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Movie, WatchProgress } from '../types';

interface ContinueWatchingRailProps {
  items: { movie: Movie; progress: WatchProgress }[];
  onResume: (movie: Movie, resumeTime: number) => void;
  onRemoveProgress: (movieId: string) => void;
  onSelectMovie: (movie: Movie) => void;
}

export const ContinueWatchingRail: React.FC<ContinueWatchingRailProps> = ({
  items,
  onResume,
  onRemoveProgress,
  onSelectMovie,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  const formatRemainingTime = (currentTime: number, duration: number) => {
    const remainingSeconds = Math.max(0, duration - currentTime);
    const mins = Math.round(remainingSeconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}h ${remainingMins}m left`;
    }
    return `${mins}m left`;
  };

  return (
    <section className="relative my-8 px-4 md:px-12 group/rail">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block" />
            Continue Watching
          </h2>
          <span className="text-xs text-zinc-400 hidden sm:inline-block font-normal">
            Resume exactly where you left off
          </span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {items.length} in progress
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
          {items.map(({ movie, progress }) => {
            return (
              <div
                key={movie.id}
                onClick={() => onResume(movie, progress.currentTime)}
                className="group relative flex flex-col shrink-0 w-64 md:w-72 cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] hover:z-20"
              >
                {/* 16:9 Landscape Card with Progress Overlay */}
                <div className="relative aspect-video w-full rounded-md overflow-hidden bg-[#18181b] border border-white/10 shadow-md group-hover:border-red-600/50 group-hover:shadow-red-950/40 transition-all">
                  <img
                    src={movie.banner_url || movie.thumbnail_url}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Center Play / Resume Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Dismiss from Continue Watching Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveProgress(movie.id);
                    }}
                    title="Remove from continue watching"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-zinc-400 hover:text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Bottom Progress Bar & Time Left */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 mb-1.5">
                      <span className="flex items-center gap-1 text-red-400 font-semibold">
                        <Clock className="w-3 h-3" />
                        {formatRemainingTime(progress.currentTime, progress.duration)}
                      </span>
                      <span className="text-zinc-400 font-normal">
                        {progress.progressPercent}%
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Title & Info Beneath */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <h4 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-red-400 transition-colors">
                      {movie.title}
                    </h4>
                    <span className="text-xs text-zinc-400">
                      {movie.genre} · {movie.release_year}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMovie(movie);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white underline shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>
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
