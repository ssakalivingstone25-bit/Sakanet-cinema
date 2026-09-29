import React, { useState, useEffect } from 'react';
import { Movie, DownloadItem, UserProfile, WatchProgress } from './types';
import { storageService, guestUser } from './services/storageService';
import { downloadEngine } from './services/downloadEngine';
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
} from './services/firebase';
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

  // Initial load & subscription to download engine and Firebase Auth
  useEffect(() => {
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
      if (cloudMovies && cloudMovies.length > 0) {
        storageService.saveMovies(cloudMovies);
        setMovies(cloudMovies);
      }
    });

    return () => {
      unsubscribeDownloads();
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const refreshCatalog = () => {
    const allMovies = storageService.getMovies();
    setMovies(allMovies);
    setUser(storageService.getUser());
    refreshWatchProgress();

    // If an open movie was deleted, close players/modals
    setSelectedMovie((prev) => (prev && !allMovies.some((m) => m.id === prev.id) ? null : prev));
    setPlayingMovie((prev) => (prev && !allMovies.some((m) => m.id === prev.id) ? null : prev));
    setMiniPlayer((prev) => (prev && !allMovies.some((m) => m.id === prev.movie.id) ? null : prev));
  };

  const refreshWatchProgress = () => {
    const list = storageService.getContinueWatchingList();
    setContinueWatchingList(list);
  };

  const handleToggleOfflineMode = (offline: boolean) => {
    storageService.setOfflineMode(offline);
    setIsOfflineMode(offline);
  };

  const handleToggleWatchlist = (movieId: string) => {
    storageService.toggleWatchlist(movieId);
    setUser(storageService.getUser());
  };

  // Launch video player (with optional resume timestamp)
  const handlePlayMovie = (movie: Movie, startTime: number = 0, offline: boolean = false) => {
    // If mini player was playing, close it
    setMiniPlayer(null);
    storageService.incrementViewCount(movie.id);
    setPlaybackStartTime(startTime);
    setIsOfflinePlayback(offline);
    setPlayingMovie(movie);
    refreshCatalog();
  };

  const handleDownloadMovie = (movie: Movie) => {
    storageService.incrementDownloadCount(movie.id);
    downloadEngine.triggerDownload(movie);
    refreshCatalog();
  };

  // Enter Picture-in-Picture mode
  const handleEnterMiniPlayer = (movie: Movie, currentTime: number, isPlaying: boolean) => {
    setPlayingMovie(null);
    setMiniPlayer({ movie, currentTime, isPlaying });
    refreshWatchProgress();
  };

  // Expand MiniPlayer back to Full Player Modal
  const handleExpandMiniPlayer = (currentTime: number) => {
    if (!miniPlayer) return;
    const movie = miniPlayer.movie;
    setMiniPlayer(null);
    handlePlayMovie(movie, currentTime, false);
  };

  // Remove progress from Continue Watching
  const handleRemoveWatchProgress = (movieId: string) => {
    storageService.clearWatchProgress(movieId);
    refreshWatchProgress();
  };

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
        onTabChange={setActiveTab}
        isAndroidView={false}
        onToggleAndroidView={() => {}}
        isOfflineMode={false}
        onToggleOfflineMode={() => {}}
        user={user}
        downloads={downloads}
        searchTerm={searchTerm}
        onSearchChange={(q) => {
          setSearchTerm(q);
          if (activeTab !== 'browse') setActiveTab('browse');
        }}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Content Area with bottom navigation clearance */}
      <div className="flex-1 w-full pb-20">
        <AndroidAppFrame>
          {/* SETTINGS TAB (Replaces former home/feed tab) */}
        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            downloads={downloads}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={handleToggleOfflineMode}
            onOpenAuth={() => setShowAuthModal(true)}
            onUserUpdated={() => refreshCatalog()}
          />
        )}

        {/* BROWSE & SEARCH TAB (Default Home Tab) */}
        {activeTab === 'browse' && (
          <BrowseCatalogView
            movies={movies}
            onSelectMovie={(m) => setSelectedMovie(m)}
            onPlayMovie={(m) => handlePlayMovie(m, 0, false)}
            onDownloadMovie={handleDownloadMovie}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={user.watchlist}
            downloads={downloads}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            user={user}
            onOpenAuth={() => setShowAuthModal(true)}
            continueWatchingList={continueWatchingList}
            onTabChange={setActiveTab}
          />
        )}

        {/* DOWNLOADS TAB */}
        {activeTab === 'downloads' && (
          <OfflineDownloadsView
            downloads={downloads}
            movies={movies}
            user={user}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={handleToggleOfflineMode}
            onPlayMovie={(m, isOffline) => handlePlayMovie(m, 0, isOffline)}
            onSelectMovie={(m) => setSelectedMovie(m)}
          />
        )}

        {/* ADMIN PORTAL TAB */}
        {activeTab === 'admin' &&
          (user.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com' ? (
            <AdminPortalView
              movies={movies}
              onMoviesChanged={refreshCatalog}
              onSelectMovie={(m) => setSelectedMovie(m)}
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
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-red-700/30 transition-all hover:scale-105 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#FFFFFF"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{user.email ? 'Switch to Administrator Account' : 'Sign In with Google'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Return to Browse Catalog
                </button>
              </div>
            </div>
          ))}
        </AndroidAppFrame>
      </div>

      {/* Global Bottom Navigation Bar (Browse, Downloads, Settings, Admin Portal) */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        downloadsCount={downloads.length}
        activeDownloadsCount={activeDownloadsCount}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Movie Details Modal */}
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

      {/* Fullscreen Video Player Modal */}
      {playingMovie && (
        <VideoPlayerModal
          movie={playingMovie}
          initialTime={playbackStartTime}
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
