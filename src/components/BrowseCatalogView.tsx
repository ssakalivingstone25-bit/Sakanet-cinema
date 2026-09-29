import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Star,
  Play,
  Info,
  ChevronRight,
  ChevronDown,
  X,
  Clock,
  Film,
  Check,
  User,
  ArrowLeft,
  PlusCircle,
} from 'lucide-react';
import { Movie, DownloadItem, UserProfile, WatchProgress } from '../types';

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
  continueWatchingList?: { movie: Movie; progress: WatchProgress }[];
  onTabChange?: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
}

const DEFAULT_VJ_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80';

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
  continueWatchingList = [],
  onTabChange,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com';

  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedVj, setSelectedVj] = useState<string>('All');
  const [showGenresDropdown, setShowGenresDropdown] = useState<boolean>(false);

  // Hero carousel index
  const [heroIndex, setHeroIndex] = useState<number>(0);

  // "See All" modals state: null | 'vj' | 'trending' | 'recent'
  const [seeAllModal, setSeeAllModal] = useState<null | 'vj' | 'trending' | 'recent'>(null);

  // 1. Strictly published movies uploaded by the admin (is_active === true)
  const publishedMovies = useMemo(() => {
    return movies.filter((m) => m.is_active !== false);
  }, [movies]);

  // 2. Featured movies for the hero banner carousel
  const featuredMovies = useMemo(() => {
    const featured = publishedMovies.filter((m) => m.is_featured);
    if (featured.length > 0) return featured;
    return publishedMovies.slice(0, 5);
  }, [publishedMovies]);

  // Auto-advance hero carousel every 7 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  const currentHeroMovie = featuredMovies[heroIndex] || publishedMovies[0] || null;

  // 3. Dynamic list of VJs strictly from movies uploaded and published by the admin
  const vjProfiles = useMemo(() => {
    const vjMap = new Map<
      string,
      { name: string; avatar: string; genres: Set<string>; count: number }
    >();

    publishedMovies.forEach((m) => {
      const name = (m.vj_name || m.director || '').trim();
      if (!name) return;
      const key = name.toLowerCase();

      if (!vjMap.has(key)) {
        vjMap.set(key, {
          name,
          avatar: m.vj_avatar_url || DEFAULT_VJ_AVATAR,
          genres: new Set<string>(),
          count: 0,
        });
      }

      const entry = vjMap.get(key)!;
      entry.count += 1;
      // If admin customized the VJ avatar on this movie, preserve it
      if (m.vj_avatar_url && m.vj_avatar_url.trim()) {
        entry.avatar = m.vj_avatar_url.trim();
      }
      if (m.genre && m.genre.trim()) {
        entry.genres.add(m.genre.trim());
      }
    });

    return Array.from(vjMap.values()).map((v) => {
      const genreArray = Array.from(v.genres);
      const genreString =
        genreArray.length > 0 ? genreArray.slice(0, 2).join(' • ') : 'Ugandan VJ Cinema';

      return {
        name: v.name,
        avatar: v.avatar,
        genres: genreString,
        count: v.count,
      };
    });
  }, [publishedMovies]);

  // 4. Dynamic genres available strictly from published movies uploaded by admin
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    publishedMovies.forEach((m) => {
      if (m.genre && m.genre.trim()) {
        genreSet.add(m.genre.trim());
      }
    });
    return Array.from(genreSet);
  }, [publishedMovies]);

  // 5. Trending Movies: ONLY movies that have actually been watched or downloaded frequently
  const trendingMovies = useMemo(() => {
    return publishedMovies
      .filter((m) => (m.view_count || 0) + (m.download_count || 0) > 0)
      .sort((a, b) => {
        const popA = (a.view_count || 0) + (a.download_count || 0);
        const popB = (b.view_count || 0) + (b.download_count || 0);
        return popB - popA;
      });
  }, [publishedMovies]);

  // 6. Recently Added: sorted strictly by actual creation/upload timestamp, newest first
  const recentlyAddedMovies = useMemo(() => {
    return [...publishedMovies].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [publishedMovies]);

  // 7. Active filtering check
  const isFilteringActive =
    selectedGenre !== 'All' || selectedVj !== 'All' || searchTerm.trim().length > 0;

  const filteredMovies = useMemo(() => {
    return publishedMovies.filter((movie) => {
      // VJ Filter
      if (selectedVj !== 'All') {
        const v = selectedVj.toLowerCase();
        const movieVj = (movie.vj_name || movie.director || '').toLowerCase();
        if (!movieVj.includes(v)) return false;
      }

      // Genre Filter
      if (selectedGenre !== 'All') {
        const g = selectedGenre.toLowerCase();
        const matchGenre = (movie.genre || '').toLowerCase() === g;
        if (!matchGenre) return false;
      }

      // Search Query Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = (movie.title || '').toLowerCase().includes(q);
        const matchGenre = (movie.genre || '').toLowerCase().includes(q);
        const matchVj = (movie.vj_name || movie.director || '').toLowerCase().includes(q);
        const matchCast = movie.cast?.some((c) => c.toLowerCase().includes(q));
        if (!matchTitle && !matchGenre && !matchVj && !matchCast) {
          return false;
        }
      }

      return true;
    });
  }, [publishedMovies, selectedGenre, selectedVj, searchTerm]);

  const resetFilters = () => {
    setSelectedGenre('All');
    setSelectedVj('All');
    onSearchChange('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-24 text-white font-sans select-none overflow-x-hidden">
      {/* ========================================================
          SECTION 1: TOP HEADER
          Left: SAKANET CINEMA logo
          Right: Search icon + circular user profile avatar with glowing ring
         ======================================================== */}
      <header className="flex items-center justify-between py-3 mb-3 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 focus:outline-none cursor-pointer group text-left"
          >
            <span className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#F20D28] group-hover:scale-105 transition-transform duration-200">
              SAKANET
            </span>
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-zinc-400 uppercase ml-1">
              CINEMA
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
            title="Search movies"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            onClick={onOpenAuth}
            className="relative w-9 h-9 rounded-full ring-2 ring-sky-500 overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer focus:outline-none"
            title={user?.name ? `${user.name} (Account)` : 'Sign in to Account'}
            aria-label="User Account"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          EMPTY STATE (Appears until administrator publishes movies)
         ======================================================== */}
      {publishedMovies.length === 0 ? (
        <div className="bg-[#121319] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-5 my-8 shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-[#F20D28]/40 flex items-center justify-center text-[#F20D28] mx-auto shadow-lg shadow-red-950/50">
            <Film className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black font-display text-white">
              Welcome to SAKANET CINEMA
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Movies will appear here as soon as they are published by the cinema team. Enjoy seamless HD streaming, VJ translated blockbusters, and fast downloads.
            </p>
          </div>
          {isAdmin ? (
            <div className="pt-2">
              <button
                onClick={() => onTabChange?.('admin')}
                className="inline-flex items-center gap-2 bg-[#F20D28] hover:bg-[#d60b23] text-white text-xs font-extrabold px-6 py-3 rounded-full shadow-lg shadow-red-700/40 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload Movie in Admin Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">
              Check back soon! New translated movies will appear here as soon as they are published.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================
              SECTION 2: FEATURED MOVIE HERO BANNER (Admin Published Movie)
             ======================================================== */}
          {currentHeroMovie && !isFilteringActive && (
            <section className="relative w-full rounded-2xl overflow-hidden bg-[#121319] border border-white/10 shadow-2xl mb-6 group">
              <div className="relative w-full aspect-[16/10] sm:aspect-[21/10] overflow-hidden">
                <img
                  src={currentHeroMovie.banner_url || currentHeroMovie.thumbnail_url}
                  alt={currentHeroMovie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-[#08090D]/65 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#08090D] via-[#08090D]/50 to-transparent w-full sm:w-3/4" />

                <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-end">
                  <div className="flex flex-col mb-2">
                    <span className="text-white text-xl sm:text-2xl font-black font-display tracking-wider uppercase leading-none drop-shadow-md">
                      FEATURED
                    </span>
                    <span className="text-[#F20D28] text-2xl sm:text-3xl font-black italic tracking-wide -mt-1 font-display drop-shadow-[0_2px_8px_rgba(242,13,40,0.6)]">
                      TONIGHT
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-1.5">
                    <span className="text-white font-extrabold">{currentHeroMovie.title}</span>
                    <span>•</span>
                    <span className="text-[#F20D28]">{currentHeroMovie.genre}</span>
                    {currentHeroMovie.vj_name && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-300 font-semibold">{currentHeroMovie.vj_name}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 max-w-md font-normal leading-relaxed drop-shadow mb-4">
                    {currentHeroMovie.synopsis}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => onPlayMovie(currentHeroMovie)}
                        className="flex items-center gap-2 bg-[#F20D28] hover:bg-[#d60b23] text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-full shadow-lg shadow-red-700/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>WATCH NOW</span>
                      </button>

                      <button
                        onClick={() => onSelectMovie(currentHeroMovie)}
                        className="flex items-center gap-1.5 bg-black/60 hover:bg-black/85 text-white border border-white/20 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-zinc-300" />
                        <span>Details</span>
                      </button>
                    </div>

                    {featuredMovies.length > 1 && (
                      <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                        {featuredMovies.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setHeroIndex(idx)}
                            className={`transition-all rounded-full cursor-pointer ${
                              idx === heroIndex
                                ? 'w-2.5 h-2.5 bg-[#F20D28] shadow-[0_0_6px_#F20D28]'
                                : 'w-1.5 h-1.5 bg-zinc-600 hover:bg-zinc-400'
                            }`}
                            title={`Slide ${idx + 1}`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================
              SECTION 3: GENRE FILTERS (Strictly Real Genres From Uploaded Movies)
             ======================================================== */}
          {availableGenres.length > 0 && (
            <section className="mb-4 relative">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => {
                    setSelectedGenre('All');
                    setSelectedVj('All');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGenre === 'All' && selectedVj === 'All'
                      ? 'bg-[#F20D28] text-white shadow-md shadow-red-700/40'
                      : 'bg-[#121319] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  All
                </button>

                {availableGenres.length > 3 && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowGenresDropdown((prev) => !prev)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedGenre !== 'All'
                          ? 'bg-[#F20D28] text-white shadow-md shadow-red-700/40'
                          : 'bg-[#121319] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{selectedGenre !== 'All' ? selectedGenre : 'Genres'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          showGenresDropdown ? 'rotate-180 text-white' : 'text-zinc-400'
                        }`}
                      />
                    </button>

                    {showGenresDropdown && (
                      <div className="absolute left-0 top-full mt-2 w-56 bg-[#121319] border border-white/15 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider border-b border-white/10">
                          Select Genre
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1">
                          <button
                            onClick={() => {
                              setSelectedGenre('All');
                              setShowGenresDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                              selectedGenre === 'All'
                                ? 'bg-[#F20D28]/20 text-[#F20D28] font-bold'
                                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>All Genres</span>
                            {selectedGenre === 'All' && <Check className="w-3.5 h-3.5 text-[#F20D28]" />}
                          </button>

                          {availableGenres.map((genre) => {
                            const isSelected = selectedGenre === genre;
                            return (
                              <button
                                key={genre}
                                onClick={() => {
                                  setSelectedGenre(genre);
                                  setShowGenresDropdown(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-[#F20D28]/20 text-[#F20D28] font-bold'
                                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span>{genre}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#F20D28]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Genre Pills */}
                {availableGenres.map((genre) => {
                  const isActive = selectedGenre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#F20D28] text-white shadow-md shadow-red-700/40 border-transparent'
                          : 'bg-[#121319] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ========================================================
              SECTION 4: SEARCH BAR
             ======================================================== */}
          <section className="relative w-full mb-6">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, VJs, genres..."
                className="w-full bg-[#121319] border border-white/10 rounded-full pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F20D28] focus:ring-1 focus:ring-[#F20D28] transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3.5 p-1 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          {/* Active Filter Pill Summary */}
          {isFilteringActive && (
            <div className="flex items-center justify-between bg-[#121319] border border-white/10 rounded-xl px-4 py-2.5 mb-6 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400 font-medium">Filtering by:</span>
                {selectedVj !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-[#F20D28]/20 text-[#F20D28] border border-[#F20D28]/40 px-2.5 py-0.5 rounded-full font-bold">
                    <span>VJ: {selectedVj}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedVj('All')}
                    />
                  </span>
                )}
                {selectedGenre !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-[#F20D28]/20 text-[#F20D28] border border-[#F20D28]/40 px-2.5 py-0.5 rounded-full font-bold">
                    <span>Genre: {selectedGenre}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedGenre('All')}
                    />
                  </span>
                )}
                {searchTerm.trim() && (
                  <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-200 border border-white/15 px-2.5 py-0.5 rounded-full">
                    <span>"{searchTerm}"</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:opacity-80"
                      onClick={() => onSearchChange('')}
                    />
                  </span>
                )}
              </div>
              <button
                onClick={resetFilters}
                className="text-[#F20D28] hover:underline font-semibold cursor-pointer shrink-0 ml-2"
              >
                Reset All
              </button>
            </div>
          )}

          {/* ========================================================
              MATCHING RESULTS (When Search or Filter is active)
             ======================================================== */}
          {isFilteringActive ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#F20D28] rounded-full inline-block" />
                  <span>Matching Movies</span>
                </h2>
                <span className="text-xs text-zinc-400 font-mono">
                  {filteredMovies.length} {filteredMovies.length === 1 ? 'title' : 'titles'}
                </span>
              </div>

              {filteredMovies.length === 0 ? (
                <div className="bg-[#121319] border border-white/10 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center text-[#F20D28] mx-auto">
                    <Film className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">No Movies Found</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    No published movies matched your current search or filter query. Try selecting another VJ or resetting your filters.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-2 inline-flex items-center gap-1.5 bg-[#F20D28] hover:bg-[#d60b23] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>Reset Filters</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                  {filteredMovies.map((movie) => (
                    <MoviePosterCard
                      key={movie.id}
                      movie={movie}
                      onSelect={() => onSelectMovie(movie)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* ========================================================
                  SECTION 5: BROWSE BY VJ (Strictly Real VJs from Uploaded Movies)
                 ======================================================== */}
              {vjProfiles.length > 0 && (
                <section className="mb-7">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                      Browse by VJ
                    </h2>
                    {vjProfiles.length > 3 && (
                      <button
                        onClick={() => setSeeAllModal('vj')}
                        className="text-xs text-[#F20D28] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal VJ Cards Rail */}
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    {vjProfiles.map((vj) => (
                      <div
                        key={vj.name}
                        onClick={() => setSelectedVj(vj.name)}
                        className="bg-[#121319] hover:bg-[#181922] border border-white/10 hover:border-[#F20D28]/60 rounded-xl p-3 flex items-center gap-3 shrink-0 min-w-[210px] sm:min-w-[230px] transition-all duration-200 cursor-pointer shadow-md group"
                      >
                        {/* Circular Avatar with Glowing Red Ring */}
                        <div className="relative w-12 h-12 rounded-full ring-2 ring-[#F20D28] overflow-hidden shrink-0 bg-zinc-900 shadow-md flex items-center justify-center">
                          <span className="text-[11px] font-black text-zinc-300 absolute">
                            {vj.name.replace(/^VJ\s+/i, '').substring(0, 2).toUpperCase()}
                          </span>
                          {vj.avatar && (
                            <img
                              src={vj.avatar}
                              alt={vj.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                            />
                          )}
                        </div>

                        {/* VJ Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {vj.name}
                          </h3>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{vj.genres}</p>
                        </div>

                        {/* Right Navigation Arrow */}
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 6: TRENDING MOVIES (Strictly Frequently Watched or Downloaded)
                 ======================================================== */}
              {trendingMovies.length > 0 && (
                <section className="mb-7">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                        Trending Movies
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 font-semibold border border-red-800/40">
                        Most Watched
                      </span>
                    </div>
                    {trendingMovies.length > 4 && (
                      <button
                        onClick={() => setSeeAllModal('trending')}
                        className="text-xs text-[#F20D28] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Movie Rail */}
                  <div className="flex items-start gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                    {trendingMovies.slice(0, 10).map((movie) => (
                      <div key={movie.id} className="shrink-0 w-36 sm:w-44">
                        <MoviePosterCard movie={movie} onSelect={() => onSelectMovie(movie)} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 7: RECENTLY ADDED (Ordered by upload date, newest first)
                 ======================================================== */}
              {recentlyAddedMovies.length > 0 && (
                <section className="mb-7">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                      Recently Added
                    </h2>
                    {recentlyAddedMovies.length > 4 && (
                      <button
                        onClick={() => setSeeAllModal('recent')}
                        className="text-xs text-[#F20D28] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Movie Rail */}
                  <div className="flex items-start gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                    {recentlyAddedMovies.slice(0, 10).map((movie) => (
                      <div key={movie.id} className="shrink-0 w-36 sm:w-44">
                        <MoviePosterCard movie={movie} onSelect={() => onSelectMovie(movie)} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 8: CONTINUE WATCHING (If real watch progress exists)
                 ======================================================== */}
              {continueWatchingList.length > 0 && (
                <section className="mb-7">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F20D28]" />
                      <span>Continue Watching</span>
                    </h2>
                  </div>

                  <div className="flex items-start gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                    {continueWatchingList.map(({ movie, progress }) => (
                      <div
                        key={movie.id}
                        onClick={() => onPlayMovie(movie)}
                        className="shrink-0 w-44 sm:w-52 cursor-pointer group bg-[#121319] border border-white/10 hover:border-[#F20D28]/60 rounded-xl overflow-hidden transition-all shadow-md"
                      >
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                          <img
                            src={movie.banner_url || movie.thumbnail_url}
                            alt={movie.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-[#F20D28] text-white flex items-center justify-center shadow-lg">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                            <div
                              className="h-full bg-[#F20D28]"
                              style={{ width: `${Math.min(100, progress.progressPercent || 20)}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-2.5">
                          <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                          <span className="text-[10px] text-zinc-400">Resume movie</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* ========================================================
          FULL VIEW MODAL ("See All" for VJs, Trending, or Recent)
         ======================================================== */}
      {seeAllModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSeeAllModal(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg sm:text-xl font-bold font-display text-white">
                  {seeAllModal === 'vj'
                    ? 'All Video Jockeys (VJs)'
                    : seeAllModal === 'trending'
                    ? 'All Trending Movies'
                    : 'All Recently Added Movies'}
                </h3>
              </div>
              <button
                onClick={() => setSeeAllModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {seeAllModal === 'vj' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {vjProfiles.map((vj) => (
                  <div
                    key={vj.name}
                    onClick={() => {
                      setSelectedVj(vj.name);
                      setSeeAllModal(null);
                    }}
                    className="bg-[#121319] hover:bg-[#181922] border border-white/10 hover:border-[#F20D28]/60 rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all shadow-md group"
                  >
                    <div className="w-13 h-13 rounded-full ring-2 ring-[#F20D28] overflow-hidden shrink-0 bg-zinc-900 shadow flex items-center justify-center relative">
                      <span className="text-xs font-black text-zinc-300 absolute">
                        {vj.name.replace(/^VJ\s+/i, '').substring(0, 2).toUpperCase()}
                      </span>
                      {vj.avatar && (
                        <img
                          src={vj.avatar}
                          alt={vj.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform relative z-10"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                        {vj.name}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{vj.genres}</p>
                      {vj.count > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          {vj.count} {vj.count === 1 ? 'movie' : 'movies'} available
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                {(seeAllModal === 'trending' ? trendingMovies : recentlyAddedMovies).map(
                  (movie) => (
                    <MoviePosterCard
                      key={movie.id}
                      movie={movie}
                      onSelect={() => {
                        setSeeAllModal(null);
                        onSelectMovie(movie);
                      }}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================
// MOVIE POSTER CARD (Matches reference image portrait 2:3 style)
// ========================================================
interface MoviePosterCardProps {
  movie: Movie;
  onSelect: () => void;
}

const MoviePosterCard: React.FC<MoviePosterCardProps> = ({ movie, onSelect }) => {
  return (
    <div onClick={onSelect} className="group flex flex-col cursor-pointer select-none">
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#121319] border border-white/10 group-hover:border-[#F20D28]/60 shadow-lg group-hover:scale-[1.02] transition-all duration-300">
        <img
          src={movie.thumbnail_url}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

        {/* Movie Title Banner on Poster Bottom */}
        <div className="absolute bottom-2.5 left-2 right-2 text-center">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight block">
            {movie.title}
          </span>
        </div>

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-amber-400 font-bold border border-white/10">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{movie.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="mt-2 text-left">
        <h4 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight group-hover:text-[#F20D28] transition-colors">
          {movie.title}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium mt-0.5">
          <span>{movie.release_year}</span>
          {movie.vj_name && (
            <span className="text-red-400/90 font-semibold truncate max-w-[90px]">
              {movie.vj_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseCatalogView;
