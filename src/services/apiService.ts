import { Movie, UserReview, VJ } from '../types';

export const apiService = {
  /**
   * Fetch all movies stored persistently in SQLite on the server
   */
  async getMovies(): Promise<Movie[]> {
    try {
      const res = await fetch('/api/movies');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const movies = await res.json();
      return Array.isArray(movies) ? movies : [];
    } catch (err) {
      console.warn('apiService.getMovies error (falling back to local cache):', err);
      return [];
    }
  },

  /**
   * Upload video file and movie metadata via multipart/form-data to server Multer disk storage
   */
  async uploadMovie(formData: FormData): Promise<Movie> {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload and save movie on server');
    }

    const data = await res.json();
    return data.movie;
  },

  /**
   * Upload standalone image (avatar or cover)
   */
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error('Failed to upload image');
    return await res.json();
  },

  /**
   * Update movie details
   */
  async updateMovie(id: string, updates: Partial<Movie>): Promise<Movie> {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update movie');
    return await res.json();
  },

  /**
   * Delete movie and its video file from server
   */
  async deleteMovie(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('Delete movie error:', err);
      return false;
    }
  },

  /**
   * Submit genuine user rating and review (stored in SQLite + calculated mathematically)
   */
  async rateMovie(
    movieId: string,
    rating: number,
    comment: string,
    user?: { id?: string; name?: string; avatar?: string }
  ): Promise<{ rating: number; review_count: number; reviews: UserReview[] }> {
    const res = await fetch(`/api/movies/${movieId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        comment,
        userId: user?.id,
        userName: user?.name,
        userAvatar: user?.avatar,
      }),
    });

    if (!res.ok) throw new Error('Failed to record rating');
    return await res.json();
  },

  /**
   * Fetch real reviews from server
   */
  async getReviews(movieId: string): Promise<UserReview[]> {
    try {
      const res = await fetch(`/api/movies/${movieId}/reviews`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Fetch persistent VJs
   */
  async getVJs(): Promise<VJ[]> {
    try {
      const res = await fetch('/api/vjs');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Save VJ profile to SQLite
   */
  async saveVJ(vj: { name: string; avatar_url?: string; bio?: string; genres?: string }): Promise<VJ> {
    const res = await fetch('/api/vjs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vj),
    });
    if (!res.ok) throw new Error('Failed to save VJ profile');
    return await res.json();
  },
};
