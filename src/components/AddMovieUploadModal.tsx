import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Video,
  FileVideo,
  AlertCircle,
  Eye,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { Movie, VJ, DownloadPermission } from '../types';
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

const AGE_RATINGS = ['All', 'PG-13', '16+', '18+', 'R'];
const LANGUAGES = ['Luganda [VJ Translation]', 'English', 'Luganda', 'Swahili', 'French'];
const COUNTRIES = ['Uganda', 'USA', 'UK', 'Nigeria', 'South Africa', 'India'];
const VIDEO_QUALITIES = ['HD (1080p)', '4K UHD', '720p HD', '480p SD'];

export const AddMovieUploadModal: React.FC<AddMovieUploadModalProps> = ({
  isOpen,
  onClose,
  editingMovie,
  onSaved,
}) => {
  // Stepper / navigation tab
  const [activeStepTab, setActiveStepTab] = useState<number>(1);

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

  // Section 2: Media URLs (Lightweight string URLs)
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [backdropUrl, setBackdropUrl] = useState<string>('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('#F20D28');

  // Section 3: Video Stream URL
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<number>(850);
  const [videoResolution, setVideoResolution] = useState<string>('1920x1080');
  const [videoFormat, setVideoFormat] = useState<string>('MP4');

  // Section 4: VJ Assignment
  const [vjsList, setVjsList] = useState<VJ[]>([]);
  const [selectedVjName, setSelectedVjName] = useState<string>('VJ Junior');
  const [selectedVjAvatarUrl, setSelectedVjAvatarUrl] = useState<string>('');
  const [vjBio, setVjBio] = useState<string>('');

  // Add New VJ Sub-modal/drawer
  const [showAddVjModal, setShowAddVjModal] = useState<boolean>(false);
  const [newVjName, setNewVjName] = useState('');
  const [newVjAvatarUrl, setNewVjAvatarUrl] = useState('');
  const [newVjBio, setNewVjBio] = useState('');

  // Section 5: Genres & Categorization
  const [primaryGenre, setPrimaryGenre] = useState<string>('Action');

  // Section 6: Search Metadata
  const [keywords, setKeywords] = useState<string>('');
  const [cast, setCast] = useState<string>('Lead Performer, Supporting Cast');
  const [director, setDirector] = useState<string>('Livingstone Saka');

  // Hidden File Input Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const newVjAvatarInputRef = useRef<HTMLInputElement>(null);
  const selectedVjAvatarInputRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load VJs and populate form if editing
  useEffect(() => {
    if (!isOpen) return;

    // Load available VJs from storage
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
      setAccentColor(editingMovie.accent_color || '#F20D28');
      setVideoUrl(editingMovie.video_url || editingMovie.file_url || '');
      setFileSizeMb(editingMovie.file_size_mb || 850);
      setSelectedVjName(editingMovie.vj_name || 'VJ Junior');
      setSelectedVjAvatarUrl(editingMovie.vj_avatar_url || '');
      setVjBio(editingMovie.vj_bio || '');
      setPrimaryGenre(editingMovie.genre || 'Action');
      setCast(editingMovie.cast?.join(', ') || 'Lead Performer');
      setKeywords(editingMovie.keywords?.join(', ') || '');
      setDirector(editingMovie.director || 'Livingstone Saka');
    } else {
      // Reset for fresh movie upload
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
      setLogoDataUrl('');
      setAccentColor('#F20D28');
      setVideoUrl('');
      setFileSizeMb(850);
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

  // Logo & VJ Image Handlers
  const handleLogoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setLogoDataUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleNewVjAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setNewVjAvatarUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectedVjAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setSelectedVjAvatarUrl(dataUrl);

      // Persist to VJ in storage
      const vjs = storageService.getVJs();
      const existing = vjs.find((v) => v.name.toLowerCase() === selectedVjName.toLowerCase());
      if (existing) {
        existing.avatar_url = dataUrl;
        storageService.saveVJs(vjs);
        setVjsList([...vjs]);
      } else {
        storageService.addVJ({
          name: selectedVjName,
          avatar_url: dataUrl,
          bio: vjBio || 'Ugandan VJ Cinema Specialist',
          genres: primaryGenre,
        });
        setVjsList(storageService.getVJs());
      }
    };
    reader.readAsDataURL(file);
  };

  // Save New VJ with Device Avatar
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

    if (!videoUrl.trim()) {
      setErrorMessage('Please paste a Video Stream URL.');
      setActiveStepTab(2);
      return;
    }

    if (!posterUrl.trim()) {
      setErrorMessage('Please paste a Poster Image URL.');
      setActiveStepTab(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

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

      const moviePayload: Movie = {
        id: editingMovie ? editingMovie.id : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

      let savedMovie: Movie = moviePayload;

      try {
        if (editingMovie) {
          savedMovie = await apiService.updateMovie(editingMovie.id, moviePayload);
        } else {
          savedMovie = await apiService.createMovie(moviePayload);
        }
      } catch (serverErr) {
        console.warn('apiService save notice, using payload:', serverErr);
        if (editingMovie) {
          savedMovie = storageService.updateMovie(editingMovie.id, moviePayload) || moviePayload;
        } else {
          savedMovie = storageService.addMovie(moviePayload);
        }
      }

      // Sync with storageService and Cloud Firestore
      const currentList = storageService.getMovies();
      const existingIdx = currentList.findIndex((m) => m.id === savedMovie.id);
      if (existingIdx >= 0) {
        storageService.updateMovie(savedMovie.id, savedMovie);
      } else {
        storageService.saveMovies([savedMovie, ...currentList]);
      }
      saveMovieToFirestore(savedMovie);

      onSaved(savedMovie);
      onClose();
    } catch (err) {
      console.error('Error saving movie:', err);
      setErrorMessage('Failed to save movie. Please check your selections and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#0e0f15] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-white select-none">
        {/* ========================================================
            TOP MODAL HEADER (Matches reference design)
           ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#121319]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-[#F20D28] shadow-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                <span>{editingMovie ? 'Edit Movie Details' : 'Add / Upload Movie'}</span>
              </h2>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Fill in the details below and upload your movie. You can preview how it will appear on the platform before publishing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            STEPPER NAVIGATION PILL TABS
           ======================================================== */}
        <div className="px-4 py-2 bg-[#0a0b10] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          {[
            { num: 1, label: 'Movie Info' },
            { num: 2, label: 'Media Files' },
            { num: 3, label: 'VJ & Genres' },
            { num: 4, label: 'Browse Placement' },
            { num: 5, label: 'Search Metadata' },
            { num: 6, label: 'Publishing' },
          ].map((tab) => (
            <button
              key={tab.num}
              type="button"
              onClick={() => setActiveStepTab(tab.num)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStepTab === tab.num
                  ? 'bg-[#F20D28] text-white shadow-md shadow-red-700/40'
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
            MODAL BODY: 2-COLUMN GRID (Matching Screenshot)
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ========================================================
                LEFT COLUMN: 1. Movie Information & 3. Video Upload
               ======================================================== */}
            <div className="space-y-6">
              {/* SECTION 1: MOVIE INFORMATION */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Movie Information
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Movie Title & Original Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Movie Title <span className="text-[#F20D28]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter movie title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[#F20D28]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Original Title (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter original title"
                        value={originalTitle}
                        onChange={(e) => setOriginalTitle(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      />
                    </div>
                  </div>

                  {/* Description / Synopsis */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 font-medium">
                        Description / Synopsis <span className="text-[#F20D28]">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {synopsis.length}/2000
                      </span >
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter movie description or synopsis..."
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      maxLength={2000}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-3 text-white leading-relaxed focus:outline-none focus:border-[#F20D28]"
                    />
                  </div>

                  {/* Year, Runtime, Age Rating */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Release Year *</label>
                      <input
                        type="number"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(Number(e.target.value))}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-[#F20D28]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Runtime *</label>
                      <input
                        type="number"
                        placeholder="120 min"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-[#F20D28]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Age Rating *</label>
                      <select
                        value={ageRating}
                        onChange={(e) => setAgeRating(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        {AGE_RATINGS.map((ar) => (
                          <option key={ar} value={ar}>
                            {ar}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Language, Country, Video Quality */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Language *</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Country *</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Video Quality *</label>
                      <select
                        value={videoQuality}
                        onChange={(e) => setVideoQuality(e.target.value)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        {VIDEO_QUALITIES.map((vq) => (
                          <option key={vq} value={vq}>
                            {vq}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Movie Type, Status, Featured Switch */}
                  <div className="grid grid-cols-3 gap-2.5 items-center">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Movie Type *</label>
                      <select
                        value={movieType}
                        onChange={(e) => setMovieType(e.target.value as any)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        <option value="Movie">Movie</option>
                        <option value="Series">Series</option>
                        <option value="Animation">Animation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Status *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                      >
                        <option value="published">● Published</option>
                        <option value="awaiting">○ Awaiting</option>
                      </select>
                    </div>
                    <div className="pt-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="w-4 h-4 accent-[#F20D28] rounded cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-200">Featured Tonight</span>
                      </label>
                    </div>
                  </div>

                  {/* Trending and Recently Added Toggles */}
                  <div className="pt-2 border-t border-white/5 flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTrending}
                        onChange={(e) => setIsTrending(e.target.checked)}
                        className="w-4 h-4 accent-[#F20D28] rounded cursor-pointer"
                      />
                      <span className="font-medium text-zinc-300">Show in Trending</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecentlyAdded}
                        onChange={(e) => setIsRecentlyAdded(e.target.checked)}
                        className="w-4 h-4 accent-[#F20D28] rounded cursor-pointer"
                      />
                      <span className="font-medium text-zinc-300">Show in Recently Added</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: VIDEO STREAM URL */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Video Stream URL
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Paste Video Stream URL <span className="text-[#F20D28]">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="Paste Video Stream URL (e.g. https://domain.com/movie.mp4 or .m3u8)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#F20D28] rounded-xl px-3.5 py-3 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none transition-colors shadow-inner"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Direct streaming link (MP4, WebM, HLS m3u8, or CDN URL). Heavy binary file uploads are replaced by instant URL streaming.
                    </p>
                  </div>

                  {/* Video URL Stream Preview */}
                  {videoUrl && (
                    <div className="bg-[#0a0b10] border border-white/10 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Stream URL Ready</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[200px]">
                          {videoUrl}
                        </span>
                      </div>

                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/10">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-contain"
                          onError={() => console.warn('Preview video stream load notice')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 6: SEARCH METADATA */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    6
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Search Metadata
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      Search Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. action, blockbuster, luganda, war, chase"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      Lead Actors / Cast Members
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Star, Supporting Actor"
                      value={cast}
                      onChange={(e) => setCast(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                RIGHT COLUMN: 2. Poster & Backdrop, 4. VJ Assignment, 5. Genres
               ======================================================== */}
            <div className="space-y-6">
              {/* SECTION 2: POSTER & BACKDROP STREAM URLs */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Poster & Backdrop URLs
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Poster Image URL Input */}
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Paste Poster Image URL <span className="text-[#F20D28]">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="Paste Poster Image URL (e.g. https://domain.com/poster.jpg)"
                      value={posterUrl}
                      onChange={(e) => setPosterUrl(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#F20D28] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none transition-colors shadow-inner"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Direct HTTPS image link for movie poster thumbnail (2:3 aspect ratio).
                    </p>
                  </div>

                  {/* Backdrop Image URL Input */}
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1.5">
                      Paste Backdrop Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="Paste Backdrop Image URL (e.g. https://domain.com/backdrop.jpg)"
                      value={backdropUrl}
                      onChange={(e) => setBackdropUrl(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/15 focus:border-[#F20D28] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none transition-colors shadow-inner"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Wide 16:9 banner for hero background. If omitted, the poster URL is used automatically.
                    </p>
                  </div>

                  {/* Poster & Backdrop Live Previews */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Poster Preview */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Poster Preview</span>
                      {posterUrl ? (
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/15 bg-black group">
                          <img
                            src={posterUrl}
                            alt="Poster Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setPosterUrl('')}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                            title="Clear poster URL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-[2/3] w-full border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-[#0a0b10]">
                          <ImageIcon className="w-6 h-6 text-zinc-500 mb-1" />
                          <span className="text-xs text-zinc-500">Paste poster URL above to preview</span>
                        </div>
                      )}
                    </div>

                    {/* Backdrop Preview */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Backdrop Preview</span>
                      {backdropUrl || posterUrl ? (
                        <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/15 bg-black group">
                          <img
                            src={backdropUrl || posterUrl}
                            alt="Backdrop Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                          {backdropUrl && (
                            <button
                              type="button"
                              onClick={() => setBackdropUrl('')}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                              title="Clear backdrop URL"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[16/9] w-full border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-[#0a0b10]">
                          <ImageIcon className="w-6 h-6 text-zinc-500 mb-1" />
                          <span className="text-xs text-zinc-500">Paste backdrop URL above to preview</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Logo & Accent Color Row */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-[11px] text-zinc-400 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoDataUrl ? 'Change Title Logo' : 'Upload Title Logo'}</span>
                      </button>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/png,image/*"
                        onChange={handleLogoSelected}
                        className="hidden"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400">Accent:</span>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: VJ ASSIGNMENT (WITH DEVICE UPLOAD VJ AVATAR) */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                      4
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      VJ Assignment
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddVjModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#F20D28] hover:bg-[#d60b23] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-transform hover:scale-105 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New VJ</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Selected VJ Card */}
                  <div className="flex items-center gap-3.5 bg-[#0a0b10] border border-white/10 rounded-xl p-3">
                    <div className="relative w-13 h-13 rounded-full ring-2 ring-[#F20D28] overflow-hidden shrink-0 bg-zinc-900 shadow">
                      {selectedVjAvatarUrl ? (
                        <img
                          src={selectedVjAvatarUrl}
                          alt={selectedVjName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                          VJ
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Selected Video Jockey
                        </label>
                        <button
                          type="button"
                          onClick={() => selectedVjAvatarInputRef.current?.click()}
                          className="text-[11px] font-bold text-[#F20D28] hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Photo</span>
                        </button>
                        <input
                          type="file"
                          ref={selectedVjAvatarInputRef}
                          accept="image/*"
                          onChange={handleSelectedVjAvatarSelected}
                          className="hidden"
                        />
                      </div>
                      <select
                        value={selectedVjName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setSelectedVjName(name);
                          const found = vjsList.find((v) => v.name === name);
                          if (found) {
                            setSelectedVjAvatarUrl(found.avatar_url);
                            setVjBio(found.bio || '');
                          }
                        }}
                        className="w-full bg-[#121319] border border-white/10 rounded-lg p-2 text-white font-bold focus:outline-none focus:border-[#F20D28]"
                      >
                        {vjsList.map((v) => (
                          <option key={v.id} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                        {/* Preset options if storage is fresh */}
                        {vjsList.length === 0 && (
                          <>
                            <option value="VJ Junior">VJ Junior</option>
                            <option value="VJ Mark">VJ Mark</option>
                            <option value="VJ Ice P">VJ Ice P</option>
                            <option value="VJ Emmy">VJ Emmy</option>
                            <option value="VJ Jingo">VJ Jingo</option>
                            <option value="VJ K-Frank">VJ K-Frank</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      VJ Bio / Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Short description about the VJ..."
                      value={vjBio}
                      onChange={(e) => setVjBio(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#F20D28]"
                    />
                  </div>
                </div>

                {/* Sub-Modal / Drawer to Add New VJ */}
                {showAddVjModal && (
                  <div className="p-4 bg-[#0a0b10] border border-red-500/30 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F20D28]" />
                        <span>Create New VJ Profile</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddVjModal(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full ring-2 ring-[#F20D28] overflow-hidden shrink-0 bg-zinc-900">
                        {newVjAvatarUrl ? (
                          <img
                            src={newVjAvatarUrl}
                            alt="New VJ"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                            VJ
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => newVjAvatarInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload VJ Photo from Device</span>
                        </button>
                        <input
                          type="file"
                          ref={newVjAvatarInputRef}
                          accept="image/*"
                          onChange={handleNewVjAvatarSelected}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter VJ Name (e.g. VJ Junior)"
                      value={newVjName}
                      onChange={(e) => setNewVjName(e.target.value)}
                      className="w-full bg-[#121319] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#F20D28]"
                    />

                    <input
                      type="text"
                      placeholder="VJ Bio / Specialty (e.g. Action Specialist)"
                      value={newVjBio}
                      onChange={(e) => setNewVjBio(e.target.value)}
                      className="w-full bg-[#121319] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#F20D28]"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddVjModal(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewVj}
                        className="px-3 py-1.5 rounded-lg bg-[#F20D28] hover:bg-[#d60b23] text-white text-xs font-bold shadow cursor-pointer"
                      >
                        Save VJ
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: GENRES & CATEGORISATION */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    5
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Genres & Categorisation
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      Primary Genre <span className="text-[#F20D28]">*</span>
                    </label>
                    <select
                      value={primaryGenre}
                      onChange={(e) => setPrimaryGenre(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-[#F20D28]"
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
                      All Genres (Click to Select):
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
                                ? 'bg-[#F20D28] text-white shadow'
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
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            BOTTOM ACTION BAR (Matching Screenshot)
           ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-[#121319]">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#F20D28] inline-block animate-pulse" />
            <span>All media files & posters stored securely from your device</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
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
              className="px-6 py-2.5 rounded-xl bg-[#F20D28] hover:bg-[#d60b23] text-white font-bold text-xs shadow-lg shadow-red-700/40 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish to Live Sakanet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMovieUploadModal;
