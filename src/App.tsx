import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie, DownloadItem, UserProfile, WatchProgress } from './types';
import { storageService, guestUser } from './services/storageService';
import { downloadEngine } from './services/downloadEngine';
import { recommendationEngine } from './services/recommendationEngine';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { MovieRail } from './components/MovieRail';
import { ContinueWatchingRail } from './components/ContinueWatchingRail';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { MiniPlayer } from './components/MiniPlayer';
import { OfflineDownloadsView } from './components/OfflineDownloadsView';
import { AdminPortalView } from './components/AdminPortalView';
import { BrowseCatalogView } from './components/BrowseCatalogView';
import { SettingsView } from './components/SettingsView';
import { AndroidAppFrame } from './components/AndroidAppFrame';
import { BottomNavBar } from './components/BottomNavBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { AuthGateScreen } from './components/AuthGateScreen';
import {
  onAuthChange,
  syncUserProfileFromFirebaseUser,
  checkRedirectResult,
  subscribeToFirestoreMovies,
  saveMovieToFirestore,
} from './services/firebase';
import { apiService } from './services/apiService';
import {
  Tv,
  Smartphone,
  Wifi,
  WifiOff,
  Film,
  PlusCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

/**
 * Resilient helper to merge movie catalogs across SQLite, LocalStorage and Cloud Firestore
 * Prevents cloud sync or local refresh from destroying or overwriting movie items.
 */
function mergeMovieList(base: Movie[], incoming: Movie[]): Movie[] {
  const map = new Map<string, Movie>();
  (base || []).forEach((m) => {
    if (m && m.id) map.set(m.id, m);
  });
  (incoming || []).forEach((m) => {
    if (!m || !m.id) return;
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, m);
    } else {
      map.set(m.id, {
        ...prev,
        ...m,
        video_url: m.video_url || prev.video_url,
        file_url: m.file_url || m.video_url || prev.file_url,
        videoUrl: m.videoUrl || m.video_url || prev.videoUrl,
        poster_url: m.poster_url || prev.poster_url,
        banner_url: m.banner_url || prev.banner_url,
        thumbnail_url: m.thumbnail_url || prev.thumbnail_url,
        is_active: m.is_active !== undefined ? m.is_active : prev.is_active,
      });
    }
  });
  return Array.from(map.values());
}

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [user, setUser] = useState<UserProfile>(storageService.getUser());
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(storageService.isOfflineMode());
  const [activeTab, setActiveTab] = useState<'settings' | 'browse' | 'downloads' | 'admin'>('browse');
  const [isAndroidView, setIsAndroidView] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Video playback states
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);
  const [isOfflinePlayback, setIsOfflinePlayback] = useState<boolean>(false);

  // Picture-in-Picture MiniPlayer state
  const [miniPlayer, setMiniPlayer] = useState<{
    movie: Movie;
    currentTime: number;
    isPlaying: boolean;
  } | null>(null);

  // Continue Watching state
  const [continueWatchingList, setContinueWatchingList] = useState<
    { movie: Movie; progress: WatchProgress }[]
  >([]);

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Initial load & subscription to download engine, SQLite backend, and Firebase Auth
  useEffect(() => {
    // 1. Apply stored theme preference to HTML root
    try {
      const savedTheme = localStorage.getItem('sakanet_theme') || 'dark';
      const root = document.documentElement;
      root.classList.remove('dark', 'light', 'oled');
      if (savedTheme === 'system') {
        const isSysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isSysDark ? 'dark' : 'light');
        root.style.colorScheme = isSysDark ? 'dark' : 'light';
      } else {
        root.classList.add(savedTheme);
        root.style.colorScheme = savedTheme === 'light' ? 'light' : 'dark';
      }
      if (localStorage.getItem('sakanet_high_contrast') === 'true') {
        root.classList.add('high-contrast');
      }
    } catch {}

    refreshCatalog();

    // Check if returning from a Google OAuth redirect
    checkRedirectResult().then((redirectProfile) => {
      if (redirectProfile) {
        storageService.saveUser(redirectProfile);
        setUser(redirectProfile);
        setShowAuthModal(false);
        setIsAuthChecking(false);
      }
    });

    const unsubscribeDownloads = downloadEngine.subscribe((updatedDownloads) => {
      setDownloads([...updatedDownloads]);
      setUser(storageService.getUser());
    });

    const unsubscribeAuth = onAuthChange(async (fbUser) => {
      if (fbUser) {
        try {
          const synced = await syncUserProfileFromFirebaseUser(fbUser);
          storageService.saveUser(synced);
          setUser(synced);
          setShowAuthModal(false);
        } catch (err) {
          console.warn('Error syncing Firebase user profile:', err);
        }
      } else {
        storageService.clearUser();
        setUser(guestUser);
      }
      setIsAuthChecking(false);
    });

    const unsubscribeFirestore = subscribeToFirestoreMovies((cloudMovies) => {
      if (cloudMovies && Array.isArray(cloudMovies) && cloudMovies.length > 0) {
        setMovies((prev) => {
          const merged = mergeMovieList(prev, cloudMovies);
          storageService.saveMovies(merged);
          return merged;
        });
      }
    });

    return () => {
      unsubscribeDownloads();
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const refreshCatalog = useCallback(async () => {
    // 1. Instant local render
    const allMovies = storageService.getMovies();
    setMovies((prev) => mergeMovieList(prev, allMovies));
    setUser(storageService.getUser());
    refreshWatchProgress();

    // 2. Fetch persistent SQLite database from server and merge
    try {
      const serverMovies = await apiService.getMovies();
      if (Array.isArray(serverMovies) && serverMovies.length > 0) {
        setMovies((prev) => {
          const merged = mergeMovieList(prev, serverMovies);
          storageService.saveMovies(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Server movies sync notice:', err);
    }

    // 3. Keep Firestore synchronized with all active movies
    try {
      const current = storageService.getMovies();
      current.forEach((m) => {
        if (m && m.is_active) {
          saveMovieToFirestore(m).catch(() => {});
        }
      });
    } catch {}

    // If an open movie was deleted, close players/modals
    const currentList = storageService.getMovies();
    setSelectedMovie((prev) => (prev && !currentList.some((m) => m.id === prev.id) ? null : prev));
    setPlayingMovie((prev) => (prev && !currentList.some((m) => m.id === prev.id) ? null : prev));
    setMiniPlayer((prev) => (prev && !currentList.some((m) => m.id === prev.movie.id) ? null : prev));
  }, []);

  const refreshWatchProgress = useCallback(() => {
    const list = storageService.getContinueWatchingList();
    setContinueWatchingList(list);
  }, []);

  const handleToggleOfflineMode = useCallback((offline: boolean) => {
    storageService.setOfflineMode(offline);
    setIsOfflineMode(offline);
  }, []);

  const handleToggleWatchlist = useCallback((movieId: string) => {
    storageService.toggleWatchlist(movieId);
    setUser(storageService.getUser());
  }, []);

  // Launch video player (with optional resume timestamp)
  const handlePlayMovie = useCallback((movie: Movie, startTime: number = 0, offline: boolean = false) => {
    // If mini player was playing, close it
    setMiniPlayer(null);
    storageService.incrementViewCount(movie.id);
    setPlaybackStartTime(startTime);
    setIsOfflinePlayback(offline);
    setPlayingMovie(movie);
    refreshCatalog();

    // Record in Firestore watch history for recommendation engine
    recommendationEngine.recordWatchHistory(
      user.id,
      movie,
      startTime,
      (movie.duration_minutes || 120) * 60
    );
  }, [user.id, refreshCatalog]);

  const handleDownloadMovie = useCallback((movie: Movie) => {
    storageService.incrementDownloadCount(movie.id);
    downloadEngine.triggerDownload(movie);
    refreshCatalog();
  }, [refreshCatalog]);

  // Enter Picture-in-Picture mode
  const handleEnterMiniPlayer = useCallback((movie: Movie, currentTime: number, isPlaying: boolean) => {
    setPlayingMovie(null);
    setMiniPlayer({ movie, currentTime, isPlaying });
    refreshWatchProgress();
  }, [refreshWatchProgress]);

  // Expand MiniPlayer back to Full Player Modal
  const handleExpandMiniPlayer = useCallback((currentTime: number) => {
    if (!miniPlayer) return;
    const movie = miniPlayer.movie;
    setMiniPlayer(null);
    handlePlayMovie(movie, currentTime, false);
  }, [miniPlayer, handlePlayMovie]);

  // Remove progress from Continue Watching
  const handleRemoveWatchProgress = useCallback((movieId: string) => {
    storageService.clearWatchProgress(movieId);
    refreshWatchProgress();
  }, [refreshWatchProgress]);

  const handleSelectMovie = useCallback((movie: Movie | null) => {
    setSelectedMovie(movie);
  }, []);

  const handleOpenAuth = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleTabChange = useCallback((tab: 'settings' | 'browse' | 'downloads' | 'admin') => {
    setActiveTab(tab);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchTerm(q);
    setActiveTab((curr) => (curr !== 'browse' ? 'browse' : curr));
  }, []);

  // Movies visible in live application feed
  const liveFeedMovies = movies.filter((m) => m.is_active);
  const featuredMovie =
    liveFeedMovies.find((m) => m.is_featured) || liveFeedMovies[0] || null;

  // Rails categorized dynamically by populated genres
  const populatedGenres = Array.from(
    new Set(liveFeedMovies.map((m) => m.genre).filter(Boolean))
  );

  const genreSubtitles: Record<string, string> = {
    'Sci-Fi': 'Futuristic worlds, orbital deep space, and synthetic realities',
    'Action': 'High-octane pursuits, tactical combat, and adrenaline sequences',
    'Thriller': 'Psychological suspense, gripping conspiracies, and high stakes',
    'Drama': 'Emotionally charged narratives and character-driven cinema',
    'Crime': 'Underworld syndicates, heist masterminds, and gritty investigations',
    'Horror': 'Supernatural phenomena, psychological dread, and visceral chills',
    'Adventure': 'Epic expeditions across uncharted territories and daring quests',
    'Comedy': 'Witty satire, irreverent humor, and lighthearted escapades',
  };

  const topRatedMovies = [...liveFeedMovies].sort((a, b) => b.rating - a.rating);
  const recentMovies = [...liveFeedMovies].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const watchlistMovies = liveFeedMovies.filter((m) => user.watchlist.includes(m.id));

  // Count active downloads
  const activeDownloadsCount = downloads.filter((d) => d.status === 'downloading').length;

  // Session check screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-[#070709] flex flex-col items-center justify-center text-white space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-xl shadow-red-700/30 animate-pulse">
          <Film className="w-8 h-8 text-white" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold font-display tracking-wider text-zinc-100">SAKANET CINEMA</h2>
          <p className="text-xs text-zinc-500 font-mono">Verifying authentication session...</p>
        </div>
      </div>
    );
  }

  // Mandatory Sign-In Gate: Prevents all unauthenticated entries into the app (even the admin)
  if (!user.email) {
    return (
      <AuthGateScreen
        onAuthenticated={(authedUser) => {
          setUser(authedUser);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Bar for Desktop and Mobile */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAndroidView={false}
        onToggleAndroidView={() => {}}
        isOfflineMode={false}
        onToggleOfflineMode={() => {}}
        user={user}
        downloads={downloads}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area with bottom navigation clearance */}
      <div className="flex-1 w-full pb-20">
        <AndroidAppFrame>
          {/* GPU-ACCELERATED PRESERVED TAB PANELS (Zero unmounting, zero rebuild lag, smooth 60fps transitions) */}
          <div className="relative w-full min-h-[70vh]">
            {/* 1. BROWSE & SEARCH TAB (Default Home Tab) */}
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'browse'}
              className={`w-full transition-opacity duration-200 ease-out will-change-transform ${
                activeTab === 'browse' ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
              }`}
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              <BrowseCatalogView
                movies={movies}
                onSelectMovie={handleSelectMovie}
                onPlayMovie={handlePlayMovie}
                onDownloadMovie={handleDownloadMovie}
                onToggleWatchlist={handleToggleWatchlist}
                watchlist={user.watchlist}
                downloads={downloads}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                user={user}
                onOpenAuth={handleOpenAuth}
                continueWatchingList={continueWatchingList}
                onTabChange={handleTabChange}
              />
            </div>

            {/* 2. DOWNLOADS TAB */}
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'downloads'}
              className={`w-full transition-opacity duration-200 ease-out will-change-transform ${
                activeTab === 'downloads' ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
              }`}
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              <OfflineDownloadsView
                downloads={downloads}
                movies={movies}
                user={user}
                isOfflineMode={isOfflineMode}
                onToggleOfflineMode={handleToggleOfflineMode}
                onPlayMovie={(m, isOffline) => handlePlayMovie(m, 0, isOffline)}
                onSelectMovie={handleSelectMovie}
              />
            </div>

            {/* 3. ADMIN PORTAL TAB */}
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'admin'}
              className={`w-full transition-opacity duration-200 ease-out will-change-transform ${
                activeTab === 'admin' ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
              }`}
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              {user.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com' ? (
                <AdminPortalView
                  movies={movies}
                  onMoviesChanged={refreshCatalog}
                  onSelectMovie={handleSelectMovie}
                  onNavigateTab={handleTabChange}
                />
              ) : (
                <div className="max-w-xl mx-auto my-16 p-8 bg-[#121216] border border-red-500/30 rounded-2xl text-center space-y-4 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-500 mx-auto">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    Admin Control Section Restricted
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                    Access to the Admin Control section is strictly reserved for authorized platform administrators.
                    {user.email
                      ? ` Your current account does not have administrator privileges.`
                      : ' Please sign in with an authorized administrator account to enter.'}
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleOpenAuth}
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-red-700/30 transition-all hover:scale-105 cursor-pointer"
                    >
                      <span>{user.email ? 'Switch to Administrator Account' : 'Sign In with Google'}</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('browse')}
                      className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Return to Browse Catalog
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. SETTINGS TAB */}
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'settings'}
              className={`w-full transition-opacity duration-200 ease-out will-change-transform ${
                activeTab === 'settings' ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
              }`}
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              <SettingsView
                user={user}
                downloads={downloads}
                isOfflineMode={isOfflineMode}
                onToggleOfflineMode={handleToggleOfflineMode}
                onOpenAuth={handleOpenAuth}
                onUserUpdated={refreshCatalog}
              />
            </div>
          </div>
        </AndroidAppFrame>
      </div>

      {/* Global Bottom Navigation Bar (Browse, Downloads, Settings, Admin Portal) */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        downloadsCount={downloads.length}
        activeDownloadsCount={activeDownloadsCount}
        user={user}
        onOpenAuth={handleOpenAuth}
      />

      {/* Movie Details Modal (Framer Motion AnimatePresence Animated Entry & Exit) */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetailsModal
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onPlay={(m, startTime) => {
              setSelectedMovie(null);
              handlePlayMovie(m, startTime || 0, false);
            }}
            onToggleWatchlist={handleToggleWatchlist}
            isInWatchlist={user.watchlist.includes(selectedMovie.id)}
            downloadItem={downloads.find((d) => d.movie_id === selectedMovie.id)}
            onReviewAdded={refreshCatalog}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Video Player Modal */}
      {playingMovie && (
        <VideoPlayerModal
          movie={playingMovie}
          initialTime={playbackStartTime}
          allMovies={movies}
          onSelectMovie={(m, time) => handlePlayMovie(m, time || 0, false)}
          onClose={() => {
            setPlayingMovie(null);
            refreshWatchProgress();
          }}
          onEnterMiniPlayer={handleEnterMiniPlayer}
          isOfflinePlayback={isOfflinePlayback}
          onProgressUpdated={refreshWatchProgress}
        />
      )}

      {/* Floating Picture-in-Picture MiniPlayer */}
      {miniPlayer && (
        <MiniPlayer
          movie={miniPlayer.movie}
          initialTime={miniPlayer.currentTime}
          initialIsPlaying={miniPlayer.isPlaying}
          onExpand={handleExpandMiniPlayer}
          onClose={() => {
            setMiniPlayer(null);
            refreshWatchProgress();
          }}
          onProgressUpdated={refreshWatchProgress}
        />
      )}

      {/* Google OAuth 2.0 Auth Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={user}
        onUserChanged={(updatedUser) => {
          storageService.saveUser(updatedUser);
          setUser(updatedUser);
        }}
      />
    </div>
  );
}
