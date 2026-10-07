import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Star,
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Clock,
  Film,
  Check,
  User,
  ArrowLeft,
  PlusCircle,
  Sparkles,
  Sliders,
  FileVideo,
  Maximize2,
} from 'lucide-react';
import { Movie, DownloadItem, UserProfile, WatchProgress, WatchHistoryItem, RecommendedMovie } from '../types';
import { recommendationEngine } from '../services/recommendationEngine';
import { RecommendationPreferencesModal } from './RecommendationPreferencesModal';
import { SakanetLogo } from './SakanetLogo';

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

const DEFAULT_GENRE_POSTERS: Record<string, string> = {
  Action: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  'Sci-Fi': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  Adventure: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Comedy: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
  Drama: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
  Thriller: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  Horror: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Animation: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
};

const DEFAULT_VJ_AVATAR = '';

export const BrowseCatalogView: React.FC<BrowseCatalogViewProps> = React.memo(({
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

  // Defer heavy rails rendering until tab transition finishes (guarantees silky smooth 60fps)
  const [isHeavyContentReady, setIsHeavyContentReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHeavyContentReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedVj, setSelectedVj] = useState<string>('All');
  const [showGenresDropdown, setShowGenresDropdown] = useState<boolean>(false);

  // Hero carousel index
  const [heroIndex, setHeroIndex] = useState<number>(0);

  // "See All" modals state: null | 'vj' | 'trending' | 'recent'
  const [seeAllModal, setSeeAllModal] = useState<null | 'vj' | 'trending' | 'recent'>(null);

  // User Firestore genre preferences & watch history
  const [genrePreferences, setGenrePreferences] = useState<string[]>(() => {
    return user?.genrePreferences || ['Action', 'Sci-Fi'];
  });
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    return user?.watchHistory || [];
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      recommendationEngine.fetchUserPreferencesAndHistory(user.id).then((data) => {
        if (data.genrePreferences?.length) setGenrePreferences(data.genrePreferences);
        if (data.watchHistory?.length) setWatchHistory(data.watchHistory);
      });

      const unsubscribe = recommendationEngine.subscribeToUserPreferences(user.id, (data) => {
        if (data.genrePreferences?.length) setGenrePreferences(data.genrePreferences);
        if (data.watchHistory?.length) setWatchHistory(data.watchHistory);
      });

      return () => unsubscribe();
    }
  }, [user?.id]);

  // 1. Strictly published movies uploaded by the admin (is_active === true)
  const publishedMovies = useMemo(() => {
    return movies.filter((m) => Boolean((m as any).is_active) && (m as any).is_active !== 'false' && (m as any).is_active !== '0');
  }, [movies]);

  // Personalized Recommendations based on Firestore watch history and genre preferences
  const recommendedList = useMemo(() => {
    return recommendationEngine.calculateRecommendations(
      publishedMovies,
      genrePreferences,
      watchHistory,
      watchlist
    );
  }, [publishedMovies, genrePreferences, watchHistory, watchlist]);

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
            className="focus:outline-none cursor-pointer group text-left"
          >
            <SakanetLogo size="md" />
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
            className="relative w-9 h-9 rounded-full ring-1.5 ring-[#E50914]/60 hover:ring-[#E50914] overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer focus:outline-none"
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
              <div className="w-full h-full bg-gradient-to-tr from-[#E50914] to-zinc-900 flex items-center justify-center text-xs font-bold text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          EMPTY STATE (Fallback when database return is empty)
         ======================================================== */}
      {publishedMovies.length === 0 ? (
        <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] rounded-2xl p-8 sm:p-14 text-center space-y-5 my-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-in fade-in relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] mx-auto shadow-xl">
            <Film className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Welcome to Sakanet Cinema
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              The theater catalog is ready. As soon as the administrator publishes titles with direct video stream URLs, movies, trending releases, and VJ translations will appear here instantly.
            </p>
          </div>
          <div className="pt-2">
            {isAdmin ? (
              <button
                onClick={() => onTabChange?.('admin')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-red-950/60 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Open Admin Portal &amp; Add Movie</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 bg-neutral-900/80 hover:bg-neutral-800 text-zinc-200 text-xs font-semibold px-5 py-2.5 rounded-xl border border-white/[0.08] transition-colors cursor-pointer"
              >
                <span>Sign In with Admin Account</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================
              SECTION 2: MASTER CINEMA SPOTLIGHT (Master File Preview Style)
             ======================================================== */}
          {currentHeroMovie && !isFilteringActive && (
            <section className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] hover:border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] mb-8 space-y-4 relative overflow-hidden transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.15] before:to-transparent">
              {/* Top Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-[#E50914] shadow-lg shrink-0">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E50914] text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        CINEMA SPOTLIGHT
                      </span>
                      <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5 rounded-full text-[11px] font-mono hidden sm:inline">
                        Range Streaming Active
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-bold font-display text-white truncate mt-1">
                      {currentHeroMovie.title}
                    </h2>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/[0.08] text-zinc-300 font-semibold">
                        {currentHeroMovie.file_size_mb || 750} MB
                      </span>
                      <span>·</span>
                      <span className="text-[#E50914] font-semibold">{currentHeroMovie.vj_name || 'VJ Junior'}</span>
                      <span>·</span>
                      <span>{currentHeroMovie.release_year}</span>
                      <span>·</span>
                      <span>{currentHeroMovie.genre}</span>
                      <span>·</span>
                      <span>{currentHeroMovie.duration_minutes || 120} min</span>
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons & Slide dots */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onPlayMovie(currentHeroMovie)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E50914] to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Watch Fullscreen</span>
                  </button>

                  <button
                    onClick={() => onSelectMovie(currentHeroMovie)}
                    className="flex items-center gap-1.5 bg-neutral-900/80 hover:bg-neutral-800 text-zinc-200 border border-white/[0.08] text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  {featuredMovies.length > 1 && (
                    <div className="flex items-center gap-1 bg-black/60 px-2 py-1.5 rounded-xl border border-white/[0.08] ml-1">
                      {featuredMovies.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHeroIndex(idx)}
                          className={`transition-all rounded-full cursor-pointer ${
                            idx === heroIndex
                              ? 'w-2.5 h-2.5 bg-[#E50914] shadow-[0_0_6px_#E50914]'
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

              {/* Contained Master Cinema Player Frame */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/[0.08] shadow-2xl">
                {currentHeroMovie.video_url || currentHeroMovie.file_url ? (
                  <video
                    key={currentHeroMovie.id}
                    src={currentHeroMovie.video_url || currentHeroMovie.file_url}
                    poster={currentHeroMovie.banner_url || currentHeroMovie.thumbnail_url || currentHeroMovie.poster_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={currentHeroMovie.banner_url || currentHeroMovie.thumbnail_url}
                    alt={currentHeroMovie.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Bottom Plot & Details Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                <p className="text-xs text-zinc-300 line-clamp-2 max-w-2xl font-normal leading-relaxed">
                  {currentHeroMovie.synopsis}
                </p>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-300 border border-white/[0.08]">
                    Audio: Luganda [VJ Translation]
                  </span>
                  <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-300 border border-white/[0.08]">
                    1080p FHD
                  </span>
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
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    selectedGenre === 'All' && selectedVj === 'All'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_4px_16px_rgba(229,9,20,0.4)] border border-red-500/40'
                      : 'bg-neutral-900/80 backdrop-blur-md text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-neutral-800/80'
                  }`}
                >
                  All
                </button>

                {availableGenres.length > 3 && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowGenresDropdown((prev) => !prev)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        selectedGenre !== 'All'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_4px_16px_rgba(229,9,20,0.4)] border border-red-500/40'
                          : 'bg-neutral-900/80 backdrop-blur-md text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-neutral-800/80'
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
                      <div className="absolute left-0 top-full mt-2 w-56 bg-gradient-to-b from-neutral-900/95 to-neutral-950/98 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider border-b border-white/[0.08]">
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
                                ? 'bg-red-500/20 text-red-400 font-bold'
                                : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span>All Genres</span>
                            {selectedGenre === 'All' && <Check className="w-3.5 h-3.5 text-red-500" />}
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
                                    ? 'bg-red-500/20 text-red-400 font-bold'
                                    : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                                }`}
                              >
                                <span>{genre}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
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
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_4px_16px_rgba(229,9,20,0.4)] border border-red-500/40'
                          : 'bg-neutral-900/80 backdrop-blur-md text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-neutral-800/80'
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
                className="w-full bg-gradient-to-b from-neutral-900/80 to-neutral-950/90 backdrop-blur-md border border-white/[0.08] rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all"
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
            <div className="flex items-center justify-between bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] rounded-2xl px-4 py-2.5 mb-6 text-xs shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400 font-medium">Filtering by:</span>
                {selectedVj !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    <span>VJ: {selectedVj}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedVj('All')}
                    />
                  </span>
                )}
                {selectedGenre !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    <span>Genre: {selectedGenre}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedGenre('All')}
                    />
                  </span>
                )}
                {searchTerm.trim() && (
                  <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-zinc-200 border border-white/[0.08] px-2.5 py-0.5 rounded-full">
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
                className="text-[#F20D28] hover:text-red-400 font-semibold cursor-pointer shrink-0 ml-2 transition-colors"
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
                <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] rounded-2xl p-10 text-center space-y-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                  <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-[#F20D28] mx-auto shadow-lg">
                    <Film className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">No Movies Found</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    No published movies matched your current search or filter query. Try selecting another VJ or resetting your filters.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Reset Filters</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredMovies.map((movie) => (
                    <MoviePosterCard
                      key={movie.id}
                      movie={movie}
                      onSelect={() => onSelectMovie(movie)}
                      onPlay={() => onPlayMovie(movie)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {!isHeavyContentReady ? (
                <div className="space-y-8 animate-in fade-in duration-150 py-2">
                  <div className="space-y-3">
                    <div className="h-5 w-44 bg-neutral-800/60 rounded-md animate-pulse" />
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-52 sm:w-60 aspect-[16/10] bg-neutral-900/80 border border-white/[0.08] rounded-2xl animate-pulse shrink-0" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-5 w-36 bg-neutral-800/60 rounded-md animate-pulse" />
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-52 sm:w-60 aspect-[16/10] bg-neutral-900/80 border border-white/[0.08] rounded-2xl animate-pulse shrink-0" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ========================================================
                      SECTION 4.5: RECOMMENDED FOR YOU (Firestore Watch History & Preferences)
                     ======================================================== */}
              {recommendedList.length > 0 && (
                <section className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 shadow-md">
                        <Sparkles className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                            Recommended for You
                          </h2>
                          <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full font-bold">
                            AI Personalized
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Tailored based on your watch history & genre preferences stored in Firestore
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowPreferencesModal(true)}
                      className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Sliders className="w-3.5 h-3.5 text-red-400" />
                      <span>Preferences ({genrePreferences.length})</span>
                    </button>
                  </div>

                  {/* Horizontal Recommended Movies Rail with Match Badges and Reasons */}
                  <HorizontalScrollRail>
                    {recommendedList.slice(0, 10).map(({ movie, matchPercentage, reason }) => (
                      <div key={movie.id} className="shrink-0 w-60 sm:w-68 flex flex-col justify-between group">
                        <div className="relative flex-1">
                          <MoviePosterCard
                            movie={movie}
                            onSelect={() => onSelectMovie(movie)}
                            onPlay={() => onPlayMovie(movie)}
                            matchPercentage={matchPercentage}
                          />
                        </div>

                        {/* Recommendation Reason Badge */}
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-xs text-zinc-300 font-medium truncate flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_#ef4444]" />
                          <span className="truncate">{reason.label}</span>
                        </div>
                      </div>
                    ))}
                  </HorizontalScrollRail>
                </section>
              )}

              {/* ========================================================
                  SECTION 5: BROWSE BY VJ (Strictly Real VJs from Uploaded Movies)
                 ======================================================== */}
              {vjProfiles.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                      Browse by VJ
                    </h2>
                    {vjProfiles.length > 3 && (
                      <button
                        onClick={() => setSeeAllModal('vj')}
                        className="text-xs text-[#F20D28] hover:text-red-400 font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal VJ Cards Rail */}
                  <HorizontalScrollRail>
                    {vjProfiles.map((vj) => (
                      <div
                        key={vj.name}
                        onClick={() => setSelectedVj(vj.name)}
                        className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] hover:border-red-500/50 focus-within:border-red-500/50 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shrink-0 min-w-[240px] sm:min-w-[270px] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] cursor-pointer group will-change-transform relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent"
                      >
                        {/* Circular Avatar with Glowing Red Ring */}
                        <div className="relative w-12 h-12 rounded-full ring-2 ring-[#F20D28] shadow-[0_0_12px_rgba(242,13,40,0.4)] overflow-hidden shrink-0 bg-neutral-950 flex items-center justify-center">
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
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                            />
                          )}
                        </div>

                        {/* VJ Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {vj.name}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{vj.genres}</p>
                          {vj.count > 0 && (
                            <div className="mt-1">
                              <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide text-zinc-400 border border-white/[0.06]">
                                {vj.count} {vj.count === 1 ? 'movie' : 'movies'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Navigation Arrow */}
                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </HorizontalScrollRail>
                </section>
              )}

              {/* ========================================================
                  SECTION 6: TRENDING MOVIES (Strictly Frequently Watched or Downloaded)
                 ======================================================== */}
              {trendingMovies.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                        Trending Movies
                      </h2>
                      <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-red-400 border border-red-500/30">
                        Most Watched
                      </span>
                    </div>
                    {trendingMovies.length > 4 && (
                      <button
                        onClick={() => setSeeAllModal('trending')}
                        className="text-xs text-[#F20D28] hover:text-red-400 font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Movie Rail */}
                  <HorizontalScrollRail>
                    {trendingMovies.slice(0, 10).map((movie) => (
                      <div key={movie.id} className="shrink-0 w-60 sm:w-68 flex flex-col justify-between">
                        <MoviePosterCard
                          movie={movie}
                          onSelect={() => onSelectMovie(movie)}
                          onPlay={() => onPlayMovie(movie)}
                        />
                      </div>
                    ))}
                  </HorizontalScrollRail>
                </section>
              )}

              {/* ========================================================
                  SECTION 7: RECENTLY ADDED (Ordered by upload date, newest first)
                 ======================================================== */}
              {recentlyAddedMovies.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                      Recently Added
                    </h2>
                    {recentlyAddedMovies.length > 4 && (
                      <button
                        onClick={() => setSeeAllModal('recent')}
                        className="text-xs text-[#F20D28] hover:text-red-400 font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <span>See All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Movie Rail */}
                  <HorizontalScrollRail>
                    {recentlyAddedMovies.slice(0, 10).map((movie) => (
                      <div key={movie.id} className="shrink-0 w-60 sm:w-68 flex flex-col justify-between">
                        <MoviePosterCard
                          movie={movie}
                          onSelect={() => onSelectMovie(movie)}
                          onPlay={() => onPlayMovie(movie)}
                        />
                      </div>
                    ))}
                  </HorizontalScrollRail>
                </section>
              )}

              {/* ========================================================
                  SECTION 8: CONTINUE WATCHING (If real watch progress exists)
                 ======================================================== */}
              {continueWatchingList.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F20D28]" />
                      <span>Continue Watching</span>
                    </h2>
                  </div>

                  <HorizontalScrollRail>
                    {continueWatchingList.map(({ movie, progress }) => (
                      <div
                        key={movie.id}
                        onClick={() => onPlayMovie(movie)}
                        className="shrink-0 w-60 sm:w-68 cursor-pointer group bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] hover:border-red-500/50 rounded-2xl p-4 sm:p-5 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] will-change-transform relative flex flex-col justify-between before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent"
                      >
                        <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] shadow-inner">
                          <img
                            src={movie.banner_url || movie.thumbnail_url}
                            alt={movie.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-neutral-950/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px]">
                            <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_24px_rgba(229,9,20,0.6)]">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                          {/* Progress Bar Track */}
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-900/80">
                            <div
                              className="h-full bg-[#E50914] shadow-[0_0_8px_#E50914]"
                              style={{ width: `${Math.min(100, progress.progressPercent || 20)}%` }}
                            />
                          </div>
                        </div>
                        <div className="pt-3 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <h4 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-red-400 transition-colors">
                              {movie.title}
                            </h4>
                            <span className="text-xs text-zinc-400">Resume movie</span>
                          </div>
                          <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-300 border border-white/10 shrink-0">
                            {progress.progressPercent || 20}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </HorizontalScrollRail>
                </section>
              )}
            </>
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
                    className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md border border-white/[0.08] hover:border-red-500/50 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] group relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent"
                  >
                    <div className="w-13 h-13 rounded-full ring-2 ring-[#F20D28] shadow-[0_0_12px_rgba(242,13,40,0.4)] overflow-hidden shrink-0 bg-neutral-950 flex items-center justify-center relative">
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
                        <div className="mt-1">
                          <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide text-zinc-400 border border-white/[0.06]">
                            {vj.count} {vj.count === 1 ? 'movie' : 'movies'} available
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(seeAllModal === 'trending' ? trendingMovies : recentlyAddedMovies).map(
                  (movie) => (
                    <MoviePosterCard
                      key={movie.id}
                      movie={movie}
                      onSelect={() => {
                        setSeeAllModal(null);
                        onSelectMovie(movie);
                      }}
                      onPlay={() => {
                        setSeeAllModal(null);
                        onPlayMovie(movie);
                      }}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Genre Preferences Firestore Modal */}
      <RecommendationPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        userId={user?.id || ''}
        currentPreferences={genrePreferences}
        onPreferencesUpdated={(newPrefs) => setGenrePreferences(newPrefs)}
      />
    </div>
  );
});

// ========================================================
// HORIZONTAL SCROLL RAIL (High-End Spatial Smooth Carousel)
// ========================================================
interface HorizontalScrollRailProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScrollRail: React.FC<HorizontalScrollRailProps> = ({ children, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = Math.max(280, scrollRef.current.clientWidth * 0.7);
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative group/rail">
      {/* Left Chevron Button (Desktop Hover) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-neutral-950/85 hover:bg-neutral-900 border border-white/[0.12] hover:border-red-500/50 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-md items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-0 group-hover/rail:opacity-100 focus:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        className={`flex items-stretch gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-3 pt-1 px-1 -mx-1 scroll-smooth ${className}`}
      >
        {children}
      </div>

      {/* Right Chevron Button (Desktop Hover) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-neutral-950/85 hover:bg-neutral-900 border border-white/[0.12] hover:border-red-500/50 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-md items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-0 group-hover/rail:opacity-100 focus:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
};

// ========================================================
// MOVIE POSTER CARD (Contained Cinema Master File Preview Style)
// ========================================================
interface MoviePosterCardProps {
  movie: Movie;
  onSelect: () => void;
  onPlay?: () => void;
  matchPercentage?: number;
}

const MoviePosterCard: React.FC<MoviePosterCardProps> = React.memo(({ movie, onSelect, onPlay, matchPercentage }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const posterSrc =
    movie.banner_url ||
    movie.thumbnail_url ||
    movie.poster_url ||
    DEFAULT_GENRE_POSTERS[movie.genre] ||
    DEFAULT_GENRE_POSTERS['Action'];

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] hover:border-red-500/50 focus-within:border-red-500/50 bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-4 sm:p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] cursor-pointer text-left select-none will-change-transform overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.15] before:to-transparent h-full"
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      {/* Contained Media Preview Frame (Fixed Aspect Ratio to Eliminate CLS) */}
      <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] shrink-0 shadow-inner">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-900/80 animate-pulse flex items-center justify-center">
            <Film className="w-6 h-6 text-neutral-600 animate-pulse" />
          </div>
        )}
        <img
          src={posterSrc}
          alt={movie.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ease-out ${
            imageLoaded ? 'opacity-100 scale-100 group-hover:scale-105' : 'opacity-0 scale-95'
          }`}
          style={{ willChange: 'transform, opacity' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent pointer-events-none" />

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={(e) => {
              if (onPlay) {
                e.stopPropagation();
                onPlay();
              }
            }}
            className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_24px_rgba(229,9,20,0.6)] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="Play Movie"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        </div>

        {/* Top Media Tags */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
          {matchPercentage !== undefined && (
            <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-red-400 border border-red-500/30 shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-500" />
              <span>{matchPercentage}% Match</span>
            </span>
          )}
          <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-200 border border-white/10 shadow-sm">
            1080p FHD
          </span>
        </div>

        {/* Bottom Size / Stream Pill */}
        <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
          <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-300 border border-white/10 shadow-sm">
            {movie.file_size_mb ? `${movie.file_size_mb} MB` : 'Stream'}
          </span>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="pt-3.5 space-y-2 text-left flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="text-[#E50914] font-bold tracking-tight truncate max-w-[130px]">
              {movie.vj_name || 'VJ Junior'}
            </span>
            <span className="text-zinc-400 font-mono text-[11px] font-semibold">{movie.release_year}</span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mt-1 min-h-[40px]">
            {movie.title}
          </h4>
        </div>

        {/* Action Row - Strictly Aligned Across Cards */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] mt-3">
          <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide text-zinc-300 border border-white/[0.08] truncate max-w-[100px]">
            {movie.genre || 'Action'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                if (onPlay) {
                  e.stopPropagation();
                  onPlay();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-red-950/40 hover:shadow-red-700/30 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BrowseCatalogView;
