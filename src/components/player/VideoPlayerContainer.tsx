import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Movie } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaDB } from '../../services/mediaDB';
import { VideoElement } from './VideoElement';
import { ControlsOverlay } from './ControlsOverlay';
import { SettingsMenu } from './SettingsMenu';

interface VideoPlayerContainerProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
}

const FALLBACK_STREAM = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

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

  // Stream source state
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>('');
  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p FHD');
  const [selectedAudio, setSelectedAudio] = useState<string>('English [Dolby Atmos 5.1]');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('Off');

  // UI state
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);

  const controlsTimeoutRef = useRef<number | null>(null);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = useCallback((secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  // 1. Resolve Stream Source: checks IndexedDB, existing file_url, or fallback
  useEffect(() => {
    let isCancelled = false;

    async function resolveSource() {
      if (!movie) return;
      setIsResolvingStream(true);
      setStreamError(null);

      try {
        // First check IndexedDB for direct device-uploaded video Blob
        const indexedDbUrl = await mediaDB.getVideoBlobUrl(movie.id);
        if (indexedDbUrl && !isCancelled) {
          setResolvedStreamUrl(indexedDbUrl);
          setIsResolvingStream(false);
          return;
        }

        // If movie has a valid file_url (http/https or existing blob), test it
        if (movie.file_url) {
          // If blob URL that became revoked or expired, fallback gracefully
          if (movie.file_url.startsWith('blob:')) {
            // Test if blob is still valid
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

  // 2. Auto-Hide Controls after 3 seconds of inactivity during playback
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showSettings) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showSettings]);

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // 3. Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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

  // 4. Seek Relative (-10s / +10s)
  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
  }, [resetControlsTimer]);

  // 5. Seek Absolute (Click progress bar)
  const seekAbsolute = useCallback((time: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(videoRef.current.duration || 0, time));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
  }, [resetControlsTimer]);

  // 6. Volume & Mute Management
  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

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
    resetControlsTimer();
  }, [isMuted, volume, resetControlsTimer]);

  // 7. Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  // 8. Picture in Picture / MiniPlayer
  const handleTogglePiP = useCallback(async () => {
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

  // 9. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
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
          seekRelative(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
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
        case 't':
        case 'T':
          e.preventDefault();
          setIsTheaterMode((prev) => !prev);
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
    seekRelative,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    handleTogglePiP,
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

    // Calculate buffer end
    if (videoRef.current.buffered.length > 0) {
      for (let i = 0; i < videoRef.current.buffered.length; i++) {
        if (
          videoRef.current.buffered.start(i) <= videoRef.current.currentTime &&
          videoRef.current.buffered.end(i) >= videoRef.current.currentTime
        ) {
          setBufferedEnd(videoRef.current.buffered.end(i));
          break;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    setIsBuffering(false);
    setStreamError(null);
    if (videoRef.current) {
      setDuration(videoRef.current.duration || movie?.duration_minutes! * 60 || 0);
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
    // If not already on fallback stream, gracefully recover
    if (resolvedStreamUrl !== FALLBACK_STREAM) {
      setResolvedStreamUrl(FALLBACK_STREAM);
      setIsBuffering(true);
      setStreamError(null);
    } else {
      setIsBuffering(false);
      setStreamError('Format not supported or network error occurred while streaming.');
    }
  };

  if (!movie) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={resetControlsTimer}
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none ${
        isTheaterMode && !isFullscreen ? 'p-0 sm:p-6 md:p-12' : ''
      }`}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center bg-black transition-all ${
          isTheaterMode && !isFullscreen
            ? 'max-w-6xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-red-500/30'
            : ''
        }`}
      >
        {/* Underlying Video Element */}
        {!isResolvingStream && resolvedStreamUrl && (
          <VideoElement
            ref={videoRef}
            streamUrl={resolvedStreamUrl}
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
        )}

        {/* Buffering Loading Spinner Overlay */}
        {(isResolvingStream || isBuffering) && !streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-20 pointer-events-none">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            <span className="text-xs text-zinc-300 font-mono mt-3">Buffering Sakanet Stream...</span>
          </div>
        )}

        {/* Streaming Error Block */}
        {streamError && (
          <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-white">Stream Playback Error</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{streamError}</p>
            </div>
            <button
              onClick={() => {
                setStreamError(null);
                setResolvedStreamUrl(FALLBACK_STREAM);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Stream Feed</span>
            </button>
          </div>
        )}

        {/* Controls Overlay UI */}
        <ControlsOverlay
          movieTitle={movie.title}
          genre={movie.genre}
          isOfflinePlayback={isOfflinePlayback}
          showControls={showControls}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          bufferedEnd={bufferedEnd}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          isTheaterMode={isTheaterMode}
          showSettings={showSettings}
          onClose={handleCloseWithSave}
          onTogglePlay={togglePlay}
          onSeekRelative={seekRelative}
          onSeekAbsolute={seekAbsolute}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleSettings={() => setShowSettings((prev) => !prev)}
          onToggleFullscreen={toggleFullscreen}
          onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
          onTogglePiP={handleTogglePiP}
          formatTime={formatTime}
        />

        {/* Pop-over Settings Menu */}
        <SettingsMenu
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={(s) => {
            setPlaybackSpeed(s);
            if (videoRef.current) videoRef.current.playbackRate = s;
          }}
          selectedQuality={selectedQuality}
          onSelectQuality={(q) => setSelectedQuality(q)}
          availableQualities={movie.video_qualities || ['4K UHD', '1080p FHD', '720p HD', '480p SD']}
          selectedAudio={selectedAudio}
          onSelectAudio={(a) => setSelectedAudio(a)}
          audioTracks={movie.audio_tracks || ['English [Dolby Atmos 5.1]', 'Stereo Master']}
          selectedSubtitle={selectedSubtitle}
          onSelectSubtitle={(sub) => setSelectedSubtitle(sub)}
          subtitles={movie.subtitles || ['English [CC]', 'Spanish', 'French']}
        />
      </div>
    </div>
  );
};
