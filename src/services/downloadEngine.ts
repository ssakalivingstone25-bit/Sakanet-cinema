import { DownloadItem, Movie } from '../types';
import { storageService } from './storageService';

type DownloadListener = (downloads: DownloadItem[]) => void;

class RealTimeStreamDownloadManager {
  private listeners: Set<DownloadListener> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeStreams: Map<string, boolean> = new Map();
  private blobUrls: Map<string, string> = new Map();

  public subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(storageService.getDownloads());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const downloads = storageService.getDownloads();
    this.listeners.forEach((fn) => fn(downloads));
  }

  public getBlobUrl(movieId: string): string | undefined {
    return this.blobUrls.get(movieId);
  }

  /**
   * Real-time network stream downloader:
   * Connects to the videoUrl via fetch, reads network stream chunk by chunk,
   * calculates authentic received bytes vs total bytes (Content-Length),
   * and compiles the binary chunks into a real local Blob.
   */
  public async triggerDownload(movie: Movie): Promise<DownloadItem> {
    // Check if already in downloads
    let item = storageService.startDownload(movie);
    this.notify();

    if (this.activeStreams.get(item.id)) {
      return item;
    }

    this.startRealNetworkStream(item, movie);
    return item;
  }

  private async startRealNetworkStream(item: DownloadItem, movie: Movie) {
    const abortController = new AbortController();
    this.abortControllers.set(item.id, abortController);
    this.activeStreams.set(item.id, true);

    const updateItem = (updates: Partial<DownloadItem>) => {
      item = { ...item, ...updates };
      storageService.updateDownloadProgress(item.id, updates);
      this.notify();
    };

    updateItem({
      status: 'downloading',
      error_message: undefined,
    });

    try {
      const response = await fetch(movie.file_url, {
        signal: abortController.signal,
        headers: {
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to establish media stream`);
      }

      const contentLengthHeader = response.headers.get('Content-Length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : movie.file_size_mb * 1024 * 1024;
      const totalMb = Math.round(totalBytes / (1024 * 1024));

      if (!response.body) {
        throw new Error('ReadableStream is not supported by browser environment.');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastTimestamp = performance.now();
      let lastReceivedBytes = 0;

      updateItem({
        file_size_mb: totalMb > 0 ? totalMb : movie.file_size_mb,
        total_bytes: totalBytes,
        received_bytes: 0,
      });

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const now = performance.now();
        const timeDelta = (now - lastTimestamp) / 1000; // seconds

        // Calculate instantaneous transfer speed every ~400ms
        let speedMbps = item.download_speed_mbps;
        if (timeDelta >= 0.4) {
          const bytesDelta = receivedBytes - lastReceivedBytes;
          speedMbps = Math.round(((bytesDelta / (1024 * 1024)) / timeDelta) * 10) / 10;
          lastTimestamp = now;
          lastReceivedBytes = receivedBytes;
        }

        const downloadedMb = Math.round(receivedBytes / (1024 * 1024));
        const progress = totalBytes > 0
          ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
          : Math.min(99, Math.round(downloadedMb / (movie.file_size_mb || 100) * 100));

        const currentChunk = Math.min(4, Math.floor((progress / 25)) + 1);

        updateItem({
          downloaded_mb: downloadedMb,
          received_bytes: receivedBytes,
          progress,
          current_chunk: currentChunk,
          download_speed_mbps: speedMbps > 0 ? speedMbps : 12.5,
        });
      }

      // Stream fully assembled into binary Blob
      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      const objectUrl = URL.createObjectURL(blob);
      this.blobUrls.set(movie.id, objectUrl);

      // Trigger native browser download interface to save actual file to device
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${movie.title.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      updateItem({
        status: 'completed',
        progress: 100,
        download_speed_mbps: 0,
        blob_url: objectUrl,
        completed_at: new Date().toISOString(),
        error_message: undefined,
      });

      // Update user storage quota
      const user = storageService.getUser();
      user.download_quota_used_mb += item.file_size_mb;
      storageService.saveUser(user);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateItem({
          status: 'paused',
          download_speed_mbps: 0,
          error_message: 'Download paused by user',
        });
      } else {
        console.warn('Real-time network stream error:', err);
        // If CORS restricted direct ReadableStream access, provide clean fallback
        updateItem({
          status: 'failed',
          download_speed_mbps: 0,
          error_message: err.message || 'CORS / Network restriction on media host',
        });
      }
    } finally {
      this.activeStreams.delete(item.id);
      this.abortControllers.delete(item.id);
    }
  }

  public pause(id: string) {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
    const downloads = storageService.getDownloads();
    const item = downloads.find((d) => d.id === id);
    if (item && item.status === 'downloading') {
      item.status = 'paused';
      item.download_speed_mbps = 0;
      storageService.saveDownloads(downloads);
      this.notify();
    }
  }

  public resume(id: string) {
    const downloads = storageService.getDownloads();
    const item = downloads.find((d) => d.id === id);
    if (!item || item.status !== 'paused') return;

    const movie = storageService.getMovieById(item.movie_id);
    if (movie) {
      this.startRealNetworkStream(item, movie);
    }
  }
}

export const downloadEngine = new RealTimeStreamDownloadManager();
