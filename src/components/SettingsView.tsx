import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  Shield,
  Bell,
  HardDrive,
  Download,
  Wifi,
  Trash2,
  Lock,
  LogOut,
  User,
  Check,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserProfile, DownloadItem } from '../types';
import { signOutUser } from '../services/firebase';
import { storageService } from '../services/storageService';

interface SettingsViewProps {
  user: UserProfile;
  downloads: DownloadItem[];
  isOfflineMode: boolean;
  onToggleOfflineMode: (offline: boolean) => void;
  onOpenAuth: () => void;
  onUserUpdated?: () => void;
}

export type ThemeOption = 'dark' | 'light' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  downloads,
  isOfflineMode,
  onToggleOfflineMode,
  onOpenAuth,
  onUserUpdated,
}) => {
  // Theme state
  const [theme, setTheme] = useState<ThemeOption>(() => {
    return (localStorage.getItem('sakanet_theme') as ThemeOption) || 'dark';
  });

  // Streaming quality preference
  const [streamQuality, setStreamQuality] = useState<string>(() => {
    return localStorage.getItem('sakanet_stream_quality') || 'auto';
  });

  // Autoplay toggle
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    return localStorage.getItem('sakanet_autoplay') !== 'false';
  });

  // Storage calculation
  const totalDownloadedMB = downloads.reduce(
    (acc, item) => acc + (item.status === 'completed' ? item.file_size_mb : 0),
    0
  );

  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem('sakanet_theme', newTheme);

    // Apply theme to document root
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (newTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // System
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
    showToast(`Theme updated to ${newTheme}`);
  };

  const handleQualityChange = (quality: string) => {
    setStreamQuality(quality);
    localStorage.setItem('sakanet_stream_quality', quality);
    showToast(`Streaming quality set to ${quality}`);
  };

  const handleAutoPlayToggle = () => {
    const nextVal = !autoPlayNext;
    setAutoPlayNext(nextVal);
    localStorage.setItem('sakanet_autoplay', nextVal ? 'true' : 'false');
    showToast(nextVal ? 'Autoplay enabled' : 'Autoplay disabled');
  };

  const handleClearCache = () => {
    storageService.clearAllDownloads();
    showToast('Offline media cache cleared');
    setConfirmClearCache(false);
    onUserUpdated?.();
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      storageService.clearUser();
      window.location.reload();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 text-white font-sans select-none pb-24">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Customize your playback, theme, storage, and account preferences
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-full border-2 border-red-500 overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-zinc-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">{user.name}</h3>
              {user.role === 'admin' && (
                <span className="bg-red-600/30 border border-red-500/40 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-[220px] sm:max-w-none">
              {user.email || 'Guest Visitor'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Switch Account / Sign Out</span>
        </button>
      </div>

      {/* 1. APPEARANCE & THEME */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Appearance & Theme</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Dark Mode */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-red-600/20 border-red-500 text-white'
                : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <Moon className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">Dark</span>
            <span className="text-[10px] text-zinc-400">Default Cinema</span>
          </button>

          {/* Light Mode */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-red-600/20 border-red-500 text-white'
                : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <Sun className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">Light</span>
            <span className="text-[10px] text-zinc-400">Clean High Contrast</span>
          </button>

          {/* System Default */}
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-red-600/20 border-red-500 text-white'
                : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <Monitor className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">System</span>
            <span className="text-[10px] text-zinc-400">Sync with Device</span>
          </button>
        </div>
      </div>

      {/* 2. PLAYBACK & STREAMING PREFERENCES */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
          <Wifi className="w-4 h-4" />
          <span>Playback & Streaming</span>
        </div>

        {/* Streaming Resolution */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-white">Default Video Quality</div>
            <div className="text-xs text-zinc-400">Adaptive bitrate will adjust based on connection</div>
          </div>
          <select
            value={streamQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
            className="bg-zinc-900 border border-white/15 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="auto">Auto (Adaptive)</option>
            <option value="4k">4K Ultra HD (High Data)</option>
            <option value="1080p">1080p Full HD</option>
            <option value="720p">720p HD (Data Saver)</option>
          </select>
        </div>

        {/* Autoplay Next */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div>
            <div className="text-sm font-semibold text-white">Autoplay Next Episode / Movie</div>
            <div className="text-xs text-zinc-400">Automatically start the next title upon finish</div>
          </div>
          <button
            onClick={handleAutoPlayToggle}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              autoPlayNext ? 'bg-red-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 left-0.5 ${
                autoPlayNext ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. DOWNLOADS & STORAGE MANAGEMENT */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
          <HardDrive className="w-4 h-4" />
          <span>Storage & Offline Encrypted Media</span>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm font-semibold text-white">Downloaded Movies Size</div>
            <div className="text-xs text-zinc-400">
              {downloads.filter((d) => d.status === 'completed').length} titles stored in IndexedDB
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {totalDownloadedMB.toFixed(1)} MB
          </span>
        </div>

        {/* Clear Media Storage Button */}
        <div className="pt-2">
          {confirmClearCache ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearCache}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Yes, Clear All Offline Media
              </button>
              <button
                onClick={() => setConfirmClearCache(false)}
                className="bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClearCache(true)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-red-400 py-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Offline Downloads Storage</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. SECURITY & SYSTEM INFO */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>System Information</span>
        </div>

        <div className="text-xs text-zinc-400 space-y-2">
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span>App Version</span>
            <span className="font-mono text-zinc-300">Sakanet Cinema v2.4 (Android Build)</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span>Admin Control Authority</span>
            <span className="font-mono text-zinc-300">ssakalivingstone25@gmail.com</span>
          </div>
          <div className="flex justify-between">
            <span>Cloud Database Sync</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Connected (Cloud Firestore)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
