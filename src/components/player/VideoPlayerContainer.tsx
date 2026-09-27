import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Movie, VideoPlayerState } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaDB } from '../../services/mediaDB';
import { VideoElement } from './VideoElement';
import ControlsOverlay from './ControlsOverlay';
import SettingsMenu from './SettingsMenu';

interface VideoPlayerContainerProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
}

const FALLBACK_STREAM = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
const SECONDARY_STREAM = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const VideoPlayerContainer: React.FC<VideoPlayerContainerProps> = ({
  movie,
  onClose,
  onEnterMiniPlayer,
  initialTime = 0,
  isOfflinePlayback = false,
  onProgressUpdated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize with immediate stream source to prevent "no supported sources"
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>(() => {
    if (movie?.file_url && !movie.file_url.startsWith('blob:')) {
      return movie.file_url;
    }
    return FALLBACK_STREAM;
  });

  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Core Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Menu pop-over state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Resolve Stream Source: checks IndexedDB, existing file_url, or fallback
  useEffect(() => {
    let isCancelled = false;

    async function resolveSource() {
      if (!movie) return;
      setIsResolvingStream(true);
      setStreamError(null);

      try {
        // Check IndexedDB for offline or device-stored video Blob
        const indexedDbUrl = await mediaDB.getVideoBlobUrl(movie.id);
        if (indexedDbUrl && !isCancelled) {
          setResolvedStreamUrl(indexedDbUrl);
          setIsResolvingStream(false);
          return;
        }

        // If movie has a valid file_url (http/https or existing blob), test it
        if (movie.file_url) {
          if (movie.file_url.startsWith('blob:')) {
            try {
              const res = await fetch(movie.file_url, { method: 'HEAD' });
              if (res.ok && !isCancelled) {
                setResolvedStreamUrl(movie.file_url);
                setIsResolvingStream(false);
                return;
              }
            } catch {
              // Revoked blob, proceed to fallback stream
            }
          } else {
            if (!isCancelled) {
              setResolvedStreamUrl(movie.file_url);
              setIsResolvingStream(false);
              return;
            }
          }
        }

        // Use resilient cloud stream
        if (!isCancelled) {
          setResolvedStreamUrl(FALLBACK_STREAM);
          setIsResolvingStream(false);
        }
      } catch (err) {
        console.warn('Error resolving movie stream source:', err);
        if (!isCancelled) {
          setResolvedStreamUrl(FALLBACK_STREAM);
          setIsResolvingStream(false);
        }
      }
    }

    resolveSource();

    return () => {
      isCancelled = true;
    };
  }, [movie]);

  // 2. Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (movie) {
        storageService.saveWatchProgress(
          movie.id,
          videoRef.current.currentTime,
          videoRef.current.duration || movie.duration_minutes * 60
        );
        onProgressUpdated?.();
      }
    }
  }, [movie, onProgressUpdated]);

  // 3. Seek to time
  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(videoRef.current.duration || 0, time));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  }, []);

  // 4. Volume & Mute Management
  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // 5. Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // 6. Picture-in-Picture / MiniPlayer
  const handleTogglePiP = useCallback(async () => {
    setShowSettings(false);
    if (!videoRef.current || !movie) return;

    if (onEnterMiniPlayer) {
      const cur = videoRef.current.currentTime;
      const playing = !videoRef.current.paused;
      storageService.saveWatchProgress(movie.id, cur, videoRef.current.duration || movie.duration_minutes * 60);
      onProgressUpdated?.();
      onEnterMiniPlayer(movie, cur, playing);
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  }, [movie, onEnterMiniPlayer, onProgressUpdated]);

  // 7. Download Video File
  const handleDownload = useCallback(() => {
    setShowSettings(false);
    if (!movie) return;
    const link = document.createElement('a');
    link.href = resolvedStreamUrl;
    link.download = `${movie.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [movie, resolvedStreamUrl]);

  // 8. Open Settings Menu Handler
  const handleOpenMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.top });
    setShowSettings((prev) => !prev);
  }, []);

  // 9. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handleTogglePiP();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
          } else {
            handleCloseWithSave();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    handleTogglePiP,
    currentTime,
    volume,
    isFullscreen,
  ]);

  // Save progress on close or unmount
  const handleCloseWithSave = useCallback(() => {
    if (movie && videoRef.current) {
      storageService.saveWatchProgress(
        movie.id,
        videoRef.current.currentTime,
        videoRef.current.duration || movie.duration_minutes * 60
      );
      onProgressUpdated?.();
    }
    onClose();
  }, [movie, onClose, onProgressUpdated]);

  useEffect(() => {
    return () => {
      if (movie && videoRef.current) {
        storageService.saveWatchProgress(
          movie.id,
          videoRef.current.currentTime,
          videoRef.current.duration || movie.duration_minutes * 60
        );
        onProgressUpdated?.();
      }
    };
  }, [movie, onProgressUpdated]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setIsBuffering(false);
    setStreamError(null);
    if (videoRef.current) {
      setDuration(videoRef.current.duration || (movie?.duration_minutes || 0) * 60);
      if (initialTime > 0) {
        videoRef.current.currentTime = initialTime;
      }
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleVideoError = () => {
    console.warn('Video failed to play resolved source:', resolvedStreamUrl);
    if (resolvedStreamUrl !== FALLBACK_STREAM && resolvedStreamUrl !== SECONDARY_STREAM) {
      setResolvedStreamUrl(FALLBACK_STREAM);
      setStreamError(null);
    } else if (resolvedStreamUrl === FALLBACK_STREAM) {
      setResolvedStreamUrl(SECONDARY_STREAM);
      setStreamError(null);
    } else {
      setIsBuffering(false);
      setStreamError('Format not supported or network error occurred while streaming.');
    }
  };

  if (!movie) return null;

  // VideoPlayerState object passed to ControlsOverlay
  const playerState: VideoPlayerState = {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    isFullscreen,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none">
      <div
        ref={containerRef}
        className="group relative w-full max-w-4xl mx-auto bg-black overflow-hidden select-none font-sans rounded-lg shadow-2xl border border-[#27272a] aspect-video flex items-center justify-center"
      >
        {/* Underlying Video Element */}
        {resolvedStreamUrl ? (
          <VideoElement
            key={resolvedStreamUrl}
            ref={videoRef}
            streamUrl={resolvedStreamUrl}
            fallbackStreamUrl={FALLBACK_STREAM}
            posterUrl={movie.banner_url || movie.thumbnail_url}
            playbackSpeed={playbackSpeed}
            volume={volume}
            isMuted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={handleVideoError}
            onEnded={() => {
              setIsPlaying(false);
              storageService.clearWatchProgress(movie.id);
              onProgressUpdated?.();
            }}
          />
        ) : null}

        {/* Buffering Loading Spinner Overlay */}
        {(isResolvingStream || isBuffering) && !streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-20 pointer-events-none">
            <Loader2 className="w-10 h-10 text-[#3b82f6] animate-spin" />
            <span className="text-xs text-zinc-300 font-mono mt-2">Buffering stream...</span>
          </div>
        )}

        {/* Streaming Error Block */}
        {streamError && (
          <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-white">Playback Error</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{streamError}</p>
            </div>
            <button
              onClick={() => {
                setStreamError(null);
                setResolvedStreamUrl(FALLBACK_STREAM);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        )}

        {/* Controls Overlay UI matching Google-like player controls */}
        <ControlsOverlay
          state={playerState}
          movieTitle={movie.title}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onOpenMenu={handleOpenMenu}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onClose={handleCloseWithSave}
        />

        {/* Floating Settings Flyout Menu */}
        {showSettings && (
          <SettingsMenu
            position={menuPosition}
            currentSpeed={playbackSpeed}
            onSpeedChange={(speed) => {
              setPlaybackSpeed(speed);
              if (videoRef.current) videoRef.current.playbackRate = speed;
              setShowSettings(false);
            }}
            onTogglePiP={handleTogglePiP}
            onDownload={handleDownload}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayerContainer;
