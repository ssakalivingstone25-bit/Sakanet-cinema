import { Movie, UserProfile, WatchHistoryItem, RecommendedMovie, RecommendationReason } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { storageService } from './storageService';

export type { RecommendedMovie, RecommendationReason, WatchHistoryItem };

export const AVAILABLE_GENRES = [
  'Action',
  'Thriller',
  'Sci-Fi',
  'Adventure',
  'Comedy',
  'Drama',
  'Horror',
  'Animation',
  'Crime',
  'Romance',
  'Fantasy',
];

export const recommendationEngine = {
  /**
   * Fetch user genre preferences and watch history from Cloud Firestore
   */
  async fetchUserPreferencesAndHistory(userId: string): Promise<{
    genrePreferences: string[];
    watchHistory: WatchHistoryItem[];
  }> {
    if (!userId || userId === 'guest-user') {
      const localUser = storageService.getUser();
      return {
        genrePreferences: localUser.genrePreferences || ['Action', 'Sci-Fi'],
        watchHistory: localUser.watchHistory || [],
      };
    }

    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const genrePreferences = Array.isArray(data.genrePreferences)
          ? data.genrePreferences
          : ['Action', 'Sci-Fi'];
        const watchHistory = Array.isArray(data.watchHistory)
          ? data.watchHistory
          : [];

        // Cache in local storage for smooth zero-latency rendering
        const localUser = storageService.getUser();
        if (localUser.id === userId) {
          storageService.saveUser({
            ...localUser,
            genrePreferences,
            watchHistory,
          });
        }

        return { genrePreferences, watchHistory };
      }
    } catch (err) {
      console.warn('Firestore fetch user preferences notice:', err);
    }

    // Fallback to local storage
    const localUser = storageService.getUser();
    return {
      genrePreferences: localUser.genrePreferences || ['Action', 'Sci-Fi'],
      watchHistory: localUser.watchHistory || [],
    };
  },

  /**
   * Save user selected genre preferences to Firestore and Local Storage
   */
  async saveUserGenrePreferences(userId: string, genres: string[]): Promise<void> {
    // 1. Update local storage immediately for zero-latency response
    const localUser = storageService.getUser();
    storageService.saveUser({
      ...localUser,
      genrePreferences: genres,
    });

    if (!userId || userId === 'guest-user') return;

    // 2. Persist to Cloud Firestore doc: users/{userId}
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          genrePreferences: genres,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore save genre preferences notice:', err);
    }
  },

  /**
   * Record a watched movie event in Firestore and Local Storage
   */
  async recordWatchHistory(
    userId: string,
    movie: Movie,
    currentTimeSec: number,
    durationSec: number
  ): Promise<WatchHistoryItem> {
    const totalDuration = durationSec || movie.duration_minutes * 60 || 7200;
    const progressPercent = Math.min(100, Math.round((currentTimeSec / totalDuration) * 100));
    const completed = progressPercent >= 90;

    const entry: WatchHistoryItem = {
      movieId: movie.id,
      movieTitle: movie.title,
      genre: movie.genre,
      vjName: movie.vj_name || movie.director || 'VJ Junior',
      currentTimeSec: Math.round(currentTimeSec),
      durationSec: Math.round(totalDuration),
      progressPercent,
      completed,
      watchedAt: new Date().toISOString(),
    };

    // 1. Update local storage history
    const localUser = storageService.getUser();
    const existingHistory = localUser.watchHistory || [];
    const filteredHistory = existingHistory.filter((h) => h.movieId !== movie.id);
    const updatedHistory = [entry, ...filteredHistory].slice(0, 40);

    storageService.saveUser({
      ...localUser,
      watchHistory: updatedHistory,
    });

    if (!userId || userId === 'guest-user') return entry;

    // 2. Sync to Cloud Firestore
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          watchHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore record watch history notice:', err);
    }

    return entry;
  },

  /**
   * Subscribe to real-time changes in user genre preferences & history
   */
  subscribeToUserPreferences(
    userId: string,
    callback: (prefs: { genrePreferences: string[]; watchHistory: WatchHistoryItem[] }) => void
  ): () => void {
    if (!userId || userId === 'guest-user') {
      const localUser = storageService.getUser();
      callback({
        genrePreferences: localUser.genrePreferences || ['Action', 'Sci-Fi'],
        watchHistory: localUser.watchHistory || [],
      });
      return () => {};
    }

    try {
      const userRef = doc(db, 'users', userId);
      return onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const genrePreferences = Array.isArray(data.genrePreferences)
              ? data.genrePreferences
              : ['Action', 'Sci-Fi'];
            const watchHistory = Array.isArray(data.watchHistory)
              ? data.watchHistory
              : [];
            callback({ genrePreferences, watchHistory });
          }
        },
        (err) => {
          console.warn('User preferences subscription notice:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  /**
   * Core Recommendation Engine Algorithm
   * Suggests movies to the user based on watch history and genre preferences stored in Firestore.
   */
  calculateRecommendations(
    catalog: Movie[],
    genrePreferences: string[] = ['Action'],
    watchHistory: WatchHistoryItem[] = [],
    watchlist: string[] = []
  ): RecommendedMovie[] {
    if (!catalog || catalog.length === 0) return [];

    // 1. Analyze watch history patterns
    const genreWatchCount: Record<string, number> = {};
    const vjWatchCount: Record<string, number> = {};
    const completedMovieIds = new Set<string>();

    watchHistory.forEach((item) => {
      if (item.genre) {
        genreWatchCount[item.genre] = (genreWatchCount[item.genre] || 0) + 1;
      }
      if (item.vjName) {
        vjWatchCount[item.vjName] = (vjWatchCount[item.vjName] || 0) + 1;
      }
      if (item.completed) {
        completedMovieIds.add(item.movieId);
      }
    });

    const lastWatched = watchHistory.length > 0 ? watchHistory[0] : null;

    // 2. Score candidate movies
    const scoredList: RecommendedMovie[] = catalog
      .filter((movie) => movie.is_active !== false)
      .map((movie) => {
        let score = 50; // Base score
        let reasonType: RecommendationReason['type'] = 'top_rated';
        let reasonLabel = 'Popular on Sakanet Cinema';
        let highlight = `${movie.rating || 5.0} ★`;

        const movieGenre = movie.genre;
        const movieVj = movie.vj_name || movie.director || '';

        // Factor A: Explicit Genre Preferences (stored in Firestore) -> Highest Weight (+40)
        const isPreferredGenre = genrePreferences.some(
          (pref) => pref.toLowerCase() === movieGenre.toLowerCase()
        );
        if (isPreferredGenre) {
          score += 40;
          reasonType = 'genre_match';
          reasonLabel = `Matches your ${movieGenre} preference`;
          highlight = movieGenre;
        }

        // Factor B: Similarity to Most Recently Watched Title (+30)
        if (lastWatched && lastWatched.movieId !== movie.id) {
          if (lastWatched.genre.toLowerCase() === movieGenre.toLowerCase()) {
            score += 28;
            reasonType = 'watch_history';
            reasonLabel = `Because you watched "${lastWatched.movieTitle}"`;
            highlight = lastWatched.movieTitle;
          } else if (lastWatched.vjName && movieVj && lastWatched.vjName === movieVj) {
            score += 20;
            reasonType = 'vj_favorite';
            reasonLabel = `More from ${movieVj}`;
            highlight = movieVj;
          }
        }

        // Factor C: Frequently Watched Genres from History (+20)
        const watchFreq = genreWatchCount[movieGenre] || 0;
        if (watchFreq > 0) {
          score += Math.min(25, watchFreq * 8);
          if (reasonType === 'top_rated') {
            reasonType = 'genre_match';
            reasonLabel = `Based on your love for ${movieGenre}`;
            highlight = `${watchFreq} watched`;
          }
        }

        // Factor D: Frequently Watched VJ (+15)
        const vjFreq = vjWatchCount[movieVj] || 0;
        if (vjFreq > 0) {
          score += Math.min(18, vjFreq * 6);
        }

        // Factor E: Quality Rating & Popularity (+15)
        const rating = Number(movie.rating) || 5.0;
        score += Math.round((rating / 5) * 15);

        // Factor F: Watchlist presence (+10)
        if (watchlist.includes(movie.id)) {
          score += 10;
        }

        // Factor G: Recently completed penalty (-30) to prioritize fresh movies
        if (completedMovieIds.has(movie.id)) {
          score -= 30;
        }

        // Calculate Normalized Match Percentage (between 76% and 99%)
        const clampedScore = Math.max(30, Math.min(160, score));
        const matchPercentage = Math.round(76 + ((clampedScore - 30) / 130) * 23);

        return {
          movie,
          score,
          matchPercentage,
          reason: {
            type: reasonType,
            label: reasonLabel,
            highlight,
          },
        };
      });

    // 3. Sort descending by computed score
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList;
  },
};

export default recommendationEngine;
