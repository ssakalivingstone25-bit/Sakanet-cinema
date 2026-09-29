import React, { forwardRef, useEffect } from 'react';

interface VideoElementProps {
  streamUrl: string;
  fallbackStreamUrl?: string;
  posterUrl?: string;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onWaiting: () => void;
  onPlaying: () => void;
  onError: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onEnded: () => void;
}

export const VideoElement = forwardRef<HTMLVideoElement, VideoElementProps>(
  (
    {
      streamUrl,
      fallbackStreamUrl,
      posterUrl,
      playbackSpeed,
      volume,
      isMuted,
      onTimeUpdate,
      onLoadedMetadata,
      onWaiting,
      onPlaying,
      onError,
      onEnded,
    },
    ref
  ) => {
    // Keep volume, muted, and speed synced directly to DOM element
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.volume = volume;
        ref.current.muted = isMuted;
        ref.current.playbackRate = playbackSpeed;
      }
    }, [ref, volume, isMuted, playbackSpeed]);

    if (!streamUrl) return null;

    return (
      <video
        ref={ref}
        src={streamUrl}
        poster={posterUrl}
        autoPlay
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        controls={false}
        disablePictureInPicture={false}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onError={onError}
        onEnded={onEnded}
        className="w-full h-full object-contain pointer-events-none select-none bg-black"
      />
    );
  }
);

VideoElement.displayName = 'VideoElement';
