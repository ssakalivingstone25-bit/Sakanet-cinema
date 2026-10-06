import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  Check,
  Palette,
  Eye,
  Sliders,
  Sparkles,
  LayoutGrid,
  Maximize2,
  Film,
  Play,
  Star,
} from 'lucide-react';
import { UserProfile, DownloadItem } from '../types';

interface SettingsViewProps {
  user?: UserProfile;
  downloads?: DownloadItem[];
  isOfflineMode?: boolean;
  onToggleOfflineMode?: (offline: boolean) => void;
  onOpenAuth?: () => void;
  onUserUpdated?: () => void;
}

export type ThemeOption = 'dark' | 'light' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = React.memo(() => {
  // Theme state
  const [theme, setTheme] = useState<ThemeOption>(() => {
    return (localStorage.getItem('sakanet_theme') as ThemeOption) || 'dark';
  });

  // Display density preference
  const [gridDensity, setGridDensity] = useState<'spacious' | 'compact'>(() => {
    return (localStorage.getItem('sakanet_grid_density') as 'spacious' | 'compact') || 'spacious';
  });

  // High contrast mode
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('sakanet_high_contrast') === 'true';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem('sakanet_theme', newTheme);

    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'oled');

    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else if (newTheme === 'light') {
      root.classList.add('light');
      root.style.colorScheme = 'light';
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
      root.style.colorScheme = systemDark ? 'dark' : 'light';
    }

    const label =
      newTheme === 'dark'
        ? 'Cinema Dark (Red & Black)'
        : newTheme === 'light'
        ? 'Clear White & Red'
        : 'System Theme';
    showToast(`Appearance updated to ${label}`);
  };

  const handleDensityChange = (density: 'spacious' | 'compact') => {
    setGridDensity(density);
    localStorage.setItem('sakanet_grid_density', density);
    showToast(`Catalog layout set to ${density === 'spacious' ? 'Cinematic Spacious' : 'High-Density Compact'}`);
  };

  const handleContrastToggle = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem('sakanet_high_contrast', next ? 'true' : 'false');
    const root = document.documentElement;
    if (next) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    showToast(next ? 'High Contrast typography enabled' : 'Standard contrast restored');
  };

  // Listen for system color scheme changes if system theme is selected
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 select-none pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#E50914] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#E50914] mb-1.5">
          <Palette className="w-4 h-4" />
          <span>Interface Configuration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white dark:text-white light:text-slate-900">
          Appearance &amp; Theme
        </h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
          Choose a tailored cinema color palette and layout density. All settings apply instantly across your device.
        </p>
      </div>

      <div className="space-y-6">
        {/* ========================================================
            THEME SELECTION (Red & Black Dark vs Clear White & Red Light)
           ======================================================== */}
        <section className="bg-[#121319] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Theme Colorway</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select your preferred visual style and color balance.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-zinc-300">
              Active: {theme === 'dark' ? 'Cinema Red & Black' : theme === 'light' ? 'Clear White & Red' : 'Device System'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1. Cinema Dark (Red & Black) */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                theme === 'dark'
                  ? 'border-[#E50914] bg-gradient-to-b from-[#181922] to-[#0f1015] shadow-lg shadow-red-950/40'
                  : 'border-white/10 bg-[#09090b]/80 hover:border-white/25 hover:bg-[#14151e]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-black border border-white/15 flex items-center justify-center text-[#E50914]">
                    <Moon className="w-4 h-4" />
                  </div>
                  {theme === 'dark' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E50914] bg-red-600/10 px-2 py-0.5 rounded-full border border-red-500/30">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Cinema Dark
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Deep obsidian black canvas with authentic cinema red accents. Optimized for low-light cinema viewing.
                </p>
              </div>

              {/* Swatch preview */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono">Palette</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="w-4 h-4 rounded-full bg-[#09090b] border border-white/20" title="Obsidian Black" />
                  <span className="w-4 h-4 rounded-full bg-[#181922] border border-white/20" title="Charcoal Surface" />
                  <span className="w-4 h-4 rounded-full bg-[#E50914]" title="Cinema Red" />
                  <span className="w-4 h-4 rounded-full bg-white" title="White Text" />
                </div>
              </div>
            </button>

            {/* 2. Clear White & Red (Light Theme) */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                theme === 'light'
                  ? 'border-[#E50914] bg-gradient-to-b from-[#181922] to-[#0f1015] shadow-lg shadow-red-950/40'
                  : 'border-white/10 bg-[#09090b]/80 hover:border-white/25 hover:bg-[#14151e]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#E50914]">
                    <Sun className="w-4 h-4" />
                  </div>
                  {theme === 'light' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E50914] bg-red-600/10 px-2 py-0.5 rounded-full border border-red-500/30">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Clear White &amp; Red
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Clean, crisp white canvas with scarlet red accents and deep charcoal typography. High-clarity daylight reading.
                </p>
              </div>

              {/* Swatch preview */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono">Palette</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="w-4 h-4 rounded-full bg-[#FFFFFF] border border-slate-300" title="Pure White" />
                  <span className="w-4 h-4 rounded-full bg-[#F1F5F9] border border-slate-300" title="Soft Slate" />
                  <span className="w-4 h-4 rounded-full bg-[#E50914]" title="Cinema Red" />
                  <span className="w-4 h-4 rounded-full bg-[#0F172A]" title="Deep Charcoal" />
                </div>
              </div>
            </button>

            {/* 3. Match Device System */}
            <button
              onClick={() => handleThemeChange('system')}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                theme === 'system'
                  ? 'border-[#E50914] bg-gradient-to-b from-[#181922] to-[#0f1015] shadow-lg shadow-red-950/40'
                  : 'border-white/10 bg-[#09090b]/80 hover:border-white/25 hover:bg-[#14151e]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/15 flex items-center justify-center text-zinc-200">
                    <Monitor className="w-4 h-4" />
                  </div>
                  {theme === 'system' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E50914] bg-red-600/10 px-2 py-0.5 rounded-full border border-red-500/30">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Match Device System
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Automatically syncs with your operating system settings. Switches to Red &amp; Black at night and White &amp; Red by day.
                </p>
              </div>

              {/* Swatch preview */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono">Dynamic</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-[#09090b] to-[#FFFFFF] border border-white/30" />
                  <span className="w-4 h-4 rounded-full bg-[#E50914]" />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* ========================================================
            LAYOUT DENSITY & TYPOGRAPHY PREFERENCES
           ======================================================== */}
        <section className="bg-[#121319] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Layout &amp; Typography</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Customize poster spacing and contrast for optimal browsing comfort.
            </p>
          </div>

          <div className="space-y-4 divide-y divide-white/5">
            {/* Grid Layout Density */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#E50914]" />
                  <span>Poster Catalog Density</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Adjust thumbnail size and whitespace between movie cards in the catalog.
                </div>
              </div>

              <div className="inline-flex bg-zinc-950 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleDensityChange('spacious')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    gridDensity === 'spacious'
                      ? 'bg-[#E50914] text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Cinematic Spacious
                </button>
                <button
                  type="button"
                  onClick={() => handleDensityChange('compact')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    gridDensity === 'compact'
                      ? 'bg-[#E50914] text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  High-Density Compact
                </button>
              </div>
            </div>

            {/* High Contrast Mode */}
            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#E50914]" />
                  <span>Enhanced Typographic Contrast</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Increases contrast of secondary movie metadata, genres, and release years for maximum legibility.
                </div>
              </div>

              <button
                type="button"
                onClick={handleContrastToggle}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  highContrast ? 'bg-[#E50914]' : 'bg-zinc-800'
                }`}
                aria-label="Toggle High Contrast"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 left-0.5 ${
                    highContrast ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            LIVE PALETTE SHOWCASE (Humanistic Preview)
           ======================================================== */}
        <section className="bg-[#121319] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E50914]" />
                <span>Live Interface Preview</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time sample of headers, metadata tags, and action buttons in your active palette.
              </p>
            </div>
          </div>

          <div
            className={`p-5 rounded-xl border transition-all ${
              theme === 'light'
                ? 'bg-[#FFFFFF] border-slate-200 text-[#0F172A]'
                : 'bg-[#09090b] border-white/15 text-white'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E50914] uppercase tracking-wider">
                    Sakanet Cinema Edition
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}>
                    4K Ultra HD
                  </span>
                </div>
                <h4 className={`text-lg font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Cinema Experience Showcase
                </h4>
                <p className={`text-xs max-w-md ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Handcrafted layout paired with pure cinema red accents and typographic hierarchy designed for effortless viewing.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-[#d60b23] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-transform active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Watch Trailer</span>
                </button>
                <div
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                    theme === 'light'
                      ? 'bg-slate-100 border-slate-300 text-slate-800'
                      : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>5.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

export default SettingsView;
