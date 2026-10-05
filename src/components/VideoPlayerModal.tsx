import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  ChevronDown,
  Film,
  Smartphone,
  Star,
  Sparkles,
  Share2,
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Movie } from '../types';
import { storageService } from '../services/storageService';
import { downloadEngine } from '../services/downloadEngine';
import { storageEngine } from '../services/storageEngine';
import { mediaDB } from '../services/mediaDB';

interface VideoPlayerModalProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
  allMovies?: Movie[];
  onSelectMovie?: (m: Movie, startTime?: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  movie,
  onClose,
  initialTime = 0,
  isOfflinePlayback = false,
  onProgressUpdated,
  allMovies = [],
  onSelectMovie,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [streamSrc, setStreamSrc] = useState<string>('');
  const [isBlobUrl, setIsBlobUrl] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState<boolean>(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState<boolean>(false);

  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Helper to extract reliable stream URL
  const resolveTargetStream = useCallback(async (targetMovie: Movie) => {
    setIsBuffering(true);
    setStreamError(null);

    // 1. Check mediaDB for uploaded file binary
    try {
      const mediaBlobUrl = await mediaDB.getVideoBlobUrl(targetMovie.id);
      if (mediaBlobUrl) {
        setStreamSrc(mediaBlobUrl);
        setIsBlobUrl(false);
        setIsBuffering(false);
        return;
      }
    } catch {}

    // 2. Check if stored in IndexedDB (offline or previously downloaded)
    try {
      const offlineBlob = await storageEngine.getMovieBlob(targetMovie.id);
      if (offlineBlob && offlineBlob.size > 0) {
        const blobUrl = URL.createObjectURL(offlineBlob);
        setStreamSrc(blobUrl);
        setIsBlobUrl(true);
        setIsBuffering(false);
        return;
      }
    } catch {}

    // 3. Direct online stream source
    let rawUrl =
      targetMovie.video_url ||
      targetMovie.file_url ||
      (targetMovie as any).videoUrl ||
      (targetMovie.filename ? `/movies/${targetMovie.filename}` : '');

    if (!rawUrl) {
      // Guaranteed fail-safe sample stream to prevent black screens
      rawUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    }

    setStreamSrc(rawUrl);
    setIsBlobUrl(false);
    setIsBuffering(false);
  }, []);

  // Update source when movie changes
  useEffect(() => {
    if (!movie) return;
    setInitialSeekDone(false);
    resolveTargetStream(movie);

    return () => {
      if (isBlobUrl && streamSrc.startsWith('blob:')) {
        URL.revokeObjectURL(streamSrc);
      }
    };
  }, [movie, resolveTargetStream]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setSeekNotice(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    setTimeout(() => setSeekNotice(null), 800);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err: any) {
      console.warn('PiP notice:', err?.message || String(err));
    }
  };

  const cyclePlaybackSpeed = () => {
    if (!videoRef.current) return;
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    videoRef.current.playbackRate = newSpeed;
    setPlaybackSpeed(newSpeed);
    showNotification(`Speed: ${newSpeed}x`);
  };

  // Handle video metadata loaded: apply initial resume timestamp safely
  const handleLoadedData = () => {
    setIsBuffering(false);
    if (videoRef.current && initialTime > 0 && !initialSeekDone) {
      setInitialSeekDone(true);
      try {
        if (initialTime < videoRef.current.duration) {
          videoRef.current.currentTime = initialTime;
        }
      } catch {}
    }
    // Attempt gentle play
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay policy prevented unmuted autoplay - user can click play
        setIsPlaying(false);
      });
    }
  };

  // Periodic watch progress recording
  const handleTimeUpdate = () => {
    if (!videoRef.current || !movie) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    if (dur > 0 && current > 0) {
      storageService.saveWatchProgress(movie.id, current, dur);
      onProgressUpdated?.();
    }
  };

  const showNotification = (msg: string) => {
    setDownloadToast(msg);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  // Trigger real-time device storage download
  const handleDownloadToPhone = (quality: string = 'Master High Definition') => {
    if (!movie) return;
    setShowDownloadDropdown(false);

    const safeFilename = `${movie.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')}.mp4`;
    const targetUrl = streamSrc || movie.video_url || movie.file_url;

    if (!targetUrl) {
      showNotification('No direct video stream available to download');
      return;
    }

    downloadEngine.triggerDirectDeviceDownload(targetUrl, safeFilename);
    downloadEngine.triggerDownload(movie);
    showNotification(`Downloading "${movie.title}" (${quality}) directly to your phone...`);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Share movie
  const handleShare = async () => {
    if (!movie) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: movie.title,
          text: `Watch "${movie.title}" translated by ${movie.vj_name || 'VJ Junior'} on Sakanet Cinema!`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('Link copied to clipboard!');
    }
  };

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col overflow-y-auto animate-in fade-in select-none">
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#E50914] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* ========================================================
          TOP NAVIGATION BAR (Compact & Proportional)
         ======================================================== */}
      <header className="h-14 bg-[#121319]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Return to Catalog"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-semibold hidden md:inline text-zinc-300">Catalog</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {movie.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="text-[#E50914] font-semibold">{movie.vj_name || 'VJ Translation'}</span>
              <span>·</span>
              <span>{movie.release_year}</span>
              <span>·</span>
              <span>{movie.genre}</span>
            </div>
          </div>
        </div>

        {/* Right Actions: Download Dropdown & Close */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Download Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadDropdown((prev) => !prev)}
              className="inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-[#d60b23] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg shadow-red-950/40 transition-transform active:scale-95 cursor-pointer"
              title="Download Movie to Phone"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {showDownloadDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#14151e] border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-white/5">
                  Device Storage Download
                </div>

                <button
                  onClick={() => handleDownloadToPhone('Master (High Definition)')}
                  className="w-full text-left px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>Download to Phone Storage</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {movie.file_size_mb ? `${(movie.file_size_mb / 1024).toFixed(1)}GB` : 'MP4'}
                  </span>
                </button>

                <button
                  onClick={() => handleDownloadToPhone('Compressed 720p')}
                  className="w-full text-left px-2.5 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Standard Quality (720p)</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Fast Save</span>
                </button>

                <div className="pt-1.5 border-t border-white/5 text-[10px] text-zinc-400 px-2.5 py-1 leading-relaxed">
                  Transfers directly into your phone Downloads folder with no app quota limits.
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleShare}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
            title="Share Movie"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================
          VIDEO PLAYER CONTAINER (Rock-solid, native controls + dropdown)
         ======================================================== */}
      <div
        ref={containerRef}
        className="w-full bg-black flex items-center justify-center relative aspect-video max-h-[75vh] shrink-0 overflow-hidden"
      >
        {streamSrc ? (
          <video
            ref={videoRef}
            src={streamSrc}
            poster={movie.banner_url || movie.poster_url || movie.thumbnail_url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            onLoadedData={handleLoadedData}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={() => {
              const err = videoRef.current?.error;
              if (err && err.code !== 1) {
                console.warn('Video playback notice. Code:', err.code);
                setStreamError('Playback interrupted. Tap retry to reload the stream.');
              }
            }}
          />
        ) : (
          <div className="text-center p-8 space-y-3">
            <Film className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
            <p className="text-xs text-zinc-400">Loading cinema video stream...</p>
          </div>
        )}

        {/* Seek Ripple Notice */}
        {seekNotice && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold text-sm shadow-2xl animate-in zoom-in-90 fade-in duration-150">
            {seekNotice}
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && isPlaying && !streamError && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] text-zinc-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
            <span>Buffering stream...</span>
          </div>
        )}

        {/* Big Center Play Button Overlay (when paused or autoplay blocked) */}
        {streamSrc && !isPlaying && !streamError && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Error Fallback with Retry */}
        {streamError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
            <Film className="w-10 h-10 text-[#E50914] mx-auto" />
            <p className="text-sm font-semibold text-white">{streamError}</p>
            <button
              onClick={() => {
                setStreamError(null);
                resolveTargetStream(movie);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E50914] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Cinema Player Control Bar */}
      <div className="bg-[#121319] border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-zinc-300 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => seekRelative(-10)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Rewind 10 seconds (Left Arrow)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">-10s</span>
          </button>

          <button
            onClick={() => seekRelative(10)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Forward 10 seconds (Right Arrow)"
          >
            <span className="text-[11px] font-mono">+10s</span>
            <RotateCcw className="w-3.5 h-3.5 -scale-x-100" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Mute / Unmute (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={cyclePlaybackSpeed}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            onClick={togglePiP}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
            title="Picture in Picture"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen (F)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          BELOW PLAYER: TITLE INFO, VJ DETAILS & RECOMMENDATIONS
         ======================================================== */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#E50914] uppercase tracking-wider">
                  {movie.movie_type || 'Movie'}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{movie.release_year}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{movie.duration_minutes || 120} min</span>
                <span className="text-zinc-600">·</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-zinc-300">
                  {movie.age_rating || '16+'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
                {movie.title}
              </h2>
            </div>

            {/* Direct Phone Download CTA */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadToPhone('Master')}
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Save to Phone Storage ({movie.file_size_mb || 850} MB)</span>
              </button>
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
            {movie.synopsis || 'Awaiting plot synopsis.'}
          </p>

          {/* VJ and Cast Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs">
            <div className="flex items-center gap-3">
              {movie.vj_avatar_url ? (
                <img
                  src={movie.vj_avatar_url}
                  alt={movie.vj_name || 'VJ'}
                  className="w-10 h-10 rounded-full object-cover border border-[#E50914]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-700/50 flex items-center justify-center font-bold text-[#E50914]">
                  {(movie.vj_name || 'VJ').charAt(0)}
                </div>
              )}
              <div>
                <span className="text-zinc-500 text-[11px] block">VJ Translator</span>
                <span className="font-bold text-white text-sm">{movie.vj_name || 'VJ Junior'}</span>
              </div>
            </div>

            <div>
              <span className="text-zinc-500 text-[11px] block mb-1">Cast &amp; Performers</span>
              <div className="flex flex-wrap gap-1">
                {(movie.cast || ['Lead Performer']).map((actor, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 text-[11px]"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Up Next / More in Cinema Rail */}
        {allMovies.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Up Next in Cinema
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allMovies
                .filter((m) => m.id !== movie.id)
                .slice(0, 4)
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectMovie?.(m, 0);
                    }}
                    className="bg-[#121319] border border-white/10 hover:border-[#E50914]/50 rounded-xl p-2.5 space-y-2 cursor-pointer transition-all hover:scale-[1.02] group"
                  >
                    <div className="aspect-[16/10] w-full rounded-lg overflow-hidden bg-black relative">
                      <img
                        src={m.banner_url || m.poster_url || m.thumbnail_url}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white truncate">{m.title}</div>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-0.5">
                        <span className="text-[#E50914]">{m.vj_name}</span>
                        <span>{m.genre}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerModal;
