/**
 * MODULE 1: downloadEngine.ts (The Main Thread Downloader)
 * 
 * Streams movie video data chunk-by-chunk in real time using Fetch API and ReadableStream.
 * Measures genuine byte progress, triggers device file saving into phone storage,
 * and persists the binary video Blob in IndexedDB (SakanetCinemaDB).
 */

import { DownloadItem, Movie } from '../types';
import { storageService } from './storageService';
import { storageEngine } from './storageEngine';

export interface DownloadProgressInfo {
  movieId: string;
  bytesReceived: number;
  totalBytes: number;
  progressPercent: number;
  speedMbps: number;
  isComplete: boolean;
  blob?: Blob;
  error?: string;
}

export type OnProgressCallback = (info: DownloadProgressInfo) => void;

type DownloadListener = (downloads: DownloadItem[]) => void;

/**
 * Resolve the original movie file name without fail
 * Strictly prevents turning movie file names into random numbers or timestamps like 00077993
 */
export function getOriginalMovieFilename(movie: Movie): string {
  // 1. Explicit original_filename or filename
  const explicit = (movie as any).original_filename || movie.filename;
  if (explicit && typeof explicit === 'string' && explicit.trim() && !explicit.startsWith('movie-')) {
    const clean = explicit.trim();
    return clean.includes('.') ? clean : `${clean}.mp4`;
  }
  // 2. Extract original filename from stream URL
  const streamUrl = movie.video_url || movie.file_url || (movie as any).videoUrl || '';
  if (streamUrl && typeof streamUrl === 'string') {
    try {
      const cleanPath = streamUrl.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.') && !last.startsWith('movie-') && !/^\d{5,}$/.test(last.replace(/\.[^.]+$/, ''))) {
        return decodeURIComponent(last);
      }
    } catch {}
  }
  // 3. User friendly clean title with .mp4
  const cleanTitle = (movie.title || 'Movie').trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
  return cleanTitle.toLowerCase().endsWith('.mp4') ? cleanTitle : `${cleanTitle}.mp4`;
}

/**
 * Core stream downloader function as specified in Module 1
 * Consumes real Internet data byte by byte in real-time, calculating exact network throughput
 */
