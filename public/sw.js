/**
 * MODULE 3: sw.js (The Service Worker Interceptor for Offline Playback)
 * 
 * Intercepts requests matching the offline movie playback pattern (/play-offline/:id)
 * and serves stored authentic video Blobs directly from the SakanetCinemaDB IndexedDB.
 */

const DB_NAME = 'SakanetCinemaDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_movies';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Open SakanetCinemaDB and retrieve the stored video Blob for a movieId
 */
function getStoredVideoBlob(movieId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        return resolve(null);
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(movieId);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match /play-offline/:id or /api/play-offline/:id
  const match = url.pathname.match(/\/(?:api\/)?play-offline\/([^/]+)/);

  if (match) {
    const movieId = decodeURIComponent(match[1]);

    event.respondWith(
      (async () => {
        try {
          const videoBlob = await getStoredVideoBlob(movieId);

          if (!videoBlob) {
            return new Response('Offline movie not found in local storage', {
              status: 404,
              statusText: 'Not Found',
              headers: { 'Content-Type': 'text/plain' },
            });
          }

          const rangeHeader = event.request.headers.get('Range');
          const totalSize = videoBlob.size;

          // Support Range headers for HTML5 video seeking
          if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

            if (start >= totalSize || end >= totalSize) {
              return new Response(null, {
                status: 416,
                headers: { 'Content-Range': `bytes */${totalSize}` },
              });
            }

            const chunk = videoBlob.slice(start, end + 1);
            return new Response(chunk, {
              status: 206,
              statusText: 'Partial Content',
              headers: {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunk.size),
                'Content-Type': videoBlob.type || 'video/mp4',
              },
            });
          }

          // Full stream response
          return new Response(videoBlob, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': videoBlob.type || 'video/mp4',
              'Content-Length': String(totalSize),
              'Accept-Ranges': 'bytes',
            },
          });
        } catch (err) {
          console.error('[ServiceWorker] Failed to serve offline video:', err);
          return new Response('Internal error serving offline video', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
  }
});
