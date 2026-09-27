export type DownloadPermission = 'free' | 'premium' | 'vip';

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  secondary_genre?: string;
  release_year: number;
  duration_minutes: number;
  rating: number; // e.g. 4.8
  review_count: number;
  file_url: string; // streaming source
  thumbnail_url: string; // poster portrait
  banner_url: string; // wide hero/landscape
  download_permission: DownloadPermission;
  file_size_mb: number;
  is_active: boolean; // if false, hidden from live feed
  is_featured?: boolean;
  director: string;
  cast: string[];
  video_qualities: ('4K UHD' | '1080p FHD' | '720p HD' | '480p SD')[];
  audio_tracks: string[];
  subtitles: string[];
  created_at: string;
}

export interface UserReview {
  id: string;
  movie_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export type DownloadStatus = 'idle' | 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';

export interface DownloadItem {
  id: string;
  movie_id: string;
  movie_title: string;
  thumbnail_url: string;
  file_size_mb: number;
  downloaded_mb: number;
  received_bytes?: number;
  total_bytes?: number;
  blob_url?: string;
  status: DownloadStatus;
  progress: number; // 0 - 100
  current_chunk: number; // e.g. 1
  total_chunks: number; // e.g. 4
  download_speed_mbps: number;
  encrypted_key: string;
  local_storage_uri: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: 'user' | 'admin';
  tier: 'Free' | 'Premium VIP';
  download_quota_used_mb: number;
  download_quota_limit_mb: number;
  watchlist: string[]; // movie IDs
}

export interface WatchProgress {
  movieId: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  lastWatchedAt: number;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  isFullscreen: boolean;
  isTheaterMode?: boolean;
}
