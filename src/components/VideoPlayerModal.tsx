import React from 'react';
import { VideoPlayerContainer } from './player/VideoPlayerContainer';
import { Movie } from '../types';

interface VideoPlayerModalProps {
  movie: Movie | null;
  onClose: () => void;
  onEnterMiniPlayer?: (movie: Movie, currentTime: number, isPlaying: boolean) => void;
  initialTime?: number;
  isOfflinePlayback?: boolean;
  onProgressUpdated?: () => void;
  allMovies?: Movie[];
  onSelectMovie?: (m: Movie, startTime?: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = (props) => {
  return <VideoPlayerContainer {...props} />;
};
