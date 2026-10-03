/**
 * MODULE 2: storageEngine.ts (The IndexedDB Persistence Layer)
 * 
 * Manages persistent offline storage for authentic video blobs in IndexedDB
 * ("SakanetCinemaDB" -> "offline_movies") and negotiates persistent storage rights
 * with the host browser (navigator.storage.persist()) so the OS does not evict downloaded films.
 */

const DB_NAME = 'SakanetCinemaDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_movies';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export const storageEngine = {
  /**
   * Request persistent storage rights from the browser
   * Prevents browser and OS from purging downloaded media under disk pressure
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        return isPersisted;
      } catch (err) {
        console.warn('Storage persistence request error:', err);
        return false;
      }
    }
    return false;
  },

  /**
   * Store large binary video Blob against unique movieId in readwrite transaction
   */
  async saveMovieBlob(movieId: string, movieBlob: Blob): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(movieBlob, movieId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Retrieve stored video Blob for movieId in readonly transaction
   */
  async getMovieBlob(movieId: string): Promise<Blob | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(movieId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Remove video Blob from offline store
   */
  async deleteMovieBlob(movieId: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(movieId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
