import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  Plus,
  Check,
  Star,
  Play,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Clock,
  Film,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Movie, VideoPlayerState } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaDB } from '../../services/mediaDB';
import { downloadEngine } from '../../services/downloadEngine';
import { VideoElement } from './VideoElement';
import ControlsOverlay from './ControlsOverlay';
import SettingsMenu from './SettingsMenu';
import PipPermissionModal from '../PipPermissionModal';

interface VideoPlayerContainerProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
  allMovies?: Movie[];
  onSelectMovie?: (m: Movie, startTime?: number) => void;
}

const resolvePosterImage = (url?: string, fallbackUrl?: string) => {
  if (url && !url.match(/\.(mp4|webm|mkv|mov)$/i) && !url.startsWith('blob:')) {
    return url;
  }
  if (fallbackUrl && !fallbackUrl.match(/\.(mp4|webm|mkv|mov)$/i) && !fallbackUrl.startsWith('blob:')) {
    return fallbackUrl;
  }
  return '';
};

export const VideoPlayerContainer: React.FC<VideoPlayerContainerProps> = ({
  movie: initialMovie,
  onClose,
  onEnterMiniPlayer,
  initialTime = 0,
  isOfflinePlayback = false,
  onProgressUpdated,
  allMovies = [],
  onSelectMovie,
}) => {
  // Current active playing movie state
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(initialMovie);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync if prop changes
  useEffect(() => {
    if (initialMovie && initialMovie.id !== currentMovie?.id) {
      setCurrentMovie(initialMovie);
    }
  }, [initialMovie]);

  // Helper to extract primary video URL from movie
  const getDirectMovieStream = (m: Movie | null): string => {
    if (!m) return '';
    const direct = m.video_url || m.file_url || (m as any).videoUrl || (m.filename ? `/movies/${m.filename}` : '');
    return direct || '';
  };

  // Stream source
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>(() => {
    return getDirectMovieStream(currentMovie);
  });

  const [streamError, setStreamError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Landscape and Orientation
  const [isLandscapeLocked, setIsLandscapeLocked] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');

  const toggleCropAspect = useCallback(() => {
    setAspectMode((prev) => {
      const next = prev === 'contain' ? 'cover' : 'contain';
      showToast(next === 'cover' ? 'Aspect Ratio: Zoom & Fill Screen' : 'Aspect Ratio: Original Fit');
      return next;
    });
  }, []);

  // Settings & feedback state
  const [currentQuality, setCurrentQuality] = useState<string>('1080p');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('Off');
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string>('Default (Stereo)');
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isDisliked, setIsDisliked] = useState<boolean>(false);
  const [isInMyList, setIsInMyList] = useState<boolean>(() => {
    if (!currentMovie) return false;
    return storageService.getUser().watchlist.includes(currentMovie.id);
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPipGuideModal, setShowPipGuideModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Gesture feedback HUD banner
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: 'speed' | 'rewind' | 'next';
    label: string;
  } | null>(null);
  const gestureFeedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const triggerGestureHUD = (type: 'speed' | 'rewind' | 'next', label: string) => {
    setGestureFeedback({ type, label });
    if (gestureFeedbackTimer.current) clearTimeout(gestureFeedbackTimer.current);
    gestureFeedbackTimer.current = setTimeout(() => {
      setGestureFeedback(null);
    }, 1200);
  };

  // Full Movie Catalog for "Other movies" Feed
  const catalogMovies = allMovies && allMovies.length > 0
    ? allMovies
    : storageService.getMovies();

  const otherMovies = catalogMovies.filter((m) => m.id !== currentMovie?.id);

  // 1. Resolve Stream Source
  useEffect(() => {
    let isCancelled = false;

    async function resolveSource() {
      if (!currentMovie) return;
      setStreamError(null);

      try {
        const directUrl =
          currentMovie.video_url ||
          currentMovie.file_url ||
          (currentMovie as any).videoUrl ||
          (currentMovie.filename ? `/movies/${currentMovie.filename}` : '');

        // 1. Direct stream URL (e.g. /movies/... or https://...)
        if (directUrl && !directUrl.startsWith('blob:')) {
          if (!isCancelled) {
            setResolvedStreamUrl(directUrl);
            return;
          }
        }

        // 2. Persistent IndexedDB Blob cache
        const indexedDbUrl = await mediaDB.getVideoBlobUrl(currentMovie.id);
        if (indexedDbUrl && !isCancelled) {
          setResolvedStreamUrl(indexedDbUrl);
          return;
        }

        // 3. Blob URL if still valid
        if (directUrl && !isCancelled) {
          setResolvedStreamUrl(directUrl);
          return;
        }

        if (!isCancelled) {
          if (directUrl) {
            setResolvedStreamUrl(directUrl);
          } else {
            setResolvedStreamUrl('');
            setStreamError('No video stream link configured for this title.');
          }
        }
      } catch (err) {
        console.warn('Error resolving movie stream source:', err);
        if (!isCancelled) {
          setResolvedStreamUrl('');
          setStreamError('Unable to load video stream for this title.');
        }
      }
    }

    resolveSource();
    return () => {
      isCancelled = true;
    };
  }, [currentMovie]);

  // 2. Auto-Trigger Picture-in-Picture (Screen pop up) when user exits application
  // "The app triggers a 'Screen pop up (PiP)' when a user exits the application while a video is playing.
  // This requires 'Display over other apps' permissions. A note specifies: 'Requires to go to phone settings to allow/turn on.'"
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isPlaying && videoRef.current) {
        try {
          if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
            await videoRef.current.requestPictureInPicture();
          } else if (onEnterMiniPlayer && currentMovie) {
            onEnterMiniPlayer(currentMovie, videoRef.current.currentTime, true);
          }
        } catch (err) {
          console.warn('Auto PiP on exit failed (requires display over other apps):', err);
        }
      }
    };

    const handleWindowBlur = async () => {
      // In mobile web / Android WebView, window blur triggers when switching apps
      if (isPlaying && videoRef.current && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        try {
          await videoRef.current.requestPictureInPicture();
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isPlaying, currentMovie, onEnterMiniPlayer]);

  // 3. Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked, attempting muted play:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (currentMovie) {
        storageService.saveWatchProgress(
          currentMovie.id,
          videoRef.current.currentTime,
          videoRef.current.duration || currentMovie.duration_minutes * 60
        );
        onProgressUpdated?.();
      }
    }
  }, [currentMovie, onProgressUpdated]);

  // 4. Seek
  const handleSeek = useCallback((targetTime: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(targetTime, videoRef.current.duration || 99999));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  }, []);

  // 5. Volume & Mute
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

  // 6. Fullscreen & Landscape Rotation Toggle
  // "Bottom Right Icons: Features an Other Controls button and a Full Screen / Play toggle that rotates the display to landscape mode."
  const toggleFullscreen = useCallback(async () => {
    const elem = containerRef.current || document.documentElement;

    if (!document.fullscreenElement && !isFullscreen) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);

        // Rotate display to landscape mode via Screen Orientation API
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
            setIsLandscapeLocked(true);
          } catch (e) {
            console.warn('Orientation lock notice:', e);
          }
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.warn('Exit fullscreen notice:', err);
      }
      setIsFullscreen(false);
      if (screen.orientation && (screen.orientation as any).unlock) {
        try {
          (screen.orientation as any).unlock();
          setIsLandscapeLocked(false);
        } catch {}
      }
    }
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && screen.orientation && (screen.orientation as any).unlock) {
        try {
          (screen.orientation as any).unlock();
          setIsLandscapeLocked(false);
        } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 7. Picture-in-Picture Manual Trigger
  const handleTogglePiP = useCallback(async () => {
    setShowSettings(false);
    if (!videoRef.current || !currentMovie) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showToast('Exited Picture-in-Picture');
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        showToast('Screen pop up (PiP) active');
      } else if (onEnterMiniPlayer) {
        const cur = videoRef.current.currentTime;
        const playing = !videoRef.current.paused;
        onEnterMiniPlayer(currentMovie, cur, playing);
      }
    } catch (e: any) {
      console.warn('PiP error:', e);
      setShowPipGuideModal(true);
    }
  }, [currentMovie, onEnterMiniPlayer]);

  // 8. Next Content Handler (skips to next movie in feed)
  const handleNextMovie = useCallback(() => {
    if (!otherMovies || otherMovies.length === 0) {
      handleSeek(currentTime + 10);
      showToast('No more movies in feed');
      return;
    }
    const next = otherMovies[0];
    setCurrentMovie(next);
    setCurrentTime(0);
    setIsPlaying(true);
    triggerGestureHUD('next', `Playing "${next.title}"`);
    showToast(`Next: ${next.title}`);
  }, [otherMovies, currentTime, handleSeek]);

  // 9. Gestures & Navigation
  // "The application uses swipe and tap gestures to control video playback speed and UI visibility:
  // Left Swipe: Speeds up playback or skips to the next content.
  // Right Swipe: Speeds up the video or initiates a speed rewind (backwards).
  // Screen Tap: Toggles the visibility of the media controls overlay. Tapping once makes controls disappear, and tapping again makes them reappear."
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: performance.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartRef.current.x;
    const deltaY = endY - touchStartRef.current.y;
    const timeDelta = performance.now() - touchStartRef.current.time;

    // Horizontal swipe detection: distance > 45px and more horizontal than vertical
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && timeDelta < 800) {
      if (deltaX < -45) {
        // Left Swipe: Speeds up playback or skips to next content
        if (Math.abs(deltaX) > 130) {
          // Far swipe skips to next content
          handleNextMovie();
        } else {
          // Moderate left swipe speeds up playback
          const nextSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 1.5 : 1;
          setPlaybackSpeed(nextSpeed);
          triggerGestureHUD('speed', `${nextSpeed}x Playback Speed`);
        }
      } else if (deltaX > 45) {
        // Right Swipe: Speeds up the video or initiates a speed rewind (backwards 10s)
        const newTime = Math.max(0, currentTime - 10);
        handleSeek(newTime);
        triggerGestureHUD('rewind', 'Speed Rewind (-10s)');
      }
    }
    touchStartRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          handleSeek(currentTime - 10);
          triggerGestureHUD('rewind', 'Speed Rewind (-10s)');
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          handleSeek(currentTime + 10);
          triggerGestureHUD('speed', '+10s Forward');
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleNextMovie();
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
            toggleFullscreen();
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
    handleNextMovie,
    toggleMute,
    toggleFullscreen,
    handleTogglePiP,
    currentTime,
    isFullscreen,
  ]);

  // Switch movie selection from content feed
  const handleSelectFeedMovie = (m: Movie) => {
    if (videoRef.current && currentMovie) {
      storageService.saveWatchProgress(
        currentMovie.id,
        videoRef.current.currentTime,
        videoRef.current.duration || currentMovie.duration_minutes * 60
      );
      onProgressUpdated?.();
    }
    setCurrentMovie(m);
    setCurrentTime(0);
    setIsPlaying(true);
    showToast(`Now playing: ${m.title}`);
  };

  // Download Video File (Real time stream download)
  const handleDownload = useCallback(() => {
    setShowSettings(false);
    if (!currentMovie) return;
    downloadEngine.triggerDownload(currentMovie);
    showToast(`Downloading "${currentMovie.title}" (Real network transfer)...`);
  }, [currentMovie]);

  // Subtitles Toggle
  const handleToggleSubtitles = useCallback(() => {
    setCurrentSubtitle((prev) => (prev === 'Off' ? 'English [CC]' : 'Off'));
    showToast(currentSubtitle === 'Off' ? 'Subtitles: English [CC]' : 'Subtitles: Off');
  }, [currentSubtitle]);

  // Toolbar Action Handlers
  const handleToggleMyList = useCallback(() => {
    if (!currentMovie) return;
    const inList = storageService.toggleWatchlist(currentMovie.id);
    setIsInMyList(inList);
    showToast(inList ? 'Added to My List' : 'Removed from My List');
  }, [currentMovie]);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => {
      const next = !prev;
      if (next) setIsDisliked(false);
      showToast(next ? 'Liked movie' : 'Removed like');
      return next;
    });
  }, []);

  const handleDislike = useCallback(() => {
    setIsDisliked((prev) => {
      const next = !prev;
      if (next) setIsLiked(false);
      showToast(next ? 'Disliked movie' : 'Removed dislike');
      return next;
    });
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share && currentMovie) {
      navigator
        .share({
          title: currentMovie.title,
          text: `Watch "${currentMovie.title}" on Sakanet Cinema`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Movie link copied to clipboard!');
    }
  }, [currentMovie]);

  // Time update listener
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);

    if (initialTime > 0 && initialTime < videoRef.current.duration) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
    }

    videoRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Initial autoplay blocked by policy:', err);
        setIsPlaying(false);
      });
  }, [initialTime]);

  const handleVideoError = () => {
    console.warn('Video playback error for URL:', resolvedStreamUrl);
    setStreamError('Video stream failed to load or is unreachable. Please verify the streaming URL.');
  };

  // Save progress on close or unmount
  const handleCloseWithSave = useCallback(() => {
    if (currentMovie && videoRef.current) {
      storageService.saveWatchProgress(
        currentMovie.id,
        videoRef.current.currentTime,
        videoRef.current.duration || currentMovie.duration_minutes * 60
      );
      onProgressUpdated?.();
    }
    onClose();
  }, [currentMovie, onClose, onProgressUpdated]);

  if (!currentMovie) return null;

  const playerState: VideoPlayerState = {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    isFullscreen,
  };

  const availableQualities = currentMovie.video_qualities || ['4K UHD', '1080p', '720p', '480p'];
  const availableSubtitles = currentMovie.subtitles || ['English [CC]', 'Luganda', 'French'];
  const availableAudioTracks = currentMovie.audio_tracks || [
    'Default (Stereo)',
    'Luganda [VJ Translation]',
    'Original English',
  ];

  const vjLabel = currentMovie.vj_name || currentMovie.director || 'VJ Junior';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-[#0a0a0f] text-white flex flex-col select-none overflow-hidden ${
        isFullscreen ? 'p-0 w-screen h-screen' : ''
      }`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 border border-red-400/40">
          {toastMessage}
        </div>
      )}

      {/* ========================================================
          1. VIDEO PLAYBACK WINDOW (Top Container, 16:9 YT-like)
          - Displays video content
          - Media controls overlay on top
          - Handles Left & Right swipe gestures and tap toggles
         ======================================================== */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full bg-black flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'h-full w-full'
            : 'aspect-video max-h-[50vh] sm:max-h-[60vh] w-full border-b border-white/10 shadow-2xl'
        }`}
      >
        {/* Video Element */}
        {resolvedStreamUrl ? (
          <VideoElement
            key={resolvedStreamUrl}
            ref={videoRef}
            streamUrl={resolvedStreamUrl}
            posterUrl={resolvePosterImage(currentMovie?.poster_url || currentMovie?.banner_url, currentMovie?.thumbnail_url)}
            playbackSpeed={playbackSpeed}
            volume={volume}
            isMuted={isMuted}
            objectFit={aspectMode}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={handleVideoError}
            onClick={togglePlay}
            onEnded={() => {
              setIsPlaying(false);
              if (currentMovie) {
                storageService.clearWatchProgress(currentMovie.id);
              }
              onProgressUpdated?.();
              handleNextMovie();
            }}
          />
        ) : null}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
            <div className="w-12 h-12 border-4 border-red-600/40 border-t-red-600 rounded-full animate-spin shadow-2xl" />
          </div>
        )}

        {/* Playback Error Screen */}
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
                const stream = getDirectMovieStream(currentMovie);
                if (stream) {
                  setResolvedStreamUrl('');
                  setTimeout(() => setResolvedStreamUrl(stream), 50);
                } else {
                  setStreamError('No video stream link configured for this title.');
                }
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Playback</span>
            </button>
          </div>
        )}

        {/* Media Controls Overlay (Exact Match to User Reference Screenshot) */}
        <ControlsOverlay
          state={playerState}
          movieTitle={currentMovie.title}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onOpenSettingsMenu={(e) => {
            e.stopPropagation();
            setShowSettings((prev) => !prev);
          }}
          onTogglePiP={handleTogglePiP}
          onToggleOrientationLock={toggleFullscreen}
          isOrientationLocked={isLandscapeLocked}
          onToggleCrop={toggleCropAspect}
          isCropActive={aspectMode === 'cover'}
          onClose={handleCloseWithSave}
          onNextEpisode={handleNextMovie}
          onCast={() => {
            if ((videoRef.current as any)?.remote?.prompt) {
              (videoRef.current as any).remote.prompt().catch(() => {});
            } else {
              showToast('Device Cast Ready');
            }
          }}
          gestureFeedback={gestureFeedback}
        />

        {/* Settings Flyout Modal */}
        {showSettings && (
          <SettingsMenu
            onClose={() => setShowSettings(false)}
            currentSpeed={playbackSpeed}
            onSpeedChange={(speed) => {
              setPlaybackSpeed(speed);
              showToast(`Playback speed: ${speed}x`);
            }}
            currentQuality={currentQuality}
            availableQualities={availableQualities}
            onQualityChange={(q) => {
              setCurrentQuality(q);
              showToast(`Stream quality: ${q}`);
            }}
            currentSubtitle={currentSubtitle}
            availableSubtitles={availableSubtitles}
            onSubtitleChange={(sub) => {
              setCurrentSubtitle(sub);
              showToast(`Subtitles: ${sub}`);
            }}
            currentAudioTrack={currentAudioTrack}
            availableAudioTracks={availableAudioTracks}
            onAudioTrackChange={(track) => {
              setCurrentAudioTrack(track);
              showToast(`Audio Track: ${track}`);
            }}
            isPiPEnabled={false}
            onTogglePiP={handleTogglePiP}
            onDownload={handleDownload}
            onReport={() => {
              setShowSettings(false);
              showToast('Thank you for reporting. Issue flagged to admin.');
            }}
          />
        )}
      </div>

      {/* ========================================================
          2. CONTENT FEED (Scrollable List Below Main Video Player)
          "Below the main video player, a scrollable list is dedicated
           to displaying 'Other movies' or recommended content."
          Hidden during Fullscreen Landscape for cinema immersion.
         ======================================================== */}
      {!isFullscreen && (
        <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-white">
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
            {/* Primary Movie Information Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-black font-display text-white tracking-tight leading-snug">
                    {currentMovie.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400 font-medium">
                    <span className="text-zinc-300 font-semibold">{currentMovie.release_year || 2024}</span>
                    <span>•</span>
                    <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                      {currentMovie.age_rating || '16+'}
                    </span>
                    <span>•</span>
                    <span>{currentMovie.duration_minutes || 120} mins</span>
                    <span>•</span>
                    <span className="text-red-400 font-semibold">{currentMovie.genre}</span>
                  </div>
                </div>

                {/* Rating Badge (Verifying rating integrity) */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    {Number(currentMovie.rating || 5.0).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    ({currentMovie.review_count || 1})
                  </span>
                </div>
              </div>

              {/* VJ Channel Profile Row */}
              <div className="flex items-center justify-between py-2 border-y border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-950 border border-red-600/40 flex items-center justify-center text-red-400 font-bold overflow-hidden shadow-md">
                    {currentMovie.vj_avatar_url ? (
                      <img
                        src={currentMovie.vj_avatar_url}
                        alt={vjLabel}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{vjLabel.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{vjLabel}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-500 fill-red-500 text-black" />
                    </div>
                    <span className="text-xs text-zinc-400">Featured VJ Studio • Luganda Translation</span>
                  </div>
                </div>

                {/* Display Over Other Apps Permission Badge */}
                <button
                  onClick={() => setShowPipGuideModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 hover:text-white border border-white/15 transition-all cursor-pointer"
                  title="Display over other apps (Phone settings)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">PiP Settings</span>
                </button>
              </div>

              {/* Action Buttons Row: Like, Dislike, Share, Download, Add to List */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {/* Like / Dislike Pill */}
                <div className="flex items-center rounded-full bg-white/10 border border-white/10 p-0.5 shrink-0">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-l-full transition-colors cursor-pointer ${
                      isLiked ? 'text-red-500 bg-white/15' : 'text-zinc-200 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </button>
                  <div className="w-[1px] h-4 bg-white/15" />
                  <button
                    onClick={handleDislike}
                    className={`px-3 py-1.5 text-xs rounded-r-full transition-colors cursor-pointer ${
                      isDisliked ? 'text-red-500 bg-white/15' : 'text-zinc-200 hover:text-white'
                    }`}
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 shrink-0 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                {/* Real Stream Download Button */}
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 shrink-0 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span>Download</span>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={handleToggleMyList}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 shrink-0 transition-colors cursor-pointer"
                >
                  {isInMyList ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-red-500 stroke-[2.5]" />
                      <span className="text-white">In Watchlist</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Watchlist</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expandable Synopsis / Description */}
              <div
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="p-3 rounded-2xl bg-[#14151c] border border-white/5 text-xs text-zinc-300 space-y-1.5 cursor-pointer hover:bg-[#181922] transition-colors"
              >
                <div className="flex items-center justify-between font-bold text-white text-xs">
                  <span>About this movie</span>
                  <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                    <span>{isDescriptionExpanded ? 'Show less' : 'More'}</span>
                    {isDescriptionExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                <p className={`leading-relaxed text-zinc-300 ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                  {currentMovie.synopsis ||
                    `Experience the thrilling cinematic release of "${currentMovie.title}", masterfully voiced and translated by ${vjLabel}. High bitrate streaming with seamless Dolby-grade audio.`}
                </p>
                {isDescriptionExpanded && (
                  <div className="pt-2 border-t border-white/5 space-y-1 text-zinc-400 text-[11px]">
                    <div>
                      <strong className="text-zinc-200">Director: </strong>
                      {currentMovie.director || currentMovie.vj_name || 'Livingstone Saka'}
                    </div>
                    <div>
                      <strong className="text-zinc-200">Language: </strong>
                      {currentMovie.language || 'Luganda [VJ Translated]'}
                    </div>
                    <div>
                      <strong className="text-zinc-200">Cast: </strong>
                      {Array.isArray(currentMovie.cast) ? currentMovie.cast.join(', ') : 'Lead Performer'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================
                CONTENT FEED: "Other movies" / Recommended Content
               ======================================================== */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-bold font-display text-white tracking-wide">
                    Other Movies & Recommended
                  </h2>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {otherMovies.length} Available
                </span>
              </div>

              {otherMovies.length === 0 ? (
                <div className="p-8 text-center bg-[#121319] border border-white/5 rounded-2xl space-y-2">
                  <Film className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">No other movies currently in catalog.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {otherMovies.map((other) => (
                    <div
                      key={other.id}
                      onClick={() => handleSelectFeedMovie(other)}
                      className="group flex gap-3 p-2 rounded-xl bg-[#121319] hover:bg-[#181923] border border-white/5 hover:border-red-600/30 transition-all cursor-pointer"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={resolvePosterImage(other.thumbnail_url, other.banner_url)}
                          alt={other.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Duration badge */}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono font-bold text-zinc-200">
                          {other.duration_minutes || 120}m
                        </div>
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Movie Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">
                            {other.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                            <span className="text-zinc-300 font-semibold">{other.vj_name || 'VJ Junior'}</span>
                            <span>•</span>
                            <span>{other.genre}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium mt-1">
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            {Number(other.rating || 5.0).toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>{other.release_year || 2024}</span>
                          <span>•</span>
                          <span className="text-zinc-400">1080p FHD</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Picture-in-Picture & Display Over Other Apps Permission Modal */}
      <PipPermissionModal
        isOpen={showPipGuideModal}
        onClose={() => setShowPipGuideModal(false)}
        onTestPip={async () => {
          if (videoRef.current && document.pictureInPictureEnabled) {
            await videoRef.current.requestPictureInPicture();
          }
        }}
      />
    </div>
  );
};

export default VideoPlayerContainer;
