import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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

const FALLBACK_STREAM =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
const SECONDARY_STREAM =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

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

  // Initialize with stream source
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string>(() => {
    if (movie?.file_url && !movie.file_url.startsWith('blob:')) {
      return movie.file_url;
    }
    return FALLBACK_STREAM;
  });

  const [streamError, setStreamError] = useState<string | null>(null);

  // Core Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Quality, Subtitles, Audio track state matching reference
  const [currentQuality, setCurrentQuality] = useState<string>('1080p');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('Off');
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string>('Default (Stereo)');
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isDisliked, setIsDisliked] = useState<boolean>(false);
  const [isInMyList, setIsInMyList] = useState<boolean>(() => {
    if (!movie) return false;
    return storageService.getUser().watchlist.includes(movie.id);
  });

  // Settings flyout state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Resolve Stream Source
  useEffect(() => {
    let isCancelled = false;

    async function resolveSource() {
      if (!movie) return;
      setStreamError(null);

      try {
        const indexedDbUrl = await mediaDB.getVideoBlobUrl(movie.id);
        if (indexedDbUrl && !isCancelled) {
          setResolvedStreamUrl(indexedDbUrl);
          return;
        }

        if (movie.file_url) {
          if (movie.file_url.startsWith('blob:')) {
            try {
              const res = await fetch(movie.file_url, { method: 'HEAD' });
              if (res.ok && !isCancelled) {
                setResolvedStreamUrl(movie.file_url);
                return;
              }
            } catch {}
          } else {
            if (!isCancelled) {
              setResolvedStreamUrl(movie.file_url);
              return;
            }
          }
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
    const elem = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
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

  // 7. Download Video File (Real file download to device storage)
  const handleDownload = useCallback(() => {
    setShowSettings(false);
    if (!movie) return;
    downloadEngine.triggerDownload(movie);
    showToast(`Downloading "${movie.title}" to device storage...`);
  }, [movie]);

  // 8. Open Settings Menu Handler
  const handleOpenSettingsMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings((prev) => !prev);
  }, []);

  // 9. Subtitles Toggle shortcut
  const handleToggleSubtitles = useCallback(() => {
    setCurrentSubtitle((prev) => (prev === 'Off' ? 'English [CC]' : 'Off'));
    showToast(currentSubtitle === 'Off' ? 'Subtitles: English [CC]' : 'Subtitles: Off');
  }, [currentSubtitle]);

  // 10. Toolbar Action Handlers
  const handleToggleMyList = useCallback(() => {
    if (!movie) return;
    const inList = storageService.toggleWatchlist(movie.id);
    setIsInMyList(inList);
    showToast(inList ? 'Added to My List' : 'Removed from My List');
    onProgressUpdated?.();
  }, [movie, onProgressUpdated]);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    if (!isLiked) setIsDisliked(false);
    showToast(!isLiked ? 'Marked as Liked' : 'Like removed');
  }, [isLiked]);

  const handleDislike = useCallback(() => {
    setIsDisliked((prev) => !prev);
    if (!isDisliked) setIsLiked(false);
    showToast(!isDisliked ? 'Marked as Disliked' : 'Dislike removed');
  }, [isDisliked]);

  const handleShare = useCallback(() => {
    if (navigator.share && movie) {
      navigator.share({
        title: movie.title,
        text: `Watch ${movie.title} on Sakanet Cinema`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    }
  }, [movie]);

  const handleReport = useCallback(() => {
    setShowSettings(false);
    showToast('Feedback & issue report submitted to administrator.');
  }, []);

  // Keyboard Shortcuts Listener
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
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
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
    if (resolvedStreamUrl !== FALLBACK_STREAM && resolvedStreamUrl !== SECONDARY_STREAM) {
      setResolvedStreamUrl(FALLBACK_STREAM);
      setStreamError(null);
    } else if (resolvedStreamUrl === FALLBACK_STREAM) {
      setResolvedStreamUrl(SECONDARY_STREAM);
      setStreamError(null);
    } else {
      setStreamError('Playback failed. Please check network connection or master video file.');
    }
  };

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
  const availableSubtitles = movie.subtitles || ['English [CC]', 'Spanish', 'French'];
  const availableAudioTracks = movie.audio_tracks || [
    'Default (Stereo)',
    'English [Dolby Atmos 5.1]',
    'Original Soundtrack',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-none bg-black overflow-hidden select-none font-sans flex items-center justify-center"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2">
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
            onWaiting={() => {}}
            onPlaying={() => {}}
            onError={handleVideoError}
            onEnded={() => {
              setIsPlaying(false);
              storageService.clearWatchProgress(movie.id);
              onProgressUpdated?.();
            }}
          />
        ) : null}

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
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        )}

        {/* Comprehensive Controls Overlay Matching Screenshot */}
        <ControlsOverlay
          state={playerState}
          movieTitle={movie.title}
          studioName={movie.director ? `${movie.director} Cinema` : 'Sakanet Originals'}
          categoryTag={movie.genre ? `${movie.genre} Feature` : 'Cinema Movie'}
          currentQuality={currentQuality}
          isSubtitlesActive={currentSubtitle !== 'Off'}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onOpenSettingsMenu={handleOpenSettingsMenu}
          onOpenQualityMenu={handleOpenSettingsMenu}
          onToggleSubtitles={handleToggleSubtitles}
          onToggleFullscreen={toggleFullscreen}
          onClose={handleCloseWithSave}
          onNextEpisode={() => {
            showToast('Starting next title...');
            handleSeek(0);
          }}
          onToggleMyList={handleToggleMyList}
          isInMyList={isInMyList}
          onLike={handleLike}
          isLiked={isLiked}
          onDislike={handleDislike}
          isDisliked={isDisliked}
          onShare={handleShare}
        />

        {/* Floating Settings Flyout Menu Matching Screenshot Options */}
        {showSettings && (
          <SettingsMenu
            onClose={() => setShowSettings(false)}
            currentQuality={currentQuality}
            availableQualities={availableQualities}
            onQualityChange={(q) => {
              setCurrentQuality(q);
              showToast(`Quality set to ${q}`);
            }}
            currentSpeed={playbackSpeed}
            onSpeedChange={(speed) => {
              setPlaybackSpeed(speed);
              if (videoRef.current) videoRef.current.playbackRate = speed;
              showToast(`Speed set to ${speed}x`);
            }}
            currentSubtitle={currentSubtitle}
            availableSubtitles={availableSubtitles}
            onSubtitleChange={(sub) => {
              setCurrentSubtitle(sub);
              showToast(`Subtitles: ${sub}`);
            }}
            currentAudioTrack={currentAudioTrack}
            availableAudioTracks={availableAudioTracks}
            onAudioTrackChange={(trk) => {
              setCurrentAudioTrack(trk);
              showToast(`Audio track: ${trk}`);
            }}
            isPiPEnabled={false}
            onTogglePiP={handleTogglePiP}
            onDownload={handleDownload}
            onReport={handleReport}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayerContainer;
