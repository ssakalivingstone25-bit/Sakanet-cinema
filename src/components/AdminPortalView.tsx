import React, { useState, useRef } from 'react';
import {
  Film,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  HardDrive,
  FileVideo,
  Upload,
  AlertTriangle,
  X,
  Play,
  CheckSquare,
  Square,
  Send,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Movie, DownloadPermission } from '../types';
import { storageService } from '../services/storageService';
import { mediaDB } from '../services/mediaDB';
import {
  saveMovieToFirestore,
  deleteMovieFromFirestore,
  deleteMultipleMoviesFromFirestore,
} from '../services/firebase';

interface AdminPortalViewProps {
  movies: Movie[];
  onMoviesChanged: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  movies,
  onMoviesChanged,
  onSelectMovie,
}) => {
  // Navigation between Pipeline Tabs
  const [pipelineTab, setPipelineTab] = useState<'awaiting' | 'published'>('awaiting');
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-selection state for batch operations
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<string>>(new Set());

  // In-App Custom Confirmation Modal state (NO window.confirm)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    movieIds: string[];
    titles: string[];
  } | null>(null);

  // Description / Edit Modal state
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form Fields for Description Editing
  const [formTitle, setFormTitle] = useState('');
  const [formSynopsis, setFormSynopsis] = useState('');
  const [formGenre, setFormGenre] = useState('Action');
  const [formSecondaryGenre, setFormSecondaryGenre] = useState('');
  const [formReleaseYear, setFormReleaseYear] = useState(new Date().getFullYear());
  const [formDurationMinutes, setFormDurationMinutes] = useState(120);
  const [formDirector, setFormDirector] = useState('Livingstone Saka');
  const [formCast, setFormCast] = useState('Lead Actor, Supporting Cast');
  const [formDownloadPermission, setFormDownloadPermission] =
    useState<DownloadPermission>('free');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formPosterUrl, setFormPosterUrl] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Upload State
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [pendingPosterDataUrl, setPendingPosterDataUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Movies separated by pipeline stage
  const awaitingMovies = movies.filter((m) => !m.is_active);
  const publishedMovies = movies.filter((m) => m.is_active);

  const displayedList = (pipelineTab === 'awaiting' ? awaitingMovies : publishedMovies).filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.director.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle direct file upload from device
  const handleDeviceVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadProgressMsg('Reading video file from device...');

    try {
      const fileNameClean = file.name.replace(/\.[^/.]+$/, '');
      const fileSizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
      const objectUrl = URL.createObjectURL(file);

      setUploadProgressMsg('Analyzing video duration & generating poster snapshot...');

      // Load temporary video to detect runtime and extract poster frame
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;

      const durationMinutes = await new Promise<number>((resolve) => {
        tempVideo.onloadedmetadata = () => {
          const mins = Math.max(1, Math.round(tempVideo.duration / 60));
          resolve(mins);
        };
        tempVideo.onerror = () => resolve(110);
      });

      // Capture a snapshot frame at 1s for poster thumbnail
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        tempVideo.currentTime = Math.min(2, (tempVideo.duration || 10) / 2);
        tempVideo.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempVideo, 0, 0, 480, 720);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve(dataUrl);
              return;
            }
          } catch (err) {
            console.warn('Canvas poster capture fallback:', err);
          }
          resolve(
            pendingPosterDataUrl ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80'
          );
        };
        tempVideo.onerror = () => {
          resolve(
            pendingPosterDataUrl ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80'
          );
        };
      });

      // Create new movie in "Awaiting Publication" state
      const finalPoster = pendingPosterDataUrl || thumbnailDataUrl;
      const newMovie = storageService.addMovie({
        title: fileNameClean,
        synopsis: 'Awaiting administrator plot description and synopsis.',
        genre: 'Action',
        secondary_genre: 'Cinema Master',
        release_year: new Date().getFullYear(),
        duration_minutes: durationMinutes,
        director: 'Livingstone Saka',
        cast: ['Lead Performer', 'Supporting Cast'],
        file_url: objectUrl,
        thumbnail_url: finalPoster,
        banner_url: finalPoster,
        download_permission: 'free',
        file_size_mb: fileSizeMb,
        is_active: false, // In Awaiting Publication
        is_featured: false,
        video_qualities: ['4K UHD', '1080p FHD', '720p HD'],
        audio_tracks: ['English [Dolby Atmos 5.1]'],
        subtitles: ['English [CC]'],
      });

      // Persist the actual binary video file into IndexedDB so it stays playable permanently
      await mediaDB.saveVideoBlob(newMovie.id, file);

      // Reset pending custom poster
      setPendingPosterDataUrl(null);

      saveMovieToFirestore(newMovie);
      onMoviesChanged();
      setPipelineTab('awaiting');
      showToast(`"${fileNameClean}" moved to Awaiting Publication queue`);

      // Open description editor right away for the admin
      openEditModal(newMovie);
    } catch (err) {
      console.error('File Ingestion error:', err);
      showToast('Error uploading video file from device');
    } finally {
      setIsProcessingFile(false);
      setUploadProgressMsg('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Handle custom poster image from device
  const handleDevicePosterSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPendingPosterDataUrl(dataUrl);
      showToast('Custom poster loaded. It will apply to your uploaded movie.');
    };
    reader.readAsDataURL(file);
  };

  // Open description modal for a movie
  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    setFormTitle(movie.title);
    setFormSynopsis(movie.synopsis);
    setFormGenre(movie.genre);
    setFormSecondaryGenre(movie.secondary_genre || '');
    setFormReleaseYear(movie.release_year);
    setFormDurationMinutes(movie.duration_minutes);
    setFormDirector(movie.director);
    setFormCast(movie.cast.join(', '));
    setFormDownloadPermission(movie.download_permission);
    setFormIsFeatured(!!movie.is_featured);
    setFormVideoUrl(movie.file_url || '');
    setFormPosterUrl(movie.thumbnail_url || '');
    setShowEditModal(true);
  };

  const handleSaveDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie || !formTitle.trim()) return;

    const castArray = formCast
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const updated = storageService.updateMovie(editingMovie.id, {
      title: formTitle.trim(),
      synopsis: formSynopsis.trim(),
      genre: formGenre,
      secondary_genre: formSecondaryGenre.trim(),
      release_year: formReleaseYear,
      duration_minutes: formDurationMinutes,
      director: formDirector.trim(),
      cast: castArray.length ? castArray : ['Cast Member'],
      download_permission: formDownloadPermission,
      is_featured: formIsFeatured,
      file_url: formVideoUrl.trim() || editingMovie.file_url,
      thumbnail_url: formPosterUrl.trim() || editingMovie.thumbnail_url,
      banner_url: formPosterUrl.trim() || editingMovie.banner_url || editingMovie.thumbnail_url,
    });

    if (updated) saveMovieToFirestore(updated);
    onMoviesChanged();
    setShowEditModal(false);
    showToast(`Updated descriptions for "${formTitle}"`);
  };

  // Publish a movie directly to Live Platform
  const handlePublishMovie = (movie: Movie) => {
    const updated = storageService.publishMovie(movie.id);
    if (updated) saveMovieToFirestore(updated);
    onMoviesChanged();
    showToast(`"${movie.title}" is now LIVE on Sakanet!`);
  };

  // Unpublish a movie back to Awaiting
  const handleUnpublishMovie = (movie: Movie) => {
    const updated = storageService.unpublishMovie(movie.id);
    if (updated) saveMovieToFirestore(updated);
    onMoviesChanged();
    showToast(`"${movie.title}" moved back to Awaiting Publication`);
  };

  // Multi-selection helpers
  const toggleSelectMovie = (id: string) => {
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMovieIds.size === displayedList.length && displayedList.length > 0) {
      setSelectedMovieIds(new Set());
    } else {
      setSelectedMovieIds(new Set(displayedList.map((m) => m.id)));
    }
  };

  // Request deletion for single movie
  const triggerSingleDelete = (movie: Movie) => {
    setDeleteConfirmation({
      isOpen: true,
      movieIds: [movie.id],
      titles: [movie.title],
    });
  };

  // Request deletion for all selected movies
  const triggerBulkDelete = () => {
    if (selectedMovieIds.size === 0) return;
    const ids = Array.from(selectedMovieIds);
    const titles = movies.filter((m) => ids.includes(m.id)).map((m) => m.title);
    setDeleteConfirmation({
      isOpen: true,
      movieIds: ids,
      titles,
    });
  };

  // Publish all selected awaiting movies
  const handlePublishSelected = () => {
    if (selectedMovieIds.size === 0) return;
    let count = 0;
    selectedMovieIds.forEach((id) => {
      const updated = storageService.publishMovie(id);
      if (updated) {
        saveMovieToFirestore(updated);
        count++;
      }
    });
    setSelectedMovieIds(new Set());
    onMoviesChanged();
    setPipelineTab('published');
    showToast(`Published ${count} movie(s) to the live platform!`);
  };

  // Confirm and execute permanent deletion (IN-APP MODAL)
  const executeConfirmedDeletion = () => {
    if (!deleteConfirmation) return;

    const { movieIds } = deleteConfirmation;

    // Delete locally
    storageService.deleteMultipleMovies(movieIds);

    // Clean up binary media blobs from IndexedDB
    movieIds.forEach((id) => mediaDB.deleteMedia(id));

    // Delete in Firestore
    deleteMultipleMoviesFromFirestore(movieIds);

    // Clear selection
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      movieIds.forEach((id) => next.delete(id));
      return next;
    });

    onMoviesChanged();
    showToast(`Permanently deleted ${movieIds.length} movie(s)`);
    setDeleteConfirmation(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-zinc-900 border border-red-500/40 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Direct Device Upload Card */}
      <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                Sakanet Ingestion & Admin Portal
              </h1>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Upload video master files directly from your computer or phone. Uploaded movies land in
              the <span className="text-amber-400 font-semibold">Awaiting Publication</span> section
              for plot descriptions and synopsis review before going live on the platform.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Hidden Video File Input */}
            <input
              type="file"
              ref={videoInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/mkv,video/*"
              className="hidden"
              onChange={handleDeviceVideoSelected}
            />

            {/* Hidden Poster Image Input */}
            <input
              type="file"
              ref={posterInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleDevicePosterSelected}
            />

            {/* Upload Video From Device Button */}
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={isProcessingFile}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-700/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessingFile ? 'Processing...' : 'Upload Movie from Device'}</span>
            </button>

            {/* Optional Custom Poster Button */}
            <button
              onClick={() => posterInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
              title="Optionally pick a custom poster art file from your device"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Set Poster Art</span>
            </button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessingFile && (
          <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl flex items-center gap-3 text-xs text-red-200">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{uploadProgressMsg}</span>
          </div>
        )}
      </div>

      {/* Two Pipeline Sections Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Awaiting Publication */}
          <button
            onClick={() => {
              setPipelineTab('awaiting');
              setSelectedMovieIds(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              pipelineTab === 'awaiting'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Awaiting Publication (Descriptions & Review)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                pipelineTab === 'awaiting'
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {awaitingMovies.length}
            </span>
          </button>

          {/* Tab 2: Live on Platform */}
          <button
            onClick={() => {
              setPipelineTab('published');
              setSelectedMovieIds(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              pipelineTab === 'published'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live on Platform</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                pipelineTab === 'published'
                  ? 'bg-emerald-400 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {publishedMovies.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${pipelineTab === 'awaiting' ? 'awaiting' : 'published'} titles...`}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Batch Selection Action Bar (Appears when 1+ movies selected) */}
      {selectedMovieIds.size > 0 && (
        <div className="bg-red-950/70 border border-red-800/50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-white">
              {selectedMovieIds.size} movie{selectedMovieIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pipelineTab === 'awaiting' && (
              <button
                onClick={handlePublishSelected}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Selected ({selectedMovieIds.size})</span>
              </button>
            )}

            {/* Select and Delete Button */}
            <button
              onClick={triggerBulkDelete}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedMovieIds.size})</span>
            </button>

            <button
              onClick={() => setSelectedMovieIds(new Set())}
              className="text-zinc-400 hover:text-white px-2 py-1 text-xs"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Movie List for Current Pipeline Tab */}
      {displayedList.length === 0 ? (
        <div className="bg-[#121216] border border-white/10 rounded-2xl p-12 text-center space-y-4">
          {pipelineTab === 'awaiting' ? (
            <>
              <Clock className="w-12 h-12 text-amber-500/50 mx-auto" />
              <h3 className="text-base font-bold text-white">No Movies Awaiting Publication</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                When you upload movie video files from your device, they arrive here so you can add
                the plot summary, genres, cast, and review everything before publishing.
              </p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-700/30"
              >
                Upload Video from Device
              </button>
            </>
          ) : (
            <>
              <Film className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Published Movies on Live Feed</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No titles are currently visible to viewers. Upload a movie from your device, add descriptions, and click Publish!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#121216] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-zinc-400 hover:text-white flex items-center"
                      title="Select all movies"
                    >
                      {selectedMovieIds.size === displayedList.length && displayedList.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Title & Poster</th>
                  <th className="py-3 px-4">Genre / Duration</th>
                  <th className="py-3 px-4">File Size & Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {displayedList.map((movie) => {
                  const isSelected = selectedMovieIds.has(movie.id);

                  return (
                    <tr
                      key={movie.id}
                      className={`hover:bg-zinc-900/50 transition-colors ${
                        isSelected ? 'bg-red-950/20' : ''
                      }`}
                    >
                      {/* Checkbox for Select and Delete */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectMovie(movie.id)}
                          className="text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Poster & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => onSelectMovie(movie)}
                            className="w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0 cursor-pointer relative group border border-white/10"
                          >
                            <img
                              src={movie.thumbnail_url}
                              alt={movie.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-4 h-4 text-white fill-current" />
                            </div>
                          </div>
                          <div>
                            <span
                              onClick={() => onSelectMovie(movie)}
                              className="font-bold text-white hover:text-red-400 cursor-pointer block text-sm"
                            >
                              {movie.title}
                            </span>
                            <p className="text-[11px] text-zinc-400 line-clamp-1 max-w-sm mt-0.5">
                              {movie.synopsis || 'No description added yet.'}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                              ID: {movie.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Genre & Duration */}
                      <td className="py-3 px-4">
                        <span className="text-zinc-200 block font-semibold">{movie.genre}</span>
                        <span className="text-zinc-500 text-[11px]">
                          {movie.release_year} · {movie.duration_minutes} mins
                        </span>
                      </td>

                      {/* File Size */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-zinc-200 block font-semibold">
                          {(movie.file_size_mb / 1024).toFixed(2)} GB
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate max-w-xs block font-mono">
                          {movie.file_url.startsWith('blob:') ? 'Local Device Stream' : 'Cloud Master'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {movie.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live on Feed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Awaiting Publication
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Publish / Unpublish Button */}
                          {!movie.is_active ? (
                            <button
                              onClick={() => handlePublishMovie(movie)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all hover:scale-105"
                              title="Publish this movie directly to the live feed for all users"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublishMovie(movie)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-white/10 transition-colors"
                              title="Unpublish movie back to Awaiting Publication"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Descriptions Button */}
                          <button
                            onClick={() => openEditModal(movie)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                            title="Edit Title, Synopsis, and Descriptions"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Single Delete Button (Triggers In-App Modal, NO window.confirm) */}
                          <button
                            onClick={() => triggerSingleDelete(movie)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded-lg border border-red-800/40 transition-colors cursor-pointer"
                            title="Permanently delete movie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETION (REPLACES BROKEN window.confirm) */}
      {deleteConfirmation?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#141418] border border-red-500/40 rounded-2xl shadow-2xl p-6 text-zinc-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6 animate-bounce" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Permanently Delete Movie?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to permanently remove{' '}
                <span className="text-white font-semibold">
                  {deleteConfirmation.titles.length === 1
                    ? `"${deleteConfirmation.titles[0]}"`
                    : `${deleteConfirmation.titles.length} selected movies`}
                </span>
                ? This will immediately purge it from the platform, Firestore database, user
                watchlists, and downloads.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedDeletion}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-700/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESCRIPTION & METADATA EDIT MODAL */}
      {showEditModal && editingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#141418] border border-white/10 rounded-2xl shadow-2xl p-6 my-auto text-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider block">
                  Awaiting Publication Details
                </span>
                <h2 className="text-xl font-bold font-display text-white">
                  Add / Edit Movie Descriptions
                </h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-5">
              Refine the title, plot synopsis, genres, and cast before publishing to the live Sakanet audience.
            </p>

            <form onSubmit={handleSaveDescription} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Movie Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Director</label>
                  <input
                    type="text"
                    value={formDirector}
                    onChange={(e) => setFormDirector(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Plot Synopsis & Description (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formSynopsis}
                  onChange={(e) => setFormSynopsis(e.target.value)}
                  placeholder="Enter the full synopsis and storyline for this movie..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Primary Genre</label>
                  <select
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Action">Action</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Thriller">Thriller</option>
                    <option value="Drama">Drama</option>
                    <option value="Crime">Crime</option>
                    <option value="Horror">Horror</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Comedy">Comedy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Sub-Genre</label>
                  <input
                    type="text"
                    value={formSecondaryGenre}
                    onChange={(e) => setFormSecondaryGenre(e.target.value)}
                    placeholder="e.g. Cyberpunk"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Release Year</label>
                  <input
                    type="number"
                    value={formReleaseYear}
                    onChange={(e) => setFormReleaseYear(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Runtime (min)</label>
                  <input
                    type="number"
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Cast Members (comma separated)</label>
                <input
                  type="text"
                  value={formCast}
                  onChange={(e) => setFormCast(e.target.value)}
                  placeholder="e.g. Lead Star, Co-Star, Villain"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Download Permission Tier</label>
                  <select
                    value={formDownloadPermission}
                    onChange={(e) => setFormDownloadPermission(e.target.value as DownloadPermission)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="free">Free Tier (All Users)</option>
                    <option value="premium">Premium Pro</option>
                    <option value="vip">VIP Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="edit_featured_cb"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                  <label htmlFor="edit_featured_cb" className="text-zinc-300 font-medium cursor-pointer">
                    Feature on Hero Spotlight Banner
                  </label>
                </div>
              </div>

              {/* Direct Cloud Media Sources */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-medium">Cloud Video Stream URL</label>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-zinc-500">Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormVideoUrl(
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                      >
                        4K Sci-Fi
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormVideoUrl(
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                      >
                        4K Action
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormVideoUrl(
                            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                      >
                        4K Master
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="https://.../video.mp4"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-medium">Cover Art / Poster Image</label>
                    <label className="cursor-pointer flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-semibold bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload Cover from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const dataUrl = evt.target?.result as string;
                              setFormPosterUrl(dataUrl);
                              showToast('Cover image attached from device!');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={formPosterUrl.startsWith('data:') ? 'Attached from Device (Image File)' : formPosterUrl}
                    onChange={(e) => setFormPosterUrl(e.target.value)}
                    placeholder="Upload from device or enter image URL"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                  />
                  {formPosterUrl && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-zinc-900/60 rounded-xl border border-white/5">
                      <img
                        src={formPosterUrl}
                        alt="Poster preview"
                        className="w-12 h-16 object-cover rounded-lg border border-white/10"
                      />
                      <span className="text-[11px] text-zinc-400">Attached Poster Preview</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Save Descriptions
                  </button>

                  {!editingMovie.is_active && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveDescription({ preventDefault: () => {} } as any);
                        handlePublishMovie(editingMovie);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-700/30 transition-all hover:scale-105"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Save & Publish Live</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
