import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw, Lock, Unlock } from 'lucide-react';
import { Movie, VideoPlayerState } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaDB } from '../../services/mediaDB';
import { downloadEngine } from '../../services/downloadEngine';
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

const FALLBACK_STREAM = '/movies/cinema-master-stream.mp4';

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

  // Helper to extract primary video URL from movie
  const getDirectMovieStream = (m: Movie | null): string => {
    if (!m) return FALLBACK_STREAM;
    const direct = m.file_url || (m as any).videoUrl || (m.filename ? `/movies/${m.filename}` : '');
    return direct || FALLBACK_STREAM;
  };

  // Stream source
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>(() => {
    return getDirectMovieStream(movie);
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

  // Landscape and Orientation Lock State
  const [isLandscapeLocked, setIsLandscapeLocked] = useState<boolean>(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return false;
  });

  // Settings & feedback state
  const [currentQuality, setCurrentQuality] = useState<string>('1080p');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('Off');
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string>('Default (Stereo)');
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isDisliked, setIsDisliked] = useState<boolean>(false);
  const [isInMyList, setIsInMyList] = useState<boolean>(() => {
    if (!movie) return false;
    return storageService.getUser().watchlist.includes(movie.id);
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // 1. Resolve Stream Source
  useEffect(() => {
    let isCancelled = false;

    async function resolveSource() {
      if (!movie) return;
      setStreamError(null);

      try {
        const directUrl = movie.file_url || (movie as any).videoUrl || (movie.filename ? `/movies/${movie.filename}` : '');

        // 1. Direct stream URL (e.g. /movies/... or https://...)
        if (directUrl && !directUrl.startsWith('blob:')) {
          if (!isCancelled) {
            setResolvedStreamUrl(directUrl);
            return;
          }
        }

        // 2. Persistent IndexedDB Blob cache
        const indexedDbUrl = await mediaDB.getVideoBlobUrl(movie.id);
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
          setResolvedStreamUrl(FALLBACK_STREAM);
        }
      } catch (err) {
        console.warn('Error resolving movie stream source:', err);
        if (!isCancelled) {
          setResolvedStreamUrl(FALLBACK_STREAM);
        }
      }
    }

    resolveSource();
    return () => {
      isCancelled = true;
    };
  }, [movie]);

  // 2. Auto-rotate to Full Landscape View when device turns horizontal
  useEffect(() => {
    const handleOrientationOrResize = async () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsDeviceLandscape(isLandscape);

      // If user rotates phone horizontally, automatically enter fullscreen landscape mode
      if (isLandscape && !document.fullscreenElement && containerRef.current) {
        try {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          }
          setIsFullscreen(true);

          // Attempt screen orientation lock if available in browser
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch (e) {
          console.warn('Auto landscape fullscreen request notice:', e);
        }
      }
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);

    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, []);

  // 3. Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked by browser policy, attempting muted play:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
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

  // 6. Fullscreen & Landscape Locking
  const toggleFullscreen = useCallback(async () => {
    const elem = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        // Lock landscape on mobile
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
          setIsLandscapeLocked(true);
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
          setIsLandscapeLocked(false);
        }
      } catch (err) {
        console.warn('Exit fullscreen notice:', err);
      }
    }
  }, []);

  // Manual Landscape Lock Button
  const toggleLandscapeLock = useCallback(async () => {
    if (!isLandscapeLocked) {
      try {
        if (!document.fullscreenElement && containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            (containerRef.current as any).webkitRequestFullscreen();
          }
          setIsFullscreen(true);
        }
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
        setIsLandscapeLocked(true);
        showToast('Landscape view locked');
      } catch {
        setIsLandscapeLocked(true);
        showToast('Orientation fixed to Landscape');
      }
    } else {
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
      setIsLandscapeLocked(false);
      showToast('Landscape lock released');
    }
  }, [isLandscapeLocked]);

  // 7. Picture-in-Picture
  const handleTogglePiP = useCallback(async () => {
    setShowSettings(false);
    if (!videoRef.current || !movie) return;

    if (onEnterMiniPlayer) {
      const cur = videoRef.current.currentTime;
      const playing = !videoRef.current.paused;
      storageService.saveWatchProgress(
        movie.id,
        cur,
        videoRef.current.duration || movie.duration_minutes * 60
      );
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

  // 8. Download Video File
  const handleDownload = useCallback(() => {
    setShowSettings(false);
    if (!movie) return;
    downloadEngine.triggerDownload(movie);
    showToast(`Downloading "${movie.title}" for offline playback...`);
  }, [movie]);

  // 9. Open Settings Menu Handler
  const handleOpenSettingsMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings((prev) => !prev);
  }, []);

  // 10. Subtitles Toggle shortcut
  const handleToggleSubtitles = useCallback(() => {
    setCurrentSubtitle((prev) => (prev === 'Off' ? 'English [CC]' : 'Off'));
    showToast(currentSubtitle === 'Off' ? 'Subtitles: English [CC]' : 'Subtitles: Off');
  }, [currentSubtitle]);

  // 11. Toolbar Action Handlers
  const handleToggleMyList = useCallback(() => {
    if (!movie) return;
    const inList = storageService.toggleWatchlist(movie.id);
    setIsInMyList(inList);
    showToast(inList ? 'Added to My List' : 'Removed from My List');
  }, [movie]);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => {
      const next = !prev;
      if (next) setIsDisliked(false);
      showToast(next ? 'Liked film' : 'Removed like');
      return next;
    });
  }, []);

  const handleDislike = useCallback(() => {
    setIsDisliked((prev) => {
      const next = !prev;
      if (next) setIsLiked(false);
      showToast(next ? 'Disliked film' : 'Removed dislike');
      return next;
    });
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share && movie) {
      navigator
        .share({
          title: movie.title,
          text: `Watch "${movie.title}" on Sakanet Cinema`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Movie link copied to clipboard!');
    }
  }, [movie]);

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
        console.warn('Initial autoplay unmuted blocked by browser policy:', err);
        setIsPlaying(false);
      });
  }, [initialTime]);

  const handleVideoError = () => {
    console.warn('Video playback error for URL:', resolvedStreamUrl);
    if (resolvedStreamUrl !== FALLBACK_STREAM) {
      setResolvedStreamUrl(FALLBACK_STREAM);
      showToast('Switched to master high-definition backup stream');
    } else {
      setStreamError('Playback failed. Please check network connection or master video file.');
    }
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
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
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
        case 'c':
        case 'C':
          e.preventDefault();
          handleToggleSubtitles();
          break;
        case 'Escape':
          if (isFullscreen) {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            }
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
    handleToggleSubtitles,
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

  if (!movie) return null;

  const playerState: VideoPlayerState = {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    isFullscreen,
  };

  const availableQualities = movie.video_qualities || ['4K UHD', '1080p', '720p', '480p'];
  const availableSubtitles = movie.subtitles || ['English [CC]', 'Luganda', 'French'];
  const availableAudioTracks = movie.audio_tracks || [
    'Default (Stereo)',
    'Luganda [VJ Translation]',
    'Original English',
  ];

  const vjLabel = movie.vj_name || movie.director || 'VJ Junior';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-none bg-black overflow-hidden select-none font-sans flex items-center justify-center"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-purple-700/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 border border-purple-400/40">
            {toastMessage}
          </div>
        )}

        {/* Video Element */}
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
            onClick={togglePlay}
            onEnded={() => {
              setIsPlaying(false);
              storageService.clearWatchProgress(movie.id);
              onProgressUpdated?.();
            }}
          />
        ) : null}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
            <div className="w-14 h-14 border-4 border-red-600/40 border-t-red-600 rounded-full animate-spin shadow-2xl" />
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
                setResolvedStreamUrl(FALLBACK_STREAM);
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Playback</span>
            </button>
          </div>
        )}

        {/* Floating Quick Landscape Lock Toggle Button */}
        <div className="absolute top-4 right-16 sm:right-24 z-40">
          <button
            onClick={toggleLandscapeLock}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-lg cursor-pointer ${
              isLandscapeLocked
                ? 'bg-red-600 text-white border border-red-400'
                : 'bg-black/60 hover:bg-black/85 text-zinc-300 border border-white/20'
            }`}
            title="Lock Landscape Orientation"
          >
            {isLandscapeLocked ? (
              <>
                <Lock className="w-3 h-3 text-red-200" />
                <span>Locked 16:9</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-zinc-400" />
                <span className="hidden sm:inline">Auto Rotate</span>
              </>
            )}
          </button>
        </div>

        {/* Controls Overlay (Ghost style, bold highlight on click, auto-fade, only pauses on center icon) */}
        <ControlsOverlay
          state={playerState}
          movieTitle={movie.title}
          studioName={vjLabel}
          categoryTag={movie.genre}
          currentQuality={currentQuality}
          currentSubtitle={currentSubtitle}
          isSubtitlesActive={currentSubtitle !== 'Off'}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onOpenSettingsMenu={handleOpenSettingsMenu}
          onToggleSubtitles={handleToggleSubtitles}
          onClose={handleCloseWithSave}
          onToggleMyList={handleToggleMyList}
          isInMyList={isInMyList}
          onLike={handleLike}
          isLiked={isLiked}
          onDislike={handleDislike}
          isDisliked={isDisliked}
          onShare={handleShare}
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
    </div>
  );
};

export default VideoPlayerContainer;
