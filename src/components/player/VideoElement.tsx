import React, { forwardRef } from 'react';

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
    // Only render video element when a non-empty streamUrl is provided
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
        controls={false}
        disablePictureInPicture={false}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onError={onError}
        onEnded={onEnded}
        className="w-full h-full object-contain pointer-events-none select-none bg-black"
      >
        {streamUrl && <source src={streamUrl} type="video/mp4" />}
        {fallbackStreamUrl && fallbackStreamUrl !== streamUrl && (
          <source src={fallbackStreamUrl} type="video/mp4" />
        )}
        Your browser does not support HTML5 video streaming.
      </video>
    );
  }
);

VideoElement.displayName = 'VideoElement';
