import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import { Movie } from '../types';
import { storageService } from '../services/storageService';

interface MiniPlayerProps {
  movie: Movie;
  initialTime: number;
  initialIsPlaying: boolean;
  onExpand: (currentTime: number) => void;
  onClose: () => void;
  onProgressUpdated?: () => void;
}

const getFallbackStream = (m: Movie) => {
  const genre = (m.genre || '').toLowerCase();
  if (genre.includes('sci-fi') || genre.includes('action') || genre.includes('thriller')) {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  }
  if (genre.includes('drama') || genre.includes('adventure') || genre.includes('crime')) {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
  }
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  movie,
  initialTime,
  initialIsPlaying,
  onExpand,
  onClose,
  onProgressUpdated,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackStream = getFallbackStream(movie);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>(() => {
    if (movie.file_url && !movie.file_url.startsWith('blob:')) {
      return movie.file_url;
    }
    return movie.file_url || fallbackStream;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(initialIsPlaying);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      if (initialIsPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      storageService.saveWatchProgress(movie.id, videoRef.current.currentTime, videoRef.current.duration || movie.duration_minutes * 60);
      onProgressUpdated?.();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);
    storageService.saveWatchProgress(movie.id, cur, videoRef.current.duration || movie.duration_minutes * 60);
    onProgressUpdated?.();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      storageService.saveWatchProgress(movie.id, videoRef.current.currentTime, videoRef.current.duration || movie.duration_minutes * 60);
      onProgressUpdated?.();
    }
    onClose();
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={() => onExpand(currentTime)}
      className="fixed bottom-5 right-5 z-50 w-72 sm:w-88 aspect-video bg-black rounded-xl overflow-hidden border border-red-600/40 shadow-2xl shadow-black/90 cursor-pointer group select-none transition-all duration-200 hover:border-red-500 hover:scale-[1.02]"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        key={currentStreamUrl}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          if (currentStreamUrl !== fallbackStream) {
            setCurrentStreamUrl(fallbackStream);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.currentTime = initialTime;
            if (initialIsPlaying) {
              videoRef.current.play().catch(() => {});
            }
          }
        }}
        className="w-full h-full object-cover"
      >
        {currentStreamUrl && <source src={currentStreamUrl} type="video/mp4" />}
        {currentStreamUrl !== fallbackStream && <source src={fallbackStream} type="video/mp4" />}
      </video>

      {/* Floating Header Scrim with Title & Close */}
      <div
        className={`absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between text-xs text-white transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
        }`}
      >
        <span className="font-semibold truncate max-w-[190px] drop-shadow-sm text-[11px]">
          {movie.title}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand(currentTime);
            }}
            title="Expand to Fullscreen"
            className="p-1 rounded bg-black/60 hover:bg-white/20 text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            title="Close Mini-Player"
            className="p-1 rounded bg-black/60 hover:bg-red-600 text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Controls (Visible on hover or when paused) */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Bottom Bar: Mute and Progress */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-300 mb-1">
          <button
            onClick={toggleMute}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <span className="font-mono text-zinc-400">Picture-in-Picture</span>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
