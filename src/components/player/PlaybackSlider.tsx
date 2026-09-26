import React, { useRef, useState, useEffect } from 'react';

interface PlaybackSliderProps {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  onSeek: (time: number) => void;
  formatTime: (secs: number) => string;
}

export const PlaybackSlider: React.FC<PlaybackSliderProps> = ({
  currentTime,
  duration,
  bufferedEnd,
  onSeek,
  formatTime,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updateSeek(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);

    if (isScrubbing) {
      updateSeek(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const updateSeek = (clientX: number) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  };

  return (
    <div
      ref={progressBarRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-4 sm:h-5 flex items-center cursor-pointer group select-none touch-none"
    >
      {/* Time hover tooltip */}
      {hoverPosition !== null && hoverTime !== null && (
        <div
          className="absolute -top-7 transform -translate-x-1/2 pointer-events-none z-30"
          style={{ left: `${hoverPosition}%` }}
        >
          <div className="bg-[#18181b] border border-white/20 text-white font-mono text-[11px] px-2 py-0.5 rounded shadow-lg">
            {formatTime(hoverTime)}
          </div>
        </div>
      )}

      {/* Track Base */}
      <div className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden relative transition-all group-hover:h-2.5">
        {/* Buffered stream indicator */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-white/35 rounded-full transition-all duration-200"
          style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
        />

        {/* Hover ghost scrubber */}
        {hoverPosition !== null && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full pointer-events-none"
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Active playback progress */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 to-red-500 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, playedPercent))}%` }}
        />
      </div>

      {/* Scrubber thumb knob */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-600 border-2 border-white rounded-full shadow-lg transition-transform group-hover:scale-125"
        style={{ left: `${Math.min(100, Math.max(0, playedPercent))}%` }}
      />
    </div>
  );
};
