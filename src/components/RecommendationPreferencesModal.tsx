import React, { useState } from 'react';
import { Sparkles, X, Check, Save, Sliders, Shield } from 'lucide-react';
import { AVAILABLE_GENRES, recommendationEngine } from '../services/recommendationEngine';

interface RecommendationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPreferences: string[];
  onPreferencesUpdated: (newPrefs: string[]) => void;
}

export const RecommendationPreferencesModal: React.FC<RecommendationPreferencesModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentPreferences,
  onPreferencesUpdated,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    return currentPreferences && currentPreferences.length > 0
      ? currentPreferences
      : ['Action', 'Sci-Fi'];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length === 1) return; // Keep at least one
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await recommendationEngine.saveUserGenrePreferences(userId, selectedGenres);
      onPreferencesUpdated(selectedGenres);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Error saving genre preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in">
      <div className="bg-[#121319] border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#161720]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 shadow-md">
              <Sliders className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
                <span>Genre Preferences</span>
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full font-sans">
                  Firestore
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Personalize recommendations to your taste
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="text-xs text-zinc-300 leading-relaxed">
            Select your favorite cinema genres. Our recommendation engine combines these preferences with your real-time watch history stored in Cloud Firestore to tailor your personalized movie feed.
          </div>

          {/* Genre Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-700/30 ring-1 ring-red-400'
                      : 'bg-[#1a1b24] hover:bg-[#222430] text-zinc-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  )}
                  <span>{genre}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-[11px] text-zinc-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Preferences are encrypted and stored in Firestore database: <code className="text-zinc-300 font-mono">ai-studio-sakanet-e2034e9a-6112-4f29-b445-7009f6a22938</code>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#15161f] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-700/30 transition-all cursor-pointer flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to Firestore!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationPreferencesModal;
