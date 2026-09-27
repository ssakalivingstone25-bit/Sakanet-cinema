import React, { useState } from 'react';
import {
  Search,
  Star,
  Play,
  Plus,
  Check,
  ChevronRight,
  Crosshair,
  Heart,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Movie, DownloadItem, UserProfile } from '../types';

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
  user?: UserProfile;
  onOpenAuth?: () => void;
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
  user,
  onOpenAuth,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Filter movies (only active live feed movies)
  const liveMovies = movies.filter((m) => m.is_active);

  // Dynamically compute populated genres from uploaded live movies
  const availableGenres = Array.from(
    new Set(
      liveMovies.flatMap((m) => [m.genre, m.secondary_genre].filter(Boolean) as string[])
    )
  ).filter((g) => g.trim().length > 0);

  // Genre pills list: "All" plus any genres that actually have movies uploaded
  const genreList = ['All', ...availableGenres];

  // Dynamically detect which categories have movies
  const actionMovies = liveMovies.filter(
    (m) =>
      m.genre.toLowerCase().includes('action') ||
      m.secondary_genre?.toLowerCase().includes('action') ||
      m.genre.toLowerCase().includes('adventure') ||
      m.secondary_genre?.toLowerCase().includes('adventure')
  );

  const romanceOrDramaMovies = liveMovies.filter(
    (m) =>
      m.genre.toLowerCase().includes('romance') ||
      m.secondary_genre?.toLowerCase().includes('romance') ||
      m.genre.toLowerCase().includes('drama') ||
      m.secondary_genre?.toLowerCase().includes('drama')
  );

  // Group other dynamic genres that have movies uploaded
  const dynamicCategories = availableGenres
    .filter(
      (g) =>
        !['action', 'adventure', 'drama', 'romance'].some((keyword) =>
          g.toLowerCase().includes(keyword)
        )
    )
    .map((g) => ({
      genre: g,
      movies: liveMovies.filter(
        (m) =>
          m.genre.toLowerCase() === g.toLowerCase() ||
          m.secondary_genre?.toLowerCase().includes(g.toLowerCase())
      ),
    }))
    .filter((cat) => cat.movies.length > 0);

  // Identify featured movie for the hero card (only if movies exist)
  const heroMovie = liveMovies.find((m) => m.is_featured) || liveMovies[0] || null;

  // Identify "Trending this week" list (only from uploaded movies)
  const trendingMovies = liveMovies.filter((m) => m.id !== heroMovie?.id);

  // Filtered list when searching or filtering by genre
  const isFiltering = selectedGenre !== 'All' || searchTerm.trim().length > 0;
  const filteredList = liveMovies.filter((movie) => {
    if (selectedGenre !== 'All') {
      const g = selectedGenre.toLowerCase();
      const matchPrimary = movie.genre.toLowerCase() === g;
      const matchSecondary = movie.secondary_genre?.toLowerCase().includes(g);
      if (!matchPrimary && !matchSecondary) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = movie.title.toLowerCase().includes(q);
      const matchGenre = movie.genre.toLowerCase().includes(q);
      const matchCast = movie.cast?.some((c) => c.toLowerCase().includes(q));
      if (!matchTitle && !matchGenre && !matchCast) return false;
    }
    return true;
  });

  const isHeroInWatchlist = heroMovie ? watchlist.includes(heroMovie.id) : false;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-24 text-white font-sans select-none">
      {/* 1. Header: SAKANET CINEMA Wordmark + User Avatar */}
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col">
          <span className="text-red-600 font-display font-black text-2xl tracking-tighter leading-none">
            SAKANET
          </span>
          <span className="text-[10px] font-sans font-bold tracking-[0.25em] text-zinc-400 uppercase mt-0.5">
            CINEMA
          </span>
        </div>

        {/* Profile Avatar */}
        <button
          onClick={onOpenAuth}
          className="relative w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden hover:border-red-500 transition-all cursor-pointer focus:outline-none"
          title={user?.name || 'Account profile'}
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
          )}
        </button>
      </div>

      {/* 2. Page Title & Subtitle */}
      <div className="mt-3 mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Discover</h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">Find your next favourite film</p>
      </div>

      {/* 3. Search Bar */}
      <div className="relative w-full mb-4">
        <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search movies, actors, genres"
          className="w-full bg-[#16161a] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4. Horizontal Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        {genreList.map((genre) => {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-[#18181d] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* If strictly no movies have been uploaded and published by the admin yet */}
      {liveMovies.length === 0 ? (
        <div className="bg-[#121216] border border-white/10 rounded-2xl p-10 text-center space-y-4 my-8 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-500 mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Movies Uploaded Yet</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 leading-relaxed">
              All un-uploaded content has been removed as requested. Only movie video files uploaded and published by the administrator will appear in this catalog.
            </p>
          </div>
        </div>
      ) : isFiltering ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-red-600 rounded-full inline-block" />
              <span>Results for "{selectedGenre !== 'All' ? selectedGenre : searchTerm}"</span>
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {filteredList.length} {filteredList.length === 1 ? 'title' : 'titles'}
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="bg-[#121216] border border-white/10 rounded-xl p-10 text-center space-y-2">
              <p className="text-zinc-300 font-semibold text-sm">No titles found</p>
              <p className="text-xs text-zinc-500">
                Try searching for something else or choosing a different genre filter.
              </p>
              <button
                onClick={() => {
                  setSelectedGenre('All');
                  onSearchChange('');
                }}
                className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredList.map((movie) => {
                const inList = watchlist.includes(movie.id);
                return (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie(movie)}
                    className="group relative bg-[#141418] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-white/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                      <img
                        src={movie.thumbnail_url}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                          {movie.genre}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-tight truncate">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{movie.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 5. Featured Hero Card: THE LAST FRONTIER */}
          {heroMovie && (
            <div className="relative w-full rounded-2xl overflow-hidden bg-[#131317] border border-white/10 shadow-2xl mb-7 group">
              <div className="relative w-full aspect-[16/9] sm:aspect-[21/10] overflow-hidden">
                <img
                  src={heroMovie.banner_url || heroMovie.thumbnail_url}
                  alt={heroMovie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                {/* Dark Vignettes & Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d10] via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d10]/90 via-transparent to-transparent" />

                {/* Content Overlay */}
                <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
                  <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white uppercase leading-none drop-shadow-lg">
                    {heroMovie.title}
                  </h2>

                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium mt-2">
                    <span>{heroMovie.release_year}</span>
                    <span>•</span>
                    <span>{heroMovie.genre}</span>
                    <span>•</span>
                    <span>
                      {Math.floor(heroMovie.duration_minutes / 60)}h{' '}
                      {heroMovie.duration_minutes % 60 < 10
                        ? `0${heroMovie.duration_minutes % 60}`
                        : heroMovie.duration_minutes % 60}
                      m
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{heroMovie.rating.toFixed(1)}</span>
                  </div>

                  {/* Actions: Watch Now + My List */}
                  <div className="flex items-center gap-2.5 mt-3.5">
                    <button
                      onClick={() => onPlayMovie(heroMovie)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-red-600/40 transition-all hover:scale-105 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch now</span>
                    </button>

                    <button
                      onClick={() => onToggleWatchlist(heroMovie.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                        isHeroInWatchlist
                          ? 'bg-white/20 border-white/40 text-white'
                          : 'bg-black/60 hover:bg-black/80 border-white/20 text-white'
                      }`}
                    >
                      {isHeroInWatchlist ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>In My List</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>My List</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Trending this week Section - Only shown if there are multiple uploaded movies */}
          {trendingMovies.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Trending this week
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedGenre('All')}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>See all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Horizontal 3-Card Rail matching Screenshot */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {trendingMovies.slice(0, 3).map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie(movie)}
                    className="group flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-lg group-hover:border-white/30 transition-all group-hover:scale-[1.02]">
                      <img
                        src={movie.thumbnail_url}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      {/* Movie Title Banner printed on the poster bottom just like the screenshot */}
                      <div className="absolute bottom-2.5 left-2 right-2 text-center">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white font-display drop-shadow leading-tight block">
                          {movie.title}
                        </span>
                      </div>
                    </div>

                    {/* Clean text label below card */}
                    <span className="text-xs font-semibold text-zinc-300 truncate mt-2 group-hover:text-white transition-colors">
                      {movie.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Browse by category Section - Strictly ONLY shown if movies exist for these genres */}
          {(actionMovies.length > 0 || romanceOrDramaMovies.length > 0 || dynamicCategories.length > 0) && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Browse by category
                </h3>
              </div>

              {/* Landscape Category Banners for populated genres only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category: Action & Adventure (ONLY if action movies were posted) */}
                {actionMovies.length > 0 && (
                  <div
                    onClick={() => setSelectedGenre('Action')}
                    className="relative rounded-xl overflow-hidden border border-white/10 bg-[#16161b] aspect-[16/9] sm:aspect-[2/1] cursor-pointer group hover:border-white/30 transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={actionMovies[0]?.banner_url || actionMovies[0]?.thumbnail_url}
                      alt="Action & Adventure"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    <div className="absolute inset-0 p-4 flex items-end justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white shrink-0">
                          <Crosshair className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white leading-tight block">
                            Action &amp; Adventure
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {actionMovies.length} title{actionMovies.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                )}

                {/* Category: Drama & Romance (ONLY if drama/romance movies were posted) */}
                {romanceOrDramaMovies.length > 0 && (
                  <div
                    onClick={() => setSelectedGenre('Drama')}
                    className="relative rounded-xl overflow-hidden border border-white/10 bg-[#16161b] aspect-[16/9] sm:aspect-[2/1] cursor-pointer group hover:border-white/30 transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={romanceOrDramaMovies[0]?.banner_url || romanceOrDramaMovies[0]?.thumbnail_url}
                      alt="Drama & Romance"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    <div className="absolute inset-0 p-4 flex items-end justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white shrink-0">
                          <Heart className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white leading-tight block">
                            Drama &amp; Romance
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {romanceOrDramaMovies.length} title{romanceOrDramaMovies.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                )}

                {/* Dynamic categories for any other genres uploaded by admin */}
                {dynamicCategories.map((cat) => (
                  <div
                    key={cat.genre}
                    onClick={() => setSelectedGenre(cat.genre)}
                    className="relative rounded-xl overflow-hidden border border-white/10 bg-[#16161b] aspect-[16/9] sm:aspect-[2/1] cursor-pointer group hover:border-white/30 transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={cat.movies[0]?.banner_url || cat.movies[0]?.thumbnail_url}
                      alt={cat.genre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    <div className="absolute inset-0 p-4 flex items-end justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white shrink-0">
                          <Sparkles className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white leading-tight block">
                            {cat.genre}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {cat.movies.length} title{cat.movies.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowseCatalogView;
