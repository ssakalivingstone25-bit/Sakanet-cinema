import { Movie, VJ, UserReview, DownloadItem, UserProfile, WatchProgress } from '../types';

const STORAGE_KEYS = {
  MOVIES: 'sakanet_movies_v2',
  VJS: 'sakanet_vjs_v2',
  REVIEWS: 'sakanet_reviews_v2',
  DOWNLOADS: 'sakanet_downloads_v2',
  USER: 'sakanet_user_v2',
  WATCH_PROGRESS: 'sakanet_watch_progress_v2',
  OFFLINE_MODE: 'sakanet_offline_mode_v2',
};

export const guestUser: UserProfile = {
  id: '',
  name: 'Guest Visitor',
  email: '',
  avatar_url: '',
  role: 'user',
  tier: 'Free',
  download_quota_used_mb: 0,
  download_quota_limit_mb: 5000,
  watchlist: [],
};

export const defaultUser = guestUser;

export const storageService = {
  // --- MOVIES (Strictly real movies from database/user URL streaming) ---
  getMovies(): Movie[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOVIES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // Clean, validate real movies with valid identifiers and provide safe fallbacks
      return parsed
        .filter((m: any) => m && m.id && m.title)
        .map((m: any) => {
          const video = m.video_url || m.file_url || m.videoUrl || (m.filename ? `/movies/${m.filename}` : '');
          const poster =
            m.poster_url ||
            m.thumbnail_url ||
            m.banner_url ||
            'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80';
          return {
            ...m,
            video_url: video,
            file_url: video,
            videoUrl: video,
            poster_url: poster,
            thumbnail_url: poster,
            banner_url: m.banner_url || poster,
            is_active: m.is_active !== false && m.is_active !== 0,
          };
        });
    } catch {
      return [];
    }
  },

  incrementViewCount(movieId: string): void {
    const movies = this.getMovies();
    const movie = movies.find((m) => m.id === movieId);
    if (movie) {
      movie.view_count = (movie.view_count || 0) + 1;
      this.saveMovies(movies);
    }
  },

  incrementDownloadCount(movieId: string): void {
    const movies = this.getMovies();
    const movie = movies.find((m) => m.id === movieId);
    if (movie) {
      movie.download_count = (movie.download_count || 0) + 1;
      this.saveMovies(movies);
    }
  },

  getLiveFeedMovies(): Movie[] {
    const movies = this.getMovies();
    return movies.filter((m) => m.is_active);
  },

  getPendingMovies(): Movie[] {
    const movies = this.getMovies();
    return movies.filter((m) => !m.is_active);
  },

  publishMovie(id: string): Movie | null {
    return this.updateMovie(id, { is_active: true });
  },

  unpublishMovie(id: string): Movie | null {
    return this.updateMovie(id, { is_active: false });
  },

  getMovieById(id: string): Movie | undefined {
    return this.getMovies().find((m) => m.id === id);
  },

  saveMovies(movies: Movie[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
    } catch (e) {
      console.error('Failed to save movies to localStorage', e);
    }
  },

  addMovie(movie: Omit<Movie, 'id' | 'created_at' | 'rating' | 'review_count'>): Movie {
    const movies = this.getMovies();
    const newMovie: Movie = {
      ...movie,
      id: `movie-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rating: 5.0,
      review_count: 1,
      created_at: new Date().toISOString(),
    };
    const updated = [newMovie, ...movies];
    this.saveMovies(updated);
    return newMovie;
  },

  updateMovie(id: string, updates: Partial<Movie>): Movie | null {
    const movies = this.getMovies();
    const index = movies.findIndex((m) => m.id === id);
    if (index === -1) return null;

    movies[index] = { ...movies[index], ...updates };
    this.saveMovies(movies);
    return movies[index];
  },

  toggleMovieActive(id: string): boolean {
    const movies = this.getMovies();
    const target = movies.find((m) => m.id === id);
    if (!target) return false;

    target.is_active = !target.is_active;
    this.saveMovies(movies);
    return target.is_active;
  },

  deleteMovie(id: string): boolean {
    const movies = this.getMovies();
    const updated = movies.filter((m) => m.id !== id);
    this.saveMovies(updated);

    // Also remove from watch progress
    this.clearWatchProgress(id);

    // Remove from user watchlist
    const user = this.getUser();
    if (user.watchlist && user.watchlist.includes(id)) {
      user.watchlist = user.watchlist.filter((wId) => wId !== id);
      this.saveUser(user);
    }

    // Remove from downloads
    const downloads = this.getDownloads();
    const updatedDownloads = downloads.filter((d) => d.movie_id !== id);
    if (downloads.length !== updatedDownloads.length) {
      this.saveDownloads(updatedDownloads);
    }

    // Remove reviews for this movie
    try {
      const allReviews = this.getReviews();
      const filteredReviews = allReviews.filter((r) => r.movie_id !== id);
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(filteredReviews));
    } catch (e) {
      console.error(e);
    }

    return true;
  },

  deleteMultipleMovies(ids: string[]): boolean {
    ids.forEach((id) => this.deleteMovie(id));
    return true;
  },

  // --- VJS (Customizable Video Jockeys with direct device image uploads) ---
  getVJs(): VJ[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VJS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveVJs(vjs: VJ[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VJS, JSON.stringify(vjs));
    } catch (e) {
      console.error('Failed to save VJs to localStorage', e);
    }
  },

  addVJ(vj: Omit<VJ, 'id' | 'created_at'>): VJ {
    const vjs = this.getVJs();
    const newVj: VJ = {
      ...vj,
      id: `vj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newVj, ...vjs.filter((v) => v.name.toLowerCase() !== vj.name.toLowerCase())];
    this.saveVJs(updated);
    return newVj;
  },

  // --- CONTINUE WATCHING & PLAYBACK PROGRESS TRACKING ---
  getAllWatchProgress(): Record<string, WatchProgress> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getWatchProgressForMovie(movieId: string): WatchProgress | null {
    const all = this.getAllWatchProgress();
    return all[movieId] || null;
  },

  saveWatchProgress(movieId: string, currentTime: number, duration: number): void {
    if (!movieId || isNaN(currentTime) || isNaN(duration) || duration <= 0) return;
    
    const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
    const all = this.getAllWatchProgress();

    // If watched more than 95%, clear from continue watching (film completed)
    if (progressPercent >= 95 || currentTime >= duration - 10) {
      delete all[movieId];
    } else if (currentTime > 5) { // At least 5 seconds watched
      all[movieId] = {
        movieId,
        currentTime: Math.round(currentTime),
        duration: Math.round(duration),
        progressPercent,
        lastWatchedAt: Date.now(),
      };
    }

    try {
      localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save watch progress', e);
    }
  },

  clearWatchProgress(movieId: string): void {
    const all = this.getAllWatchProgress();
    if (all[movieId]) {
      delete all[movieId];
      try {
        localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(all));
      } catch (e) {
        console.error(e);
      }
    }
  },

  getContinueWatchingList(): { movie: Movie; progress: WatchProgress }[] {
    const movies = this.getLiveFeedMovies();
    const allProgress = this.getAllWatchProgress();

    const items: { movie: Movie; progress: WatchProgress }[] = [];
    for (const movie of movies) {
      const progress = allProgress[movie.id];
      if (progress && progress.currentTime > 5 && progress.progressPercent < 95) {
        items.push({ movie, progress });
      }
    }

    // Sort by most recently watched
    return items.sort((a, b) => b.progress.lastWatchedAt - a.progress.lastWatchedAt);
  },

  // --- REVIEWS & RATINGS ---
  getReviews(movieId?: string): UserReview[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      const reviews: UserReview[] = data ? JSON.parse(data) : [];
      if (movieId) {
        return reviews.filter((r) => r.movie_id === movieId);
      }
      return reviews;
    } catch {
      return [];
    }
  },

  addReview(movieId: string, rating: number, comment: string, userName?: string): UserReview {
    const allReviews = this.getReviews();
    const user = this.getUser();
    const newReview: UserReview = {
      id: `rev-${Date.now()}`,
      movie_id: movieId,
      user_name: userName || user.name,
      user_email: user.email,
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      created_at: new Date().toISOString(),
    };

    const updatedReviews = [newReview, ...allReviews];
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(updatedReviews));
    } catch (e) {
      console.error(e);
    }

    // Recalculate average movie rating
    const movieReviews = updatedReviews.filter((r) => r.movie_id === movieId);
    const sum = movieReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = Number((sum / movieReviews.length).toFixed(1));

    const movies = this.getMovies();
    const mIndex = movies.findIndex((m) => m.id === movieId);
    if (mIndex !== -1) {
      movies[mIndex].rating = avg;
      movies[mIndex].review_count = movieReviews.length;
      this.saveMovies(movies);
    }

    return newReview;
  },

  // --- DOWNLOADS & LOCAL STORAGE DB ---
  getDownloads(): DownloadItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveDownloads(downloads: DownloadItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
    } catch (e) {
      console.error(e);
    }
  },

  startDownload(movie: Movie): DownloadItem {
    const downloads = this.getDownloads();
    const existing = downloads.find((d) => d.movie_id === movie.id);
    if (existing) {
      if (existing.status === 'paused') {
        existing.status = 'downloading';
        this.saveDownloads(downloads);
      }
      return existing;
    }

    const newItem: DownloadItem = {
      id: `dl-${Date.now()}`,
      movie_id: movie.id,
      movie_title: movie.title,
      thumbnail_url: movie.thumbnail_url,
      file_size_mb: movie.file_size_mb,
      downloaded_mb: 0,
      status: 'downloading',
      progress: 0,
      current_chunk: 1,
      total_chunks: 1,
      download_speed_mbps: 18.5,
      encrypted_key: '',
      local_storage_uri: movie.id,
      started_at: new Date().toISOString(),
    };

    const updated = [newItem, ...downloads];
    this.saveDownloads(updated);
    return newItem;
  },

  updateDownloadProgress(
    id: string,
    updates: Partial<DownloadItem>
  ): DownloadItem | null {
    const downloads = this.getDownloads();
    const item = downloads.find((d) => d.id === id);
    if (!item) return null;

    Object.assign(item, updates);
    this.saveDownloads(downloads);
    return item;
  },

  removeDownload(id: string): void {
    const downloads = this.getDownloads();
    const updated = downloads.filter((d) => d.id !== id);
    this.saveDownloads(updated);
  },

  clearAllDownloads(): void {
    localStorage.removeItem(STORAGE_KEYS.DOWNLOADS);
  },

  // --- USER PROFILE & WATCHLIST ---
  getUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (!data) {
        return guestUser;
      }
      const parsed = JSON.parse(data);
      if (!parsed || !parsed.email) {
        return guestUser;
      }
      return parsed;
    } catch {
      return guestUser;
    }
  },

  saveUser(user: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  },

  clearUser(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(guestUser));
    } catch (e) {
      console.error(e);
    }
  },

  toggleWatchlist(movieId: string): boolean {
    const user = this.getUser();
    const index = user.watchlist.indexOf(movieId);
    let isInWatchlist = false;
    if (index > -1) {
      user.watchlist.splice(index, 1);
      isInWatchlist = false;
    } else {
      user.watchlist.push(movieId);
      isInWatchlist = true;
    }
    this.saveUser(user);
    return isInWatchlist;
  },

  // --- OFFLINE NETWORK MODE ---
  isOfflineMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE) === 'true';
  },

  setOfflineMode(offline: boolean): void {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, offline ? 'true' : 'false');
  }
};
