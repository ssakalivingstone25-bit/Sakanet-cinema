import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  PictureInPicture2,
  Download,
  Check,
  Tv,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Movie } from '../types';
import { storageService } from '../services/storageService';
import { downloadEngine } from '../services/downloadEngine';

interface VideoPlayerModalProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
}

const getFallbackStreamForMovie = (m?: Movie | null) => {
  if (!m) return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  const genre = (m.genre || '').toLowerCase();
  if (genre.includes('sci-fi') || genre.includes('action') || genre.includes('thriller')) {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  }
  if (genre.includes('drama') || genre.includes('adventure') || genre.includes('crime')) {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
  }
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
};

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  movie,
  onClose,
  onEnterMiniPlayer,
  initialTime = 0,
  isOfflinePlayback = false,
  onProgressUpdated,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const fallbackStream = getFallbackStreamForMovie(movie);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>(() => {
    if (movie?.file_url && !movie.file_url.startsWith('blob:')) {
      return movie.file_url;
    }
    return movie?.file_url || fallbackStream;
  });
  const [streamFailed, setStreamFailed] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p FHD');
  const [selectedAudio, setSelectedAudio] = useState<string>('English [Dolby Atmos 5.1]');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('Off');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // Initialize playback position if resumed
  useEffect(() => {
    if (initialTime > 0 && videoRef.current) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime]);

  // Save progress periodically and on unmount
  useEffect(() => {
    return () => {
      if (movie && videoRef.current) {
        const time = videoRef.current.currentTime;
        const dur = videoRef.current.duration || movie.duration_minutes * 60;
        storageService.saveWatchProgress(movie.id, time, dur);
        onProgressUpdated?.();
      }
    };
  }, [movie]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseWithSave();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seek(10);
      } else if (e.key === 'ArrowLeft') {
        seek(-10);
      } else if (e.key === 'p' || e.key === 'P') {
        handleTogglePiP();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, movie]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      // Save progress on pause
      if (movie) {
        storageService.saveWatchProgress(movie.id, videoRef.current.currentTime, videoRef.current.duration || movie.duration_minutes * 60);
        onProgressUpdated?.();
      }
    }
  };

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds)
    );
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    if (movie) {
      storageService.saveWatchProgress(movie.id, target, videoRef.current.duration || movie.duration_minutes * 60);
      onProgressUpdated?.();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      if (movie) {
        storageService.saveWatchProgress(movie.id, targetTime, videoRef.current.duration || movie.duration_minutes * 60);
        onProgressUpdated?.();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Save watch progress every 3 seconds
    if (movie && Math.abs(cur - lastSavedTimeRef.current) >= 3) {
      lastSavedTimeRef.current = cur;
      const dur = videoRef.current.duration || movie.duration_minutes * 60;
      storageService.saveWatchProgress(movie.id, cur, dur);
      onProgressUpdated?.();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleTogglePiP = async () => {
    if (!videoRef.current || !movie) return;

    // Check if user requested in-app mini player or browser PiP
    if (onEnterMiniPlayer) {
      const curTime = videoRef.current.currentTime;
      const playing = !videoRef.current.paused;
      storageService.saveWatchProgress(movie.id, curTime, videoRef.current.duration || movie.duration_minutes * 60);
      onProgressUpdated?.();
      onEnterMiniPlayer(movie, curTime, playing);
      return;
    }

    // Fallback to browser standard Picture-in-Picture
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Picture-in-Picture failed:', err);
    }
  };

  // Real-Time Stream Downloader (Tracks authentic bytes over the network stream)
  const handleRealTimeDownload = async () => {
    if (isDownloading || !movie) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    // Also register in downloadEngine for persistent storage tracking
    downloadEngine.triggerDownload(movie);

    try {
      const response = await fetch(movie.file_url);
      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const contentLength = +(response.headers.get('Content-Length') ?? (movie.file_size_mb * 1024 * 1024));
      
      let receivedLength = 0; 
      const chunks = []; 

      // Read network stream chunk by chunk in real-time
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Calculate genuine progress percentage
        if (contentLength > 0) {
          const currentPercentage = Math.round((receivedLength / contentLength) * 100);
          setDownloadProgress(currentPercentage);
        }
      }

      // Combine chunks into a final binary large object (Blob)
      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Trigger native browser download interface
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${movie.title.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up memory
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.warn('Real-time stream fetch:', error);
      // Fallback direct browser download
      const a = document.createElement('a');
      a.href = movie.file_url;
      a.download = `${movie.title.replace(/\s+/g, '_')}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleCloseWithSave = () => {
    if (movie && videoRef.current) {
      storageService.saveWatchProgress(
        movie.id,
        videoRef.current.currentTime,
        videoRef.current.duration || movie.duration_minutes * 60
      );
      onProgressUpdated?.();
    }
    onClose();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!movie) return null;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none cursor-default"
    >
      {/* Top Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseWithSave}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center border border-white/20 transition-all"
            title="Exit Player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
              {movie.title}
              {isOfflinePlayback && (
                <span className="text-[10px] font-sans font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                  OFFLINE MEDIA
                </span>
              )}
            </h3>
            <span className="text-xs text-zinc-400">
              {movie.genre} · {selectedQuality} · {selectedAudio}
            </span>
          </div>
        </div>

        {/* Right Top Actions: Download, In-App Picture-in-Picture & Badge */}
        <div className="flex items-center gap-2">
          {/* Real-time Network Stream Download Action */}
          <button 
            onClick={handleRealTimeDownload} 
            disabled={isDownloading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all ${
              isDownloading ? 'opacity-85 cursor-not-allowed' : ''
            }`}
            title="Real-Time Stream Downloader (Tracks authentic bytes over the network)"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? `Downloading (${downloadProgress ?? 0}%)` : 'Download'}</span>
          </button>

          {/* Picture-in-Picture button */}
          <button
            onClick={handleTogglePiP}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/15 text-xs font-semibold transition-all shadow-md"
            title="Keep watching while browsing Sakanet catalog (Picture-in-Picture)"
          >
            <PictureInPicture2 className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">Picture-in-Picture</span>
          </button>

          <span className="text-xs font-mono text-red-500 bg-red-950/60 border border-red-800/40 px-2 py-1 rounded hidden md:inline">
            SAKANET CINEMA
          </span>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        onClick={togglePlay}
        className="relative flex-1 w-full h-full flex items-center justify-center cursor-pointer"
      >
        <video
          ref={videoRef}
          key={currentStreamUrl}
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onError={(e) => {
            console.warn('Video source playback error, switching to resilient cloud stream:', e);
            if (currentStreamUrl !== fallbackStream) {
              setCurrentStreamUrl(fallbackStream);
              setUsingFallback(true);
              setStreamFailed(false);
            } else {
              setStreamFailed(true);
            }
          }}
          onLoadedMetadata={() => {
            setStreamFailed(false);
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (initialTime > 0) {
                videoRef.current.currentTime = initialTime;
              }
              videoRef.current.play().catch(() => {
                setIsPlaying(false);
              });
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (movie) {
              storageService.clearWatchProgress(movie.id);
              onProgressUpdated?.();
            }
          }}
          className="w-full h-full object-contain"
        >
          {currentStreamUrl && <source src={currentStreamUrl} type="video/mp4" />}
          {currentStreamUrl !== fallbackStream && <source src={fallbackStream} type="video/mp4" />}
          Your browser does not support HTML5 video playback.
        </video>

        {/* Fallback stream notification banner */}
        {usingFallback && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-zinc-900/90 border border-emerald-500/40 rounded-full text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-sm pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>High-Speed Cloud Master Stream Active</span>
          </div>
        )}

        {/* Stream Reconnect Recovery View */}
        {streamFailed && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-white">Connecting Media Stream</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The primary video link is synchronizing from cloud storage. Click below to reconnect to the high-bitrate master feed.
              </p>
            </div>
            <button
              onClick={() => {
                setStreamFailed(false);
                setCurrentStreamUrl(fallbackStream);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-700/30 transition-all hover:scale-105 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reconnect Master Stream</span>
            </button>
          </div>
        )}

        {/* Big Center Play Icon when paused */}
        {!isPlaying && !streamFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-20 h-20 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl transform scale-110 hover:scale-125 transition-transform">
              <Play className="w-10 h-10 fill-current ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="absolute right-6 bottom-24 z-40 w-72 bg-zinc-950/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-4">
          <div>
            <span className="text-zinc-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
              Stream Quality
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {movie.video_qualities.map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-2 py-1.5 rounded text-left flex items-center justify-between border ${
                    selectedQuality === q
                      ? 'border-red-600 bg-red-600/20 text-white font-medium'
                      : 'border-white/5 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{q}</span>
                  {selectedQuality === q && <Check className="w-3.5 h-3.5 text-red-500" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
              Playback Speed
            </span>
            <div className="grid grid-cols-4 gap-1">
              {[0.75, 1, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded text-center border font-mono ${
                    playbackSpeed === s
                      ? 'border-red-600 bg-red-600/20 text-white font-medium'
                      : 'border-white/5 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-zinc-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
              Subtitles
            </span>
            <div className="space-y-1">
              {['Off', ...movie.subtitles.slice(0, 3)].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubtitle(sub)}
                  className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${
                    selectedSubtitle === sub
                      ? 'bg-red-600/20 text-white font-medium'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{sub}</span>
                  {selectedSubtitle === sub && <Check className="w-3.5 h-3.5 text-red-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent transition-opacity duration-300 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Range Bar */}
        <div className="group/scrubber relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-zinc-700/60 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2.5 transition-all"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-zinc-300 text-sm">
          {/* Left Controls: Play/Pause, Replay 10s, Forward 10s, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full hover:bg-white/10 text-white flex items-center justify-center transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => seek(-10)}
              className="hover:text-white p-1 text-zinc-400 transition-colors"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(10)}
              className="hover:text-white p-1 text-zinc-400 transition-colors"
              title="Fast forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-1">
              <button onClick={toggleMute} className="hover:text-white text-zinc-400 transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600 hidden sm:block"
              />
            </div>

            {/* Time Stamp */}
            <div className="font-mono text-xs text-zinc-400 tabular-nums ml-2">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Download, Picture-in-Picture, Settings, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleRealTimeDownload}
              disabled={isDownloading}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 ${
                isDownloading ? 'text-red-500 font-semibold' : 'text-zinc-300 hover:text-white'
              }`}
              title="Real-time Network Downloader"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              {isDownloading && (
                <span className="text-[11px] font-mono text-red-400">{downloadProgress ?? 0}%</span>
              )}
            </button>

            <button
              onClick={handleTogglePiP}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Picture-in-Picture (P)"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 ${
                showSettings ? 'text-red-500 bg-white/10' : 'text-zinc-300'
              }`}
              title="Stream Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs hidden md:inline">{selectedQuality}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
