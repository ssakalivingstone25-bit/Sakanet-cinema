/**
 * IndexedDB storage engine for uploaded movie video files and cover images.
 * Persists binary Blobs locally across browser tabs and reloads without memory leaks.
 */

const DB_NAME = 'sakanet_media_db';
const DB_VERSION = 1;
const STORE_VIDEOS = 'uploaded_videos';
const STORE_COVERS = 'uploaded_covers';

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS);
      }
      if (!db.objectStoreNames.contains(STORE_COVERS)) {
        db.createObjectStore(STORE_COVERS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Active object URL cache so we don't create multiple URLs for the same key
const activeUrls = new Map<string, string>();

export const mediaDB = {
  /**
   * Save a video File or Blob into IndexedDB
   */
  async saveVideoBlob(movieId: string, blob: Blob): Promise<void> {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const req = store.put(blob, movieId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Retrieve a playable Blob URL for a stored video
   */
  async getVideoBlobUrl(movieId: string): Promise<string | null> {
    if (activeUrls.has(`video_${movieId}`)) {
      return activeUrls.get(`video_${movieId}`)!;
    }

    try {
      const db = await openMediaDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_VIDEOS, 'readonly');
        const store = tx.objectStore(STORE_VIDEOS);
        const req = store.get(movieId);
        req.onsuccess = () => {
          const blob: Blob | undefined = req.result;
          if (blob) {
            const url = URL.createObjectURL(blob);
            activeUrls.set(`video_${movieId}`, url);
            resolve(url);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Save a cover image Blob/File
   */
  async saveCoverBlob(movieId: string, blob: Blob): Promise<void> {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COVERS, 'readwrite');
      const store = tx.objectStore(STORE_COVERS);
      const req = store.put(blob, movieId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Retrieve a cover image Blob URL
   */
  async getCoverBlobUrl(movieId: string): Promise<string | null> {
    if (activeUrls.has(`cover_${movieId}`)) {
      return activeUrls.get(`cover_${movieId}`)!;
    }

    try {
      const db = await openMediaDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_COVERS, 'readonly');
        const store = tx.objectStore(STORE_COVERS);
        const req = store.get(movieId);
        req.onsuccess = () => {
          const blob: Blob | undefined = req.result;
          if (blob) {
            const url = URL.createObjectURL(blob);
            activeUrls.set(`cover_${movieId}`, url);
            resolve(url);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Delete media blobs when movie is deleted
   */
  async deleteMedia(movieId: string): Promise<void> {
    try {
      const db = await openMediaDB();
      const tx = db.transaction([STORE_VIDEOS, STORE_COVERS], 'readwrite');
      tx.objectStore(STORE_VIDEOS).delete(movieId);
      tx.objectStore(STORE_COVERS).delete(movieId);

      const vUrl = activeUrls.get(`video_${movieId}`);
      if (vUrl) {
        URL.revokeObjectURL(vUrl);
        activeUrls.delete(`video_${movieId}`);
      }

      const cUrl = activeUrls.get(`cover_${movieId}`);
      if (cUrl) {
        URL.revokeObjectURL(cUrl);
        activeUrls.delete(`cover_${movieId}`);
      }
    } catch (e) {
      console.warn('Error deleting media from IndexedDB:', e);
    }
  },
};
