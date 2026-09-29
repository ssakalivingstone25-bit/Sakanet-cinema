import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Download,
  Star,
  Plus,
  Check,
  Pause,
  RotateCw,
  HardDrive,
  Users,
  Film,
  Sparkles,
  MessageSquare,
  Shield,
  Send,
} from 'lucide-react';
import { Movie, DownloadItem, UserReview } from '../types';
import { storageService } from '../services/storageService';
import { downloadEngine } from '../services/downloadEngine';
import {
  saveReviewToFirestore,
  subscribeToMovieReviews,
  updateMovieRatingInFirestore,
} from '../services/firebase';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (movie: Movie, startTime?: number) => void;
  onToggleWatchlist: (movieId: string) => void;
  isInWatchlist: boolean;
  downloadItem?: DownloadItem;
  onReviewAdded: () => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  onClose,
  onPlay,
  onToggleWatchlist,
  isInWatchlist,
  downloadItem,
  onReviewAdded,
}) => {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'download_worker'>('overview');
  const [savedProgress, setSavedProgress] = useState<number>(0);

  useEffect(() => {
    if (movie) {
      // Local cache fallback
      const initialLocal = storageService.getReviews(movie.id);
      setReviews(initialLocal);
      setUserComment('');
      setReviewSuccess(false);
      const prog = storageService.getWatchProgressForMovie(movie.id);
      setSavedProgress(prog ? prog.currentTime : 0);

      // Real-time Firestore review synchronization for genuine ratings
      const unsubscribe = subscribeToMovieReviews(movie.id, (firestoreReviews) => {
        if (firestoreReviews && firestoreReviews.length > 0) {
          // Merge reviews ensuring unique IDs
          const map = new Map<string, UserReview>();
          initialLocal.forEach((r) => map.set(r.id, r));
          firestoreReviews.forEach((r: any) => {
            map.set(r.id, {
              id: r.id,
              movie_id: r.movie_id,
              user_name: r.user_name || 'Verified Viewer',
              user_email: r.user_email || '',
              rating: Number(r.rating) || 5,
              comment: r.comment || '',
              created_at: r.created_at || new Date().toISOString(),
            });
          });
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setReviews(combined);

          // Calculate real average
          const sum = combined.reduce((acc, curr) => acc + curr.rating, 0);
          const realAvg = Number((sum / combined.length).toFixed(1));
          movie.rating = realAvg;
          movie.review_count = combined.length;
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [movie]);

  if (!movie) return null;

  const isCompleted = downloadItem?.status === 'completed';
  const isDownloading = downloadItem?.status === 'downloading';
  const isPaused = downloadItem?.status === 'paused';

  const handleStartDownload = () => {
    downloadEngine.triggerDownload(movie);
  };

  const handlePauseResume = () => {
    if (!downloadItem) return;
    if (isDownloading) {
      downloadEngine.pause(downloadItem.id);
    } else if (isPaused) {
      downloadEngine.resume(downloadItem.id);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim() || !movie) return;

    setSubmittingReview(true);
    // 1. Save to local storage
    const newRev = storageService.addReview(movie.id, userRating, userComment);
    const updatedReviews = [newRev, ...reviews.filter((r) => r.id !== newRev.id)];
    setReviews(updatedReviews);

    // 2. Real-time compute actual rating
    const sum = updatedReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const realAvg = Number((sum / updatedReviews.length).toFixed(1));
    movie.rating = realAvg;
    movie.review_count = updatedReviews.length;

    // 3. Persist to Firestore database in real-time
    saveReviewToFirestore(newRev);
    updateMovieRatingInFirestore(movie.id, realAvg, updatedReviews.length);

    setUserComment('');
    setReviewSuccess(true);
    setSubmittingReview(false);
    onReviewAdded();

    setTimeout(() => {
      setReviewSuccess(false);
    }, 4000);
  };

  // Rating distribution calculations
  const totalReviews = reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Backdrop Dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#121215] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 my-auto text-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center border border-white/15 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero Area */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
          <img
            src={movie.banner_url || movie.thumbnail_url}
            alt={movie.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121215] via-transparent to-transparent w-2/3" />

          {/* Floating Action Header Content */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500 mb-1">
                <span>{movie.genre}</span>
                {movie.secondary_genre && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span>{movie.secondary_genre}</span>
                  </>
                )}
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{movie.release_year}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
                {movie.title}
              </h2>
            </div>

            {/* Play & Download CTAs */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onPlay(movie, savedProgress > 5 ? savedProgress : 0)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg shadow-red-700/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {savedProgress > 5
                    ? `Resume (${Math.floor(savedProgress / 60)}m)`
                    : 'Stream Film'}
                </span>
              </button>

              <button
                onClick={handleStartDownload}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-all ${
                  isCompleted
                    ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                    : isDownloading
                    ? 'border-amber-500/60 bg-amber-950/60 text-amber-300'
                    : 'border-white/20 bg-zinc-900/80 text-white hover:border-red-500'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>
                  {isCompleted
                    ? 'Offline Ready'
                    : isDownloading
                    ? `${downloadItem?.progress}%`
                    : 'Download'}
                </span>
              </button>

              <button
                onClick={() => onToggleWatchlist(movie.id)}
                title="My List"
                className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                  isInWatchlist
                    ? 'border-red-500 bg-red-600/30 text-white'
                    : 'border-white/20 bg-zinc-900/80 text-zinc-300 hover:border-white'
                }`}
              >
                {isInWatchlist ? <Check className="w-4 h-4 text-red-400" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-white/10 bg-[#0d0d10] text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-red-600 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-red-600 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>User Ratings & Reviews</span>
            <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/40 px-1.5 py-0.2 rounded font-mono">
              {movie.rating.toFixed(1)}★ ({totalReviews})
            </span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 max-h-[55vh] overflow-y-auto cinema-scrollbar">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Synopsis & Qualities */}
              <div className="md:col-span-2 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Synopsis
                  </h3>
                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                    {movie.synopsis}
                  </p>
                </div>

                {/* Technical Video & Audio Specs */}
                <div className="bg-zinc-900/60 border border-white/5 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" /> High-Fidelity Audio & Video Delivery
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Stream Encodings</span>
                      <span className="text-zinc-200 font-medium">
                        {movie.video_qualities.join(', ')} (H.265 / HEVC)
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Audio Channels</span>
                      <span className="text-zinc-200 font-medium">
                        {movie.audio_tracks.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Subtitles</span>
                      <span className="text-zinc-200 font-medium">
                        {movie.subtitles.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">CDN & Hosting</span>
                      <span className="text-zinc-200 font-medium">
                        Cloudflare R2 / AWS S3 Distributed CDN
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Cast, VJ Name, File Quota */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/10 md:pl-6 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">VJ</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/40 text-red-300 font-bold text-sm">
                    <span>{movie.vj_name || movie.director || 'VJ Junior'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Starring Cast</span>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.cast.map((actor, idx) => (
                      <span
                        key={idx}
                        className="bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded text-[11px]"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Runtime & Size</span>
                  <span className="text-zinc-300 font-mono">
                    {movie.duration_minutes} min · {(movie.file_size_mb / 1024).toFixed(2)} GB
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Download Permission</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                      movie.download_permission === 'vip'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : movie.download_permission === 'premium'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {movie.download_permission} Tier
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Rating Metric Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-zinc-900/60 border border-white/5 rounded-xl p-5 items-center">
                <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0">
                  <span className="text-5xl font-black font-display text-white tracking-tight">
                    {movie.rating.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-1 my-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(movie.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-400">
                    Based on {totalReviews} audience ratings
                  </span>
                </div>

                {/* Rating Distribution Bars */}
                <div className="sm:col-span-2 space-y-1.5 text-xs">
                  {ratingCounts.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-6 text-right text-zinc-400 font-mono">{star}★</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-zinc-500 text-right font-mono">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive 5-Star Rating Submission Form */}
              <form
                onSubmit={handleRatingSubmit}
                className="bg-[#18181d] border border-red-900/30 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-red-500 fill-red-500" />
                    Rate & Review This Title
                  </h4>
                  <span className="text-xs text-zinc-400">Tied directly to your user profile</span>
                </div>

                {/* Interactive Star Picker */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating || userRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                          className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              active ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-sm font-bold text-amber-400 ml-2">
                    {userRating} of 5 Stars
                  </span>
                </div>

                {/* Comment Box */}
                <div>
                  <textarea
                    rows={2}
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="Share your thoughts on the plot, acting, direction, or video fidelity..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {reviewSuccess ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Rating published! Global movie ranking recalculated.
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      Ratings immediately factor into Sakanet Global Catalog Score.
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={!userComment.trim() || submittingReview}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Rating</span>
                  </button>
                </div>
              </form>

              {/* Reviews Feed */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Audience Feedback ({reviews.length})
                </h4>

                {reviews.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    No reviews yet. Be the first to rate this title!
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-zinc-900/40 border border-white/5 rounded-lg p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-bold text-white text-[10px]">
                            {rev.user_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-zinc-200">{rev.user_name}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400 font-bold">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed pl-8">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