export async function downloadMovieWithProgress(
  movieUrl: string,
  movieId: string,
  onProgressCallback?: OnProgressCallback,
  signal?: AbortSignal
): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(movieUrl, {
      signal,
      headers: {
        Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err: any) {
    if (signal?.aborted) throw err;
    // Cross-origin fallback: use streaming proxy for genuine chunk transmission
    if (movieUrl.startsWith('http')) {
      const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(movieUrl)}`;
      response = await fetch(proxyUrl, {
        signal,
        headers: { Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8' },
      });
    } else {
      throw err;
    }
  }

  if (!response.ok && movieUrl.startsWith('http')) {
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(movieUrl)}`;
    const proxyRes = await fetch(proxyUrl, {
      signal,
      headers: { Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8' },
    });
    if (proxyRes.ok) {
      response = proxyRes;
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to reach movie video stream`);
  }

  // Extract Content-Length safely with fallback for CORS or chunked transfer
  const contentLengthHeader = response.headers.get('Content-Length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

  if (!response.body) {
    const blob = await response.blob();
    onProgressCallback?.({
      movieId,
      bytesReceived: blob.size,
      totalBytes: blob.size,
      progressPercent: 100,
      speedMbps: 0,
      isComplete: true,
      blob,
    });
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesReceived = 0;
  let lastTimestamp = performance.now();
  let lastBytes = 0;
  const overallStart = performance.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    bytesReceived += value.length;

    // Record genuine internet data consumption in realtime byte by byte
    storageService.recordDataConsumption(value.length);

    const now = performance.now();
    const timeDelta = (now - lastTimestamp) / 1000;
    let speedMbps = 0;

    if (timeDelta >= 0.2) {
      const bytesDelta = bytesReceived - lastBytes;
      speedMbps = Math.round(((bytesDelta * 8) / (1024 * 1024) / timeDelta) * 10) / 10;
      lastTimestamp = now;
      lastBytes = bytesReceived;
    } else {
      const overallElapsed = (now - overallStart) / 1000;
      if (overallElapsed > 0.1) {
        speedMbps = Math.round(((bytesReceived * 8) / (1024 * 1024) / overallElapsed) * 10) / 10;
      }
    }

    const progressPercent = totalBytes > 0
      ? Math.min(100, Math.round((bytesReceived / totalBytes) * 100))
      : 0;

    onProgressCallback?.({
      movieId,
      bytesReceived,
      totalBytes: totalBytes > 0 ? totalBytes : bytesReceived,
      progressPercent,
      speedMbps: Math.max(0.1, speedMbps),
      isComplete: false,
    });
  }

  // Compile binary chunks into a singular Blob
  const compiledBlob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });

  onProgressCallback?.({
    movieId,
    bytesReceived,
    totalBytes: bytesReceived,
    progressPercent: 100,
    speedMbps: 0,
    isComplete: true,
    blob: compiledBlob,
  });

  return compiledBlob;
}

class RealTimeStreamDownloadManager {
  private listeners: Set<DownloadListener> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeStreams: Map<string, boolean> = new Map();
  private blobUrls: Map<string, string> = new Map();

  constructor() {
    // Request persistent browser storage on init
    storageEngine.requestPersistentStorage().catch(() => {});
  }

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
   * Save a real downloadable video file to phone storage via browser native download
   */
  public triggerDirectDeviceDownload(url: string, filename: string) {
    const safeName = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 1000);
  }

  /**
   * Start genuine streaming download and save to phone storage
   */
  public async triggerDownload(movie: Movie): Promise<DownloadItem> {
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

    const safeFilename = getOriginalMovieFilename(movie);

    try {
      const targetUrl = movie.video_url || movie.file_url || (movie as any).videoUrl || '';
      if (!targetUrl) {
        throw new Error('No valid video stream URL available for this title.');
      }

      // Execute real-time streaming download
      const blob = await downloadMovieWithProgress(
        targetUrl,
        movie.id,
        (info) => {
          const downloadedMb = Math.round(info.bytesReceived / (1024 * 1024));
          const totalMb = Math.round(info.totalBytes / (1024 * 1024));
          const currentChunk = Math.min(4, Math.floor((info.progressPercent / 25)) + 1);

          updateItem({
            downloaded_mb: downloadedMb,
            file_size_mb: totalMb > 0 ? totalMb : movie.file_size_mb,
            received_bytes: info.bytesReceived,
            total_bytes: info.totalBytes,
            progress: info.progressPercent,
            current_chunk: currentChunk,
            download_speed_mbps: info.speedMbps,
          });
        },
        abortController.signal
      );

      // Persist in SakanetCinemaDB IndexedDB for offline service worker interception
      await storageEngine.saveMovieBlob(movie.id, blob);

      // Create blob URL
      const objectUrl = URL.createObjectURL(blob);
      this.blobUrls.set(movie.id, objectUrl);

      // Trigger automatic save to phone storage
      this.triggerDirectDeviceDownload(objectUrl, safeFilename);

      updateItem({
        status: 'completed',
        progress: 100,
        download_speed_mbps: 0,
        blob_url: objectUrl,
        completed_at: new Date().toISOString(),
        error_message: undefined,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateItem({
          status: 'paused',
          download_speed_mbps: 0,
        });
      } else {
        console.error('Download stream error:', err);
        updateItem({
          status: 'failed',
          error_message: err.message || 'Stream download interrupted',
          download_speed_mbps: 0,
        });
      }
    } finally {
      this.activeStreams.delete(item.id);
      this.abortControllers.delete(item.id);
      this.notify();
    }
  }

  public pause(downloadId: string): void {
    const controller = this.abortControllers.get(downloadId);
    if (controller) {
      controller.abort();
    }
  }

  public resume(downloadId: string): void {
    const downloads = storageService.getDownloads();
    const item = downloads.find((d) => d.id === downloadId);
    if (!item) return;

    const movie = storageService.getMovieById(item.movie_id);
    if (movie) {
      this.startRealNetworkStream(item, movie);
    }
  }

  public cancel(downloadId: string): void {
    this.pause(downloadId);
    storageService.removeDownload(downloadId);
    this.notify();
  }
}

export const downloadEngine = new RealTimeStreamDownloadManager();
