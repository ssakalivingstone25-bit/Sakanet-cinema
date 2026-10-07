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
import {
  saveMovieToFirestore,
  deleteMovieFromFirestore,
  deleteMultipleMoviesFromFirestore,
} from '../services/firebase';
import { AddMovieUploadModal } from './AddMovieUploadModal';
import { apiService } from '../services/apiService';

interface AdminPortalViewProps {
  movies: Movie[];
  onMoviesChanged: (deletedMovieIds?: string[]) => Promise<void> | void;
  onSelectMovie: (movie: Movie) => void;
  onNavigateTab?: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
  onDeleteMovie?: (movieId: string) => Promise<void> | void;
  onDeleteMultipleMovies?: (movieIds: string[]) => Promise<void> | void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = React.memo(({
  movies,
  onMoviesChanged,
  onSelectMovie,
  onNavigateTab,
  onDeleteMovie,
  onDeleteMultipleMovies,
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
  const [isDeleting, setIsDeleting] = useState(false);

  // Description / Edit Modal state
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Open edit modal for a movie
  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    setShowEditModal(true);
  };

  // Publish a movie directly to Live Platform (and Browse Catalog)
  const handlePublishMovie = async (movie: Movie) => {
    const publishedMovie: Movie = {
      ...movie,
      is_active: true,
    };

    // 1. Instant storage & cache update
    storageService.updateMovie(movie.id, { is_active: true });
    const localList = storageService.getMovies();
    if (!localList.some((m) => m.id === movie.id)) {
      storageService.saveMovies([publishedMovie, ...localList]);
    }

    // 2. Cloud Firestore sync
    try {
      await saveMovieToFirestore(publishedMovie);
    } catch (fsErr) {
      console.warn('Firestore publish sync notice:', fsErr);
    }

    // 3. Server database update (with upsert)
    try {
      await apiService.updateMovie(movie.id, { is_active: true });
    } catch {
      try {
        await apiService.createMovie(publishedMovie);
      } catch {}
    }

    // 4. Await app-level catalog refresh to propagate state everywhere
    await onMoviesChanged();
    setPipelineTab('published');
    showToast(`"${movie.title}" is now LIVE on Sakanet Browse!`);
  };

  // Unpublish a movie back to Awaiting
  const handleUnpublishMovie = async (movie: Movie) => {
    const unpublishedMovie: Movie = {
      ...movie,
      is_active: false,
    };

    storageService.updateMovie(movie.id, { is_active: false });
    try {
      await saveMovieToFirestore(unpublishedMovie);
    } catch {}

    try {
      await apiService.updateMovie(movie.id, { is_active: false });
    } catch {}

    await onMoviesChanged();
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
  const handlePublishSelected = async () => {
    if (selectedMovieIds.size === 0) return;
    const ids = Array.from(selectedMovieIds);
    let count = 0;
    for (const id of ids) {
      const target = movies.find((m) => m.id === id);
      const publishedMovie: Movie = target
        ? { ...target, is_active: true }
        : ({ id, is_active: true } as any);

      storageService.updateMovie(id, { is_active: true });
      try {
        await saveMovieToFirestore(publishedMovie);
      } catch {}
      try {
        await apiService.updateMovie(id, { is_active: true });
      } catch {}
      count++;
    }
    setSelectedMovieIds(new Set());
    await onMoviesChanged();
    setPipelineTab('published');
    showToast(`Published ${count} movie(s) to the live platform!`);
  };

  // Direct single movie deletion (triggers central movie state, storageService, SQLite, Firestore)
  const handleDirectSingleDelete = async (movie: Movie) => {
    const movieId = movie.id;

    // 1. Delete from underlying storageService
    storageService.deleteMovie(movieId);

    // 2. Trigger deletion from central movie state
    if (onDeleteMovie) {
      await onDeleteMovie(movieId);
    }

    // 3. Delete from backend SQLite database and remove associated media files
    try {
      await apiService.deleteMovie(movieId);
    } catch (err) {
      console.warn('API delete movie notice:', err);
    }

    // 4. Delete from Firestore cloud database
    try {
      await deleteMovieFromFirestore(movieId);
    } catch (err) {
      console.warn('Firestore delete movie notice:', err);
    }

    // 5. Update local selectedMovieIds if it was selected
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      next.delete(movieId);
      return next;
    });

    // 6. Notify parent state of deletion
    await onMoviesChanged([movieId]);
    showToast(`Permanently deleted "${movie.title}"`);
  };

  // Explicit Delete Button click handler
  const handleExplicitDeleteClick = (e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    // Shift+Click provides quick direct deletion without modal prompt
    if (e.shiftKey) {
      handleDirectSingleDelete(movie);
    } else {
      triggerSingleDelete(movie);
    }
  };

  // Confirm and execute permanent deletion (IN-APP MODAL)
  const executeConfirmedDeletion = async () => {
    if (!deleteConfirmation || isDeleting) return;

    setIsDeleting(true);
    const { movieIds, titles } = deleteConfirmation;

    try {
      // 1. Delete from underlying storageService (LocalStorage, tombstones, downloads, watchlist)
      storageService.deleteMultipleMovies(movieIds);
      movieIds.forEach((id) => {
        storageService.deleteMovie(id);
      });

      // 2. Trigger deletion from central movie state
      if (onDeleteMultipleMovies) {
        await onDeleteMultipleMovies(movieIds);
      } else if (onDeleteMovie) {
        for (const id of movieIds) {
          await onDeleteMovie(id);
        }
      }

      // 3. Delete from backend server database (SQLite & disk files)
      for (const id of movieIds) {
        try {
          await apiService.deleteMovie(id);
        } catch (err) {
          console.warn('Backend delete movie notice:', err);
        }
      }

      // 4. Delete in Firestore cloud database
      try {
        await deleteMultipleMoviesFromFirestore(movieIds);
      } catch (err) {
        console.warn('Firestore bulk delete notice:', err);
      }
      for (const id of movieIds) {
        try {
          await deleteMovieFromFirestore(id);
        } catch {}
      }

      // 5. Clear selection
      setSelectedMovieIds((prev) => {
        const next = new Set(prev);
        movieIds.forEach((id) => next.delete(id));
        return next;
      });

      // 6. Refresh central catalog
      await onMoviesChanged(movieIds);

      const titleStr = titles.length === 1 ? `"${titles[0]}"` : `${movieIds.length} movie(s)`;
      showToast(`Permanently deleted ${titleStr}`);
      setDeleteConfirmation(null);
    } finally {
      setIsDeleting(false);
    }
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

      {/* Header & Movie Stream Ingestion Card */}
      <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                Sakanet Movie Management &amp; Admin Portal
              </h1>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Upload movie files and posters directly from your device or stream links. Uploaded movies are securely hosted on server storage with HTTP range streaming and synced to Cloud Firestore.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingMovie(null);
                setShowEditModal(true);
              }}
              className="flex items-center gap-2 bg-[#E50914] hover:bg-[#d60b23] text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-red-700/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Movie from Device</span>
            </button>
          </div>
        </div>
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
                Paste a video stream URL and poster image URL to add new titles for plot review before publishing.
              </p>
              <button
                onClick={() => {
                  setEditingMovie(null);
                  setShowEditModal(true);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-700/30 cursor-pointer"
              >
                Add Movie via Stream URL
              </button>
            </>
          ) : (
            <>
              <Film className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No movies available. Add a video URL to get started.</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No titles are currently visible to viewers. Add a video stream URL and poster image URL to start streaming!
              </p>
              <button
                onClick={() => {
                  setEditingMovie(null);
                  setShowEditModal(true);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-700/30 cursor-pointer"
              >
                Add Movie via Stream URL
              </button>
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
                  <th className="py-3 px-4">Stream URL & Source</th>
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
                              src={movie.poster_url || movie.thumbnail_url}
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
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/40 px-1.5 py-0.5 rounded">
                                {movie.vj_name || movie.director || 'VJ Junior'}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ID: {movie.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 line-clamp-1 max-w-sm mt-0.5">
                              {movie.synopsis || 'No description added yet.'}
                            </p>
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

                      {/* Stream Source URL */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-zinc-200 block font-semibold truncate max-w-xs" title={movie.video_url || movie.file_url}>
                          {movie.video_url || movie.file_url}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate max-w-xs block font-mono">
                          {(movie.video_url || movie.file_url).startsWith('http') ? 'Online Stream URL' : 'Direct URL Stream'}
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Publish / Unpublish Button */}
                          {!movie.is_active ? (
                            <button
                              onClick={() => handlePublishMovie(movie)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title="Publish this movie directly to the live feed for all users"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublishMovie(movie)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-white/10 transition-colors text-xs font-semibold cursor-pointer"
                              title="Unpublish movie back to Awaiting Publication"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Unpublish</span>
                            </button>
                          )}

                          {/* Edit Descriptions Button */}
                          <button
                            onClick={() => openEditModal(movie)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer text-xs font-semibold"
                            title="Edit Title, Synopsis, and Descriptions"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          {/* Explicit Delete Button */}
                          <button
                            onClick={(e) => handleExplicitDeleteClick(e, movie)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white rounded-lg border border-red-800/60 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-semibold group"
                            title={`Permanently delete "${movie.title}" (Hold Shift for instant delete)`}
                            aria-label={`Delete ${movie.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-white shrink-0" />
                            <span>Delete</span>
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
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeConfirmedDeletion}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-700/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Purging Movie...</span>
                  </>
                ) : (
                  <span>Yes, Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE ADD / EDIT MOVIE UPLOAD MODAL */}
      <AddMovieUploadModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMovie(null);
        }}
        editingMovie={editingMovie}
        onSaved={async (savedMovie) => {
          await saveMovieToFirestore(savedMovie);
          await onMoviesChanged();
          setShowEditModal(false);
          setEditingMovie(null);
          showToast(`"${savedMovie.title}" successfully saved & published!`);
          if (savedMovie.is_active && onNavigateTab) {
            onNavigateTab('browse');
          }
        }}
      />
    </div>
  );
});
