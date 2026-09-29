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
import { mediaDB } from '../services/mediaDB';

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

  // Section 2: Media Files (Device Image Uploads - NO URLs)
  const [posterDataUrl, setPosterDataUrl] = useState<string>('');
  const [backdropDataUrl, setBackdropDataUrl] = useState<string>('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('#F20D28');

  // Section 3: Video File Upload from device
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<string>('1920x1080');
  const [videoFormat, setVideoFormat] = useState<string>('MP4');
  const [isExtractingVideo, setIsExtractingVideo] = useState<boolean>(false);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);

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
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
      setPosterDataUrl(editingMovie.thumbnail_url || '');
      setBackdropDataUrl(editingMovie.banner_url || '');
      setAccentColor(editingMovie.accent_color || '#F20D28');
      setVideoUrl(editingMovie.file_url || '');
      setFileSizeMb(editingMovie.file_size_mb || 0);
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
      setPosterDataUrl('');
      setBackdropDataUrl('');
      setLogoDataUrl('');
      setAccentColor('#F20D28');
      setVideoFile(null);
      setVideoUrl('');
      setFileSizeMb(0);
      setExtractedFrames([]);
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
        setSelectedVjAvatarUrl(
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80'
        );
        setVjBio('Uganda’s premier blockbuster translator');
      }
    }
  }, [isOpen, editingMovie]);

  if (!isOpen) return null;

  // File Handlers for Direct Device Uploads (NO URLs!)
  const handlePosterSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPosterDataUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackdropSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBackdropDataUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  // Video File Ingestion from device
  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    setFileSizeMb(sizeMb);
    setVideoFormat(file.name.split('.').pop()?.toUpperCase() || 'MP4');

    // Auto-fill title if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName);
    }

    setIsExtractingVideo(true);

    try {
      const objectUrl = URL.createObjectURL(file);
      setVideoUrl(objectUrl);

      // Create hidden video element to read metadata and extract snapshot frames
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;

      await new Promise<void>((resolve) => {
        tempVideo.onloadedmetadata = () => {
          const duration = Math.max(1, Math.round(tempVideo.duration / 60));
          setDurationMinutes(duration);
          if (tempVideo.videoWidth && tempVideo.videoHeight) {
            setVideoResolution(`${tempVideo.videoWidth}x${tempVideo.videoHeight}`);
          }
          resolve();
        };
        tempVideo.onerror = () => resolve();
      });

      // Capture frames for automatic thumbnail generation
      const snapshots: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const captureAt = async (timeSec: number): Promise<string | null> => {
        return new Promise((res) => {
          tempVideo.currentTime = timeSec;
          tempVideo.onseeked = () => {
            if (ctx) {
              ctx.drawImage(tempVideo, 0, 0, 480, 720);
              res(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              res(null);
            }
          };
          tempVideo.onerror = () => res(null);
        });
      };

      const d = tempVideo.duration || 10;
      const f1 = await captureAt(Math.min(3, d / 4));
      if (f1) snapshots.push(f1);
      const f2 = await captureAt(Math.min(10, d / 2));
      if (f2) snapshots.push(f2);

      setExtractedFrames(snapshots);

      // If user hasn't uploaded a poster yet, auto-set first extracted frame
      if (!posterDataUrl && snapshots[0]) {
        setPosterDataUrl(snapshots[0]);
      }
      if (!backdropDataUrl && (snapshots[1] || snapshots[0])) {
        setBackdropDataUrl(snapshots[1] || snapshots[0]);
      }
    } catch (err) {
      console.warn('Video extraction error:', err);
    } finally {
      setIsExtractingVideo(false);
    }
  };

  // Save New VJ with Device Avatar
  const handleSaveNewVj = () => {
    if (!newVjName.trim()) {
      setErrorMessage('Please enter a name for the new VJ.');
      return;
    }

    const created = storageService.addVJ({
      name: newVjName.trim(),
      avatar_url:
        newVjAvatarUrl ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
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

    if (!synopsis.trim()) {
      setErrorMessage('Please provide a Plot Synopsis for this movie.');
      setActiveStepTab(1);
      return;
    }

    if (!posterDataUrl) {
      setErrorMessage('Please upload a Poster image from your device.');
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

      const isLive = publishDirectly || status === 'published';

      if (editingMovie) {
        // Update existing movie
        const updated = storageService.updateMovie(editingMovie.id, {
          title: title.trim(),
          original_title: originalTitle.trim(),
          synopsis: synopsis.trim(),
          genre: primaryGenre,
          release_year: releaseYear,
          duration_minutes: durationMinutes,
          age_rating: ageRating,
          language,
          country,
          movie_type: movieType,
          is_active: isLive,
          is_featured: isFeatured,
          is_trending: isTrending,
          is_recently_added: isRecentlyAdded,
          accent_color: accentColor,
          vj_name: selectedVjName,
          vj_avatar_url: selectedVjAvatarUrl,
          vj_bio: vjBio,
          director: selectedVjName || director,
          cast: castArray.length ? castArray : ['Lead Performer'],
          keywords: keywordsArray,
          thumbnail_url: posterDataUrl,
          banner_url: backdropDataUrl || posterDataUrl,
          file_url: videoUrl || editingMovie.file_url,
          file_size_mb: fileSizeMb || editingMovie.file_size_mb,
        });

        // If new video file selected from device, save to IndexedDB
        if (videoFile) {
          await mediaDB.saveVideoBlob(editingMovie.id, videoFile);
        }

        if (updated) {
          onSaved(updated);
        }
      } else {
        // Add brand new movie
        const newMovie = storageService.addMovie({
          title: title.trim(),
          original_title: originalTitle.trim(),
          synopsis: synopsis.trim(),
          genre: primaryGenre,
          release_year: releaseYear,
          duration_minutes: durationMinutes,
          age_rating: ageRating,
          language,
          country,
          movie_type: movieType,
          is_active: isLive,
          is_featured: isFeatured,
          is_trending: isTrending,
          is_recently_added: isRecentlyAdded,
          accent_color: accentColor,
          vj_name: selectedVjName,
          vj_avatar_url: selectedVjAvatarUrl,
          vj_bio: vjBio,
          director: selectedVjName || director,
          cast: castArray.length ? castArray : ['Lead Performer'],
          keywords: keywordsArray,
          thumbnail_url: posterDataUrl,
          banner_url: backdropDataUrl || posterDataUrl,
          file_url: videoUrl,
          download_permission: 'free',
          file_size_mb: fileSizeMb || 850,
          video_qualities: [videoQuality as any],
          audio_tracks: [language, 'English [Stereo]'],
          subtitles: ['English [CC]'],
        });

        // Persist binary video file into IndexedDB
        if (videoFile) {
          await mediaDB.saveVideoBlob(newMovie.id, videoFile);
        }

        onSaved(newMovie);
      }

      onClose();
    } catch (err) {
      console.error('Error saving movie:', err);
      setErrorMessage('Failed to save movie. Please verify your device file selections.');
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

              {/* SECTION 3: VIDEO UPLOAD (FROM DEVICE) */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Video Upload
                  </h3>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-[#F20D28]/60 bg-[#0a0b10] rounded-2xl p-6 text-center cursor-pointer transition-all group"
                >
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/mp4,video/mkv,video/webm,video/*"
                    onChange={handleVideoFileSelected}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center text-[#F20D28] mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                    Drag & drop your movie file here or <span className="text-[#F20D28]">click to browse</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Supported: MP4, MKV, WebM (Max 10GB). File is saved securely on your device.
                  </p>
                </div>

                {/* Upload Progress & Metadata */}
                {(videoFile || videoUrl) && (
                  <div className="bg-[#0a0b10] border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="font-semibold truncate max-w-[200px]">
                        {videoFile?.name || title || 'Loaded Video'}
                      </span>
                      <span className="text-emerald-400 font-mono">Ready to Stream</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/5 text-[11px] text-zinc-400 font-mono">
                      <div>
                        <span className="text-zinc-500 block">File Size:</span>
                        <span className="text-white font-semibold">{fileSizeMb} MB</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Resolution:</span>
                        <span className="text-white font-semibold">{videoResolution}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Duration:</span>
                        <span className="text-white font-semibold">{durationMinutes} min</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Format:</span>
                        <span className="text-white font-semibold">{videoFormat}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-extracted Video Snapshots */}
                {extractedFrames.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      Auto-Generated Video Snapshots (Click to set as Poster):
                    </span>
                    <div className="flex items-center gap-3">
                      {extractedFrames.map((frame, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPosterDataUrl(frame)}
                          className="relative aspect-[2/3] w-20 rounded-lg overflow-hidden border border-white/20 hover:border-[#F20D28] cursor-pointer group shadow"
                        >
                          <img src={frame} alt="Snapshot" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity">
                            Use
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              {/* SECTION 2: POSTER & BACKDROP (DEVICE UPLOADS ONLY - NO URLS) */}
              <div className="bg-[#121319] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#F20D28] text-white flex items-center justify-center text-xs font-bold shadow">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Poster & Backdrop
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Poster (Portrait 2:3) */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-300 font-semibold text-xs">
                      Poster (Portrait 2:3) <span className="text-[#F20D28]">*</span>
                    </label>

                    {posterDataUrl ? (
                      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/15 bg-black group">
                        <img
                          src={posterDataUrl}
                          alt="Poster"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={() => posterInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosterDataUrl('')}
                            className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => posterInputRef.current?.click()}
                        className="aspect-[2/3] w-full border-2 border-dashed border-white/15 hover:border-[#F20D28] rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-[#0a0b10] transition-colors"
                      >
                        <ImageIcon className="w-7 h-7 text-zinc-400 mb-1.5" />
                        <span className="text-xs font-bold text-white">Upload Poster</span>
                        <span className="text-[10px] text-zinc-500">JPG, PNG (Max 5MB)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={posterInputRef}
                      accept="image/*"
                      onChange={handlePosterSelected}
                      className="hidden"
                    />
                  </div>

                  {/* Backdrop (Landscape 16:9) */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-300 font-semibold text-xs">
                      Backdrop (Landscape 16:9)
                    </label>

                    {backdropDataUrl ? (
                      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/15 bg-black group">
                        <img
                          src={backdropDataUrl}
                          alt="Backdrop"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={() => backdropInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setBackdropDataUrl('')}
                            className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => backdropInputRef.current?.click()}
                        className="aspect-[16/9] w-full border-2 border-dashed border-white/15 hover:border-[#F20D28] rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-[#0a0b10] transition-colors"
                      >
                        <ImageIcon className="w-7 h-7 text-zinc-400 mb-1.5" />
                        <span className="text-xs font-bold text-white">Upload Backdrop</span>
                        <span className="text-[10px] text-zinc-500">JPG, PNG (Max 10MB)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={backdropInputRef}
                      accept="image/*"
                      onChange={handleBackdropSelected}
                      className="hidden"
                    />

                    {/* Logo & Accent Color Row */}
                    <div className="pt-2 flex items-center justify-between gap-3">
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
