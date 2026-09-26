import React, { useState } from 'react';
import { Search, Filter, SlidersHorizontal, Star, Sparkles } from 'lucide-react';
import { Movie, DownloadItem } from '../types';
import { MovieCard } from './MovieCard';

interface BrowseCatalogViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onDownloadMovie: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  watchlist: string[];
  downloads: DownloadItem[];
  searchTerm: string;
  onSearchChange: (q: string) => void;
}

export const BrowseCatalogView: React.FC<BrowseCatalogViewProps> = ({
  movies,
  onSelectMovie,
  onPlayMovie,
  onDownloadMovie,
  onToggleWatchlist,
  watchlist,
  downloads,
  searchTerm,
  onSearchChange,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'duration' | 'title'>('rating');

  // Filter movies (only active live feed movies)
  const liveMovies = movies.filter((m) => m.is_active);

  const defaultGenres = ['All', 'Sci-Fi', 'Action', 'Thriller', 'Drama', 'Crime', 'Horror', 'Adventure', 'Comedy'];
  const movieGenres = Array.from(new Set(liveMovies.map((m) => m.genre).filter(Boolean)));
  const genres = ['All', ...Array.from(new Set([...defaultGenres.filter((g) => g !== 'All'), ...movieGenres]))];

  const filteredMovies = liveMovies
    .filter((movie) => {
      // Genre filter (case-insensitive exact primary or substring secondary match)
      if (selectedGenre !== 'All') {
        const sel = selectedGenre.toLowerCase();
        const matchesPrimary = movie.genre?.toLowerCase() === sel;
        const matchesSecondary = movie.secondary_genre?.toLowerCase().includes(sel);
        if (!matchesPrimary && !matchesSecondary) {
          return false;
        }
      }
      // Tier filter
      if (selectedTier !== 'All' && movie.download_permission !== selectedTier.toLowerCase()) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = movie.title.toLowerCase().includes(query);
        const matchesGenre = movie.genre.toLowerCase().includes(query);
        const matchesDirector = movie.director.toLowerCase().includes(query);
        const matchesCast = movie.cast.some((c) => c.toLowerCase().includes(query));
        if (!matchesTitle && !matchesGenre && !matchesDirector && !matchesCast) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'year') return b.release_year - a.release_year;
      if (sortBy === 'duration') return b.duration_minutes - a.duration_minutes;
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            <h1 className="text-2xl md:text-3xl font-bold font-display text-white tracking-tight">
              Sakanet Cinema Catalog
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Stream high-bitrate movies or download encrypted chunks for offline watching.
          </p>
        </div>

        {/* Search input in view */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, cast member, genre..."
            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Genre interactive segmented buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121216] border border-white/5 rounded-lg">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedGenre === g
                  ? 'bg-red-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Tier and Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#121216] border border-white/5 rounded-lg px-2.5 py-1 text-zinc-400">
            <span className="text-[11px] text-zinc-500">Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-900">All Tiers</option>
              <option value="free" className="bg-zinc-900">Free</option>
              <option value="premium" className="bg-zinc-900">Pro</option>
              <option value="vip" className="bg-zinc-900">VIP</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#121216] border border-white/5 rounded-lg px-2.5 py-1 text-zinc-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-zinc-900">Top Rated (5★ Metric)</option>
              <option value="year" className="bg-zinc-900">Newest Release</option>
              <option value="duration" className="bg-zinc-900">Runtime</option>
              <option value="title" className="bg-zinc-900">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of MovieCards */}
      {filteredMovies.length === 0 ? (
        <div className="bg-[#121216] border border-white/5 rounded-xl p-12 text-center space-y-2">
          <p className="text-zinc-300 font-medium text-sm">No titles match your active filters</p>
          <p className="text-xs text-zinc-500">
            Try adjusting your search query or selecting a different genre category.
          </p>
          <button
            onClick={() => {
              setSelectedGenre('All');
              setSelectedTier('All');
              onSearchChange('');
            }}
            className="mt-3 text-xs text-red-400 hover:text-red-300 underline font-medium"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pt-2">
          {filteredMovies.map((movie) => {
            const dl = downloads.find((d) => d.movie_id === movie.id);
            const inList = watchlist.includes(movie.id);

            return (
              <div key={movie.id} className="flex justify-center">
                <MovieCard
                  movie={movie}
                  onSelect={onSelectMovie}
                  onPlay={onPlayMovie}
                  onDownload={onDownloadMovie}
                  onToggleWatchlist={onToggleWatchlist}
                  isInWatchlist={inList}
                  downloadItem={dl}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
