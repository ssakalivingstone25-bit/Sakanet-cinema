import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Plus,
  Play,
  RotateCcw,
  Check,
  Video,
  FileVideo,
  AlertCircle,
  Eye,
  Sliders,
  ChevronDown,
  HardDrive,
  Link as LinkIcon,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Movie, VJ } from '../types';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';
import { saveMovieToFirestore } from '../services/firebase';

interface AddMovieUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMovie: Movie | null;
  onSaved: (movie: Movie) => void;
}

const PRIMARY_GENRES = [
  'Action',
  'Thriller',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Adventure',
  'Animation',
  'Crime',
  'High School',
  'Series',
  'Documentary',
  'Family',
  'Martial Arts',
];

const DEFAULT_GENRE_POSTERS: Record<string, string> = {
  Action: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  'Sci-Fi': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  Adventure: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Comedy: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
  Drama: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
  Thriller: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  Horror: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Animation: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
};

const AGE_RATINGS = ['All', 'PG-13', '16+', '18+', 'R'];
const LANGUAGES = ['Luganda [VJ Translation]', 'English', 'Luganda', 'Swahili', 'French'];
const VIDEO_QUALITIES = ['HD (1080p)', '4K UHD', '720p HD', '480p SD'];

export const AddMovieUploadModal: React.FC<AddMovieUploadModalProps> = ({
  isOpen,
  onClose,
  editingMovie,
  onSaved,
}) => {
  // Navigation step
  const [activeStepTab, setActiveStepTab] = useState<number>(1);

  // Upload Method: 'file' (direct device upload - default) vs 'url' (external streaming link)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');

  // Direct Device Files
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [moviePreviewUrl, setMoviePreviewUrl] = useState<string>('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string>('');
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [backdropPreviewUrl, setBackdropPreviewUrl] = useState<string>('');

  // Section 1: Movie Information
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [ageRating, setAgeRating] = useState('16+');
  const [language, setLanguage] = useState('Luganda [VJ Translation]');
  const [country, setCountry] = useState('Uganda');
  const [videoQuality, setVideoQuality] = useState('HD (1080p)');
  const [movieType, setMovieType] = useState<'Movie' | 'Series' | 'Animation'>('Movie');
  const [status, setStatus] = useState<'published' | 'awaiting'>('published');
  const [isFeatured, setIsFeatured] = useState<boolean>(true);
  const [isTrending, setIsTrending] = useState<boolean>(true);
  const [isRecentlyAdded, setIsRecentlyAdded] = useState<boolean>(true);

  // Section 2: Media URLs (fallback or edit mode)
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [backdropUrl, setBackdropUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<number>(850);
  const [accentColor, setAccentColor] = useState<string>('#E50914');

  // Section 3: VJ Assignment
  const [vjsList, setVjsList] = useState<VJ[]>([]);
  const [selectedVjName, setSelectedVjName] = useState<string>('VJ Junior');
  const [selectedVjAvatarUrl, setSelectedVjAvatarUrl] = useState<string>('');
  const [vjBio, setVjBio] = useState<string>('');

  // Add New VJ Drawer/Modal
  const [showAddVjModal, setShowAddVjModal] = useState<boolean>(false);
  const [newVjName, setNewVjName] = useState('');
  const [newVjAvatarUrl, setNewVjAvatarUrl] = useState('');
  const [newVjBio, setNewVjBio] = useState('');

  // Section 4: Genres & Categorization
  const [primaryGenre, setPrimaryGenre] = useState<string>('Action');

  // Section 5: Metadata
  const [keywords, setKeywords] = useState<string>('');
  const [cast, setCast] = useState<string>('Lead Performer, Supporting Cast');
  const [director, setDirector] = useState<string>('Livingstone Saka');

  // Real-time Upload Progress State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [uploadLoadedMb, setUploadLoadedMb] = useState<number>(0);
  const [uploadTotalMb, setUploadTotalMb] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File Input References
  const movieFileInputRef = useRef<HTMLInputElement>(null);
  const posterFileInputRef = useRef<HTMLInputElement>(null);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

  // Populate data when modal opens or edits
  useEffect(() => {
    if (!isOpen) return;

    const storedVjs = storageService.getVJs();
    setVjsList(storedVjs);

    if (editingMovie) {
      setTitle(editingMovie.title || '');
      setOriginalTitle(editingMovie.original_title || '');
      setSynopsis(editingMovie.synopsis || '');
      setReleaseYear(editingMovie.release_year || new Date().getFullYear());
      setDurationMinutes(editingMovie.duration_minutes || 120);
      setAgeRating(editingMovie.age_rating || '16+');
      setLanguage(editingMovie.language || 'Luganda [VJ Translation]');
      setCountry(editingMovie.country || 'Uganda');
      setVideoQuality(editingMovie.video_qualities?.[0] || 'HD (1080p)');
      setMovieType(editingMovie.movie_type || 'Movie');
      setStatus(editingMovie.is_active ? 'published' : 'awaiting');
      setIsFeatured(!!editingMovie.is_featured);
      setIsTrending(editingMovie.is_trending ?? true);
      setIsRecentlyAdded(editingMovie.is_recently_added ?? true);
      setPosterUrl(editingMovie.poster_url || editingMovie.thumbnail_url || '');
      setBackdropUrl(editingMovie.banner_url || '');
      setVideoUrl(editingMovie.video_url || editingMovie.file_url || '');
      setFileSizeMb(editingMovie.file_size_mb || 850);
      setSelectedVjName(editingMovie.vj_name || 'VJ Junior');
      setSelectedVjAvatarUrl(editingMovie.vj_avatar_url || '');
      setVjBio(editingMovie.vj_bio || '');
      setPrimaryGenre(editingMovie.genre || 'Action');
      setCast(editingMovie.cast?.join(', ') || 'Lead Performer');
      setKeywords(editingMovie.keywords?.join(', ') || '');
      setDirector(editingMovie.director || 'Livingstone Saka');
      setUploadMethod(editingMovie.video_url?.startsWith('http') ? 'url' : 'file');
    } else {
      // Fresh form reset
      setTitle('');
      setOriginalTitle('');
      setSynopsis('');
      setReleaseYear(new Date().getFullYear());
      setDurationMinutes(120);
      setAgeRating('16+');
      setLanguage('Luganda [VJ Translation]');
      setCountry('Uganda');
      setVideoQuality('HD (1080p)');
      setMovieType('Movie');
      setStatus('published');
      setIsFeatured(true);
      setIsTrending(true);
      setIsRecentlyAdded(true);
      setPosterUrl('');
      setBackdropUrl('');
      setVideoUrl('');
      setFileSizeMb(850);
      setMovieFile(null);
      setMoviePreviewUrl('');
      setPosterFile(null);
      setPosterPreviewUrl('');
      setBackdropFile(null);
      setBackdropPreviewUrl('');
      setUploadMethod('file');
      setUploadProgress(0);
      setUploadSpeed(0);
      setKeywords('');
      setCast('Lead Performer');
      setDirector('Livingstone Saka');
      setPrimaryGenre('Action');

      if (storedVjs.length > 0) {
        setSelectedVjName(storedVjs[0].name);
        setSelectedVjAvatarUrl(storedVjs[0].avatar_url);
        setVjBio(storedVjs[0].bio || '');
      } else {
        setSelectedVjName('VJ Junior');
        setSelectedVjAvatarUrl('');
        setVjBio('Uganda’s premier blockbuster translator');
      }
    }
  }, [isOpen, editingMovie]);

  if (!isOpen) return null;

  // File Handlers
  const handleMovieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMovieFile(file);
    const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    setFileSizeMb(sizeMb);

    // Auto-suggest title if blank
    if (!title.trim()) {
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[._\-]/g, ' ')
        .replace(/\b(1080p|720p|480p|4k|bluray|webrip|x264|x265)\b/gi, '')
        .trim();
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }

    // Local object URL for instant preview
    try {
      if (moviePreviewUrl) URL.revokeObjectURL(moviePreviewUrl);
      const url = URL.createObjectURL(file);
      setMoviePreviewUrl(url);
    } catch {}
  };

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPosterFile(file);
    try {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
      const url = URL.createObjectURL(file);
      setPosterPreviewUrl(url);
    } catch {}
  };

  const handleBackdropFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackdropFile(file);
    try {
      if (backdropPreviewUrl) URL.revokeObjectURL(backdropPreviewUrl);
      const url = URL.createObjectURL(file);
      setBackdropPreviewUrl(url);
    } catch {}
  };

  const handleSaveNewVj = () => {
    if (!newVjName.trim()) {
      setErrorMessage('Please enter a name for the new VJ.');
      return;
    }

    const created = storageService.addVJ({
      name: newVjName.trim(),
      avatar_url: newVjAvatarUrl || '',
      bio: newVjBio.trim() || 'Ugandan VJ Cinema Specialist',
      genres: primaryGenre,
    });

    const updatedList = storageService.getVJs();
    setVjsList(updatedList);
    setSelectedVjName(created.name);
    setSelectedVjAvatarUrl(created.avatar_url);
    setVjBio(created.bio || '');
    setShowAddVjModal(false);
    setNewVjName('');
    setNewVjAvatarUrl('');
    setNewVjBio('');
  };

  // Submit / Publish Movie
  const handleSubmit = async (publishDirectly: boolean) => {
    if (!title.trim()) {
      setErrorMessage('Please provide a Movie Title.');
      setActiveStepTab(1);
      return;
    }

    // Validation based on upload method
    if (uploadMethod === 'file') {
      if (!movieFile && !videoUrl.trim() && !editingMovie) {
        setErrorMessage('Please select a video file from your device.');
        setActiveStepTab(2);
        return;
      }
    } else {
      if (!videoUrl.trim() && !editingMovie) {
        setErrorMessage('Please paste a direct video stream link.');
        setActiveStepTab(2);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(0);

    try {
      const castArray = cast
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const keywordsArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const isLive = status === 'published' || publishDirectly;
      const movieId = editingMovie
        ? editingMovie.id
        : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      let savedMovie: Movie;

      // CASE A: User selected direct device file(s) -> Multipart upload to server disk storage
      if (movieFile || posterFile || backdropFile) {
        const formData = new FormData();
        formData.append('id', movieId);
        formData.append('title', title.trim());
        formData.append('original_title', originalTitle.trim());
        formData.append('synopsis', synopsis.trim() || 'Awaiting plot synopsis and details.');
        formData.append('genre', primaryGenre);
        formData.append('release_year', String(releaseYear));
        formData.append('duration_minutes', String(durationMinutes));
        formData.append('age_rating', ageRating);
        formData.append('language', language);
        formData.append('country', country);
        formData.append('movie_type', movieType);
        formData.append('is_active', String(isLive));
        formData.append('is_featured', String(isFeatured));
        formData.append('is_trending', String(isTrending));
        formData.append('is_recently_added', String(isRecentlyAdded));
        formData.append('vj_name', selectedVjName);
        formData.append('vj_avatar_url', selectedVjAvatarUrl);
        formData.append('vj_bio', vjBio);
        formData.append('director', selectedVjName || director);
        formData.append('cast', JSON.stringify(castArray.length ? castArray : ['Lead Performer']));
        formData.append('keywords', JSON.stringify(keywordsArray));
        formData.append('video_qualities', JSON.stringify([videoQuality]));
        formData.append('audio_tracks', JSON.stringify([language, 'English [Stereo]']));
        formData.append('subtitles', JSON.stringify(['English [CC]']));
        formData.append('file_size_mb', String(fileSizeMb));

        // Attach media URLs with fallback
        const effectivePoster = posterUrl.trim() || DEFAULT_GENRE_POSTERS[primaryGenre] || DEFAULT_GENRE_POSTERS['Action'];
        formData.append('poster_url', effectivePoster);
        formData.append('banner_url', (backdropUrl || effectivePoster).trim());
        if (videoUrl) formData.append('video_url', videoUrl.trim());

        // Attach actual binary files
        if (movieFile) formData.append('movieFile', movieFile);
        if (posterFile) formData.append('posterFile', posterFile);
        if (backdropFile) formData.append('backdropFile', backdropFile);

        savedMovie = await apiService.uploadMovie(formData, (p) => {
          setUploadProgress(p.percent);
          setUploadSpeed(p.speedMbps);
          setUploadLoadedMb(Math.round((p.loaded / (1024 * 1024)) * 10) / 10);
          setUploadTotalMb(Math.round((p.total / (1024 * 1024)) * 10) / 10);
        });
      } else {
        // CASE B: Standard JSON URL streaming record
        const moviePayload: Movie = {
          id: movieId,
          title: title.trim(),
          original_title: originalTitle.trim(),
          synopsis: synopsis.trim() || 'Awaiting plot synopsis and details.',
          genre: primaryGenre,
          release_year: releaseYear,
          duration_minutes: durationMinutes,
          rating: editingMovie?.rating || 5.0,
          review_count: editingMovie?.review_count || 0,
          video_url: videoUrl.trim(),
          poster_url: posterUrl.trim(),
          file_url: videoUrl.trim(),
          videoUrl: videoUrl.trim(),
          thumbnail_url: posterUrl.trim(),
          banner_url: (backdropUrl || posterUrl).trim(),
          age_rating: ageRating,
          language,
          country,
          movie_type: movieType,
          is_active: isLive,
          is_featured: isFeatured,
          is_trending: isTrending,
          is_recently_added: isRecentlyAdded,
          accent_color: accentColor,
          director: selectedVjName || director,
          vj_name: selectedVjName,
          vj_avatar_url: selectedVjAvatarUrl,
          vj_bio: vjBio,
          download_permission: 'free',
          file_size_mb: fileSizeMb || 850,
          cast: castArray.length ? castArray : ['Lead Performer'],
          keywords: keywordsArray,
          video_qualities: [videoQuality as any],
          audio_tracks: [language, 'English [Stereo]'],
          subtitles: ['English [CC]'],
          created_at: editingMovie?.created_at || new Date().toISOString(),
        };

        if (editingMovie) {
          savedMovie = await apiService.updateMovie(editingMovie.id, moviePayload);
        } else {
          savedMovie = await apiService.createMovie(moviePayload);
        }
      }

      // Persist in local storage cache
      const currentList = storageService.getMovies();
      const existingIdx = currentList.findIndex((m) => m.id === savedMovie.id);
      if (existingIdx >= 0) {
        storageService.updateMovie(savedMovie.id, savedMovie);
      } else {
        storageService.saveMovies([savedMovie, ...currentList]);
      }

      // Sync into Cloud Firestore database (ai-studio-sakanet-e2034e9a-6112-4f29-b445-7009f6a22938)
      try {
        await saveMovieToFirestore(savedMovie);
      } catch (firestoreErr) {
        console.warn('Firestore cloud sync notice (local copy saved):', firestoreErr);
      }

      onSaved(savedMovie);
      onClose();
    } catch (err: any) {
      console.error('Error saving movie:', err);
      setErrorMessage(err.message || 'Failed to upload movie. Please verify your file and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#0e0f15] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-white select-none">
        {/* ========================================================
            TOP MODAL HEADER
           ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#121319]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-[#E50914] shadow-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                <span>{editingMovie ? 'Edit Movie Details' : 'Upload Movie from Device'}</span>
              </h2>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Upload video files and artwork directly from your device. Files are streamed with HTTP range seeking and synced to Cloud Firestore.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            REAL-TIME UPLOAD PROGRESS BANNER
           ======================================================== */}
        {isSubmitting && (
          <div className="p-4 bg-gradient-to-r from-red-950/90 to-zinc-950 border-b border-red-600/40 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#E50914] animate-bounce" />
                <span className="font-bold text-white">
                  Uploading Movie &amp; Media to Server Storage...
                </span>
                {uploadSpeed > 0 && (
                  <span className="font-mono text-zinc-400 text-[11px]">
                    ({uploadSpeed} MB/s)
                  </span>
                )}
              </div>
              <div className="font-mono font-bold text-[#E50914]">
                {uploadProgress}% {uploadTotalMb > 0 ? `(${uploadLoadedMb} / ${uploadTotalMb} MB)` : ''}
              </div>
            </div>

            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-[#E50914] rounded-full transition-all duration-200"
                style={{ width: `${Math.max(5, uploadProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            STEPPER NAVIGATION TABS
           ======================================================== */}
        <div className="px-4 py-2 bg-[#0a0b10] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          {[
            { num: 1, label: 'Movie Details' },
            { num: 2, label: 'Video & Poster Files' },
            { num: 3, label: 'VJ & Genre' },
            { num: 4, label: 'Placement & Review' },
          ].map((tab) => (
            <button
              key={tab.num}
              type="button"
              onClick={() => setActiveStepTab(tab.num)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStepTab === tab.num
                  ? 'bg-[#E50914] text-white shadow-md shadow-red-700/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.num}.</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-950/90 border-b border-red-700/60 px-4 py-2.5 text-xs text-red-200 flex items-center gap-2 shrink-0 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* ========================================================
            MODAL BODY CONTENT
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: MOVIE DETAILS */}
          {activeStepTab === 1 && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#E50914]" />
                  <span>Primary Title &amp; Synopsis</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Movie Title <span className="text-[#E50914]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Extraction: Kampala Strike"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Original English Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Extraction 2"
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                    Plot Synopsis
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter engaging Luganda or English storyline summary..."
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#E50914] rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Release Year</label>
                    <input
                      type="number"
                      min={1970}
                      max={2030}
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(Number(e.target.value))}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min={10}
                      max={400}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Age Rating</label>
                    <select
                      value={ageRating}
                      onChange={(e) => setAgeRating(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2 text-white font-semibold"
                    >
                      {AGE_RATINGS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Video Quality</label>
                    <select
                      value={videoQuality}
                      onChange={(e) => setVideoQuality(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2 text-white font-semibold"
                    >
                      {VIDEO_QUALITIES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStepTab(2)}
                    className="px-5 py-2 bg-[#E50914] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                  >
                    Continue to Media Files →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VIDEO & POSTER FILES (PRIMARY DIRECT DEVICE UPLOAD) */}
          {activeStepTab === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Method Switcher: Device File Upload vs External URL */}
              <div className="flex items-center justify-between bg-[#121319] p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#E50914]" />
                  <span className="text-xs font-bold text-white">Upload Method:</span>
                </div>
                <div className="inline-flex bg-zinc-950 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      uploadMethod === 'file'
                        ? 'bg-[#E50914] text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Direct Device Upload (Recommended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      uploadMethod === 'url'
                        ? 'bg-[#E50914] text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>External Stream URL</span>
                  </button>
                </div>
              </div>

              {/* 1. MOVIE VIDEO FILE UPLOADER */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#E50914]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Master Video File <span className="text-[#E50914]">*</span>
                    </h3>
                  </div>
                  {movieFile && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      {fileSizeMb} MB Ready
                    </span>
                  )}
                </div>

                {uploadMethod === 'file' ? (
                  <div>
                    <input
                      type="file"
                      ref={movieFileInputRef}
                      onChange={handleMovieFileChange}
                      accept="video/mp4,video/x-matroska,video/webm,video/quicktime,.mp4,.mkv,.webm,.mov"
                      className="hidden"
                    />

                    {movieFile ? (
                      <div className="bg-[#0a0b10] border border-white/15 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-[#E50914]">
                              <FileVideo className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-white max-w-sm sm:max-w-md truncate">
                                {movieFile.name}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {(movieFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for range streaming
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => movieFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Change File
                          </button>
                        </div>

                        {/* Local Video Preview */}
                        {moviePreviewUrl && (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/10 mt-2">
                            <video
                              src={moviePreviewUrl}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => movieFileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 hover:border-[#E50914]/70 rounded-2xl p-8 sm:p-10 text-center space-y-3 bg-[#0a0b10]/60 hover:bg-[#0a0b10] transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 group-hover:border-[#E50914]/50 flex items-center justify-center text-zinc-400 group-hover:text-[#E50914] mx-auto transition-colors">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                            Choose Movie Video File from Device
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            Click to browse or drop MP4, MKV, WebM, or MOV file (Supports master files up to 4GB)
                          </p>
                        </div>
                        <span className="inline-block px-4 py-1.5 bg-[#E50914] text-white text-xs font-semibold rounded-xl shadow">
                          Browse Local Storage
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Direct Video Stream Link
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://domain.com/movie.mp4 or .m3u8"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 2. POSTER & BACKDROP ARTWORK UPLOADER */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <ImageIcon className="w-4 h-4 text-[#E50914]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Movie Artwork &amp; Posters <span className="text-[#E50914]">*</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Poster Image (2:3 aspect) */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Portrait Movie Poster (2:3) <span className="text-[#E50914]">*</span>
                    </span>

                    <input
                      type="file"
                      ref={posterFileInputRef}
                      onChange={handlePosterFileChange}
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                    />

                    {posterPreviewUrl || posterUrl ? (
                      <div className="relative aspect-[2/3] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-white/20 bg-black group">
                        <img
                          src={posterPreviewUrl || posterUrl}
                          alt="Poster Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPosterFile(null);
                            setPosterPreviewUrl('');
                            setPosterUrl('');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => posterFileInputRef.current?.click()}
                        className="aspect-[2/3] w-full max-w-[200px] mx-auto border-2 border-dashed border-white/20 hover:border-[#E50914]/70 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-[#0a0b10] hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 text-zinc-500 mb-1" />
                        <span className="text-xs font-semibold text-white">Select Poster</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">JPG, PNG, or WebP</span>
                      </div>
                    )}

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => posterFileInputRef.current?.click()}
                        className="text-[11px] text-zinc-400 hover:text-white font-medium underline cursor-pointer"
                      >
                        {posterPreviewUrl ? 'Replace Poster Image' : 'Browse Poster from Device'}
                      </button>
                    </div>
                  </div>

                  {/* Backdrop Banner (16:9 aspect) */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Horizontal Backdrop Banner (16:9)
                    </span>

                    <input
                      type="file"
                      ref={backdropFileInputRef}
                      onChange={handleBackdropFileChange}
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                    />

                    {backdropPreviewUrl || backdropUrl ? (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/20 bg-black group">
                        <img
                          src={backdropPreviewUrl || backdropUrl}
                          alt="Backdrop Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBackdropFile(null);
                            setBackdropPreviewUrl('');
                            setBackdropUrl('');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => backdropFileInputRef.current?.click()}
                        className="aspect-video w-full border-2 border-dashed border-white/20 hover:border-[#E50914]/70 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-[#0a0b10] hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 text-zinc-500 mb-1" />
                        <span className="text-xs font-semibold text-white">Select Backdrop</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Hero carousel banner</span>
                      </div>
                    )}

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => backdropFileInputRef.current?.click()}
                        className="text-[11px] text-zinc-400 hover:text-white font-medium underline cursor-pointer"
                      >
                        {backdropPreviewUrl ? 'Replace Banner Image' : 'Browse Banner from Device'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStepTab(1)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepTab(3)}
                  className="px-5 py-2 bg-[#E50914] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Continue to VJ Assignment →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: VJ ASSIGNMENT & GENRES */}
          {activeStepTab === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* VJ Selection */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    VJ Translator Assignment
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddVjModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#E50914] hover:text-red-400 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New VJ Profile</span>
                  </button>
                </div>

                {/* Add VJ Drawer */}
                {showAddVjModal && (
                  <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-3 animate-in fade-in">
                    <h4 className="text-xs font-bold text-white">Create New VJ Translator</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <input
                        type="text"
                        placeholder="VJ Name (e.g. VJ Emmy, VJ Jingo)"
                        value={newVjName}
                        onChange={(e) => setNewVjName(e.target.value)}
                        className="bg-[#0a0b10] border border-white/10 rounded-lg p-2 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Avatar Image URL (optional)"
                        value={newVjAvatarUrl}
                        onChange={(e) => setNewVjAvatarUrl(e.target.value)}
                        className="bg-[#0a0b10] border border-white/10 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddVjModal(false)}
                        className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewVj}
                        className="px-3.5 py-1 bg-[#E50914] text-white text-xs font-bold rounded-lg shadow"
                      >
                        Save VJ
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                    Select Assigned VJ Translator
                  </label>
                  <select
                    value={selectedVjName}
                    onChange={(e) => {
                      setSelectedVjName(e.target.value);
                      const vj = vjsList.find((v) => v.name === e.target.value);
                      if (vj) {
                        setSelectedVjAvatarUrl(vj.avatar_url || '');
                        setVjBio(vj.bio || '');
                      }
                    }}
                    className="w-full bg-[#0a0b10] border border-white/15 rounded-xl p-2.5 text-white font-bold text-xs"
                  >
                    {vjsList.length > 0 ? (
                      vjsList.map((vj) => (
                        <option key={vj.id || vj.name} value={vj.name}>
                          {vj.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="VJ Junior">VJ Junior</option>
                        <option value="VJ Jingo">VJ Jingo</option>
                        <option value="VJ Emmy">VJ Emmy</option>
                        <option value="VJ Ice P">VJ Ice P</option>
                        <option value="VJ Mark">VJ Mark</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Genre Selection */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
                  Genres &amp; Categorization
                </h3>

                <div>
                  <label className="block text-zinc-400 font-medium text-xs mb-1">
                    Primary Genre <span className="text-[#E50914]">*</span>
                  </label>
                  <select
                    value={primaryGenre}
                    onChange={(e) => setPrimaryGenre(e.target.value)}
                    className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white font-bold text-xs"
                  >
                    {PRIMARY_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-400 font-medium block mb-2">
                    Click to Select Genre Tag:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIMARY_GENRES.map((g) => {
                      const isSelected = primaryGenre === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setPrimaryGenre(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#E50914] text-white shadow'
                              : 'bg-[#0a0b10] text-zinc-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStepTab(2)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  ← Back to Files
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepTab(4)}
                  className="px-5 py-2 bg-[#E50914] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Continue to Placement &amp; Publish →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PLACEMENT & PUBLISHING */}
          {activeStepTab === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">
                  Browse Placement &amp; Promotion
                </h3>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-[#0a0b10] border border-white/5">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-white block">Feature in Top Hero Banner</span>
                      <span className="text-[11px] text-zinc-400">Promotes this title at the very top carousel of the Browse tab</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-[#0a0b10] border border-white/5">
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-white block">Show in Trending Now Rail</span>
                      <span className="text-[11px] text-zinc-400">Highlights this title among high-interest cinema releases</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-[#0a0b10] border border-white/5">
                    <input
                      type="checkbox"
                      checked={isRecentlyAdded}
                      onChange={(e) => setIsRecentlyAdded(e.target.checked)}
                      className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-white block">Show in Recently Added</span>
                      <span className="text-[11px] text-zinc-400">Places this title into the newest arrivals row</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Ready to Publish Summary */}
              <div className="bg-[#0a0b10] border border-emerald-500/30 rounded-2xl p-5 text-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready for Live Streaming</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Upon publishing, this movie file will be permanently hosted on your dedicated server disk storage with HTTP 206 Range requests (preventing any buffering or broken playback) and automatically synchronized with your Cloud Firestore database.
                </p>
                <div className="pt-1 flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                  <span>Title: {title || 'Untitled'}</span>
                  <span>·</span>
                  <span>VJ: {selectedVjName}</span>
                  <span>·</span>
                  <span>Genre: {primaryGenre}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            BOTTOM ACTION BAR
           ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-[#121319]">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#E50914] inline-block animate-pulse" />
            <span>Direct device storage upload with Cloud Firestore synchronization</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
            >
              Save as Awaiting
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#d60b23] text-white font-bold text-xs shadow-lg shadow-red-700/40 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? uploadProgress > 0
                    ? `Uploading (${uploadProgress}%)`
                    : 'Saving Movie...'
                  : 'Publish Movie to Sakanet'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMovieUploadModal;
