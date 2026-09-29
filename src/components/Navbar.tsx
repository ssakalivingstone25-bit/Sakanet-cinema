import React, { useState } from 'react';
import {
  Film,
  Download,
  Wifi,
  WifiOff,
  Smartphone,
  Tv,
  Search,
  Check,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserProfile, DownloadItem } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: 'settings' | 'browse' | 'downloads' | 'admin';
  onTabChange: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
  isAndroidView: boolean;
  onToggleAndroidView: () => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: (offline: boolean) => void;
  user: UserProfile;
  downloads: DownloadItem[];
  searchTerm: string;
  onSearchChange: (q: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isAndroidView,
  onToggleAndroidView,
  isOfflineMode,
  onToggleOfflineMode,
  user,
  downloads,
  searchTerm,
  onSearchChange,
  onOpenAuth,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  const activeDownloads = downloads.filter((d) => d.status === 'downloading');
  const completedDownloads = downloads.filter((d) => d.status === 'completed');

  return (
    <header
      className={`sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-12 py-3.5 select-none transition-all ${
        activeTab === 'browse' ? 'hidden md:block' : 'block'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Single Text Element in Display Face) */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onTabChange('browse')}
            className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-1.5 focus:outline-none group"
          >
            <span className="text-red-600 transition-transform group-hover:scale-110 duration-200">
              SAKANET
            </span>
            <span className="text-[10px] font-sans font-semibold tracking-widest text-zinc-500 uppercase ml-1">
              CINEMA
            </span>
          </button>

          {/* Zone 2: Clean Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold tracking-wide">
            <button
              onClick={() => onTabChange('browse')}
              className={`transition-colors hover:text-white py-1 ${
                activeTab === 'browse'
                  ? 'text-red-500 border-b-2 border-red-600 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              Browse &amp; Discover
            </button>
            <button
              onClick={() => onTabChange('downloads')}
              className={`relative transition-colors hover:text-white py-1 flex items-center gap-1.5 ${
                activeTab === 'downloads'
                  ? 'text-red-500 border-b-2 border-red-600 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <span>Downloads</span>
              {activeDownloads.length > 0 ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              ) : completedDownloads.length > 0 ? (
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded">
                  {completedDownloads.length}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => onTabChange('settings')}
              className={`transition-colors hover:text-white py-1 ${
                activeTab === 'settings'
                  ? 'text-red-500 border-b-2 border-red-600 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              Settings
            </button>
            {user?.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`transition-colors hover:text-white py-1 flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'text-red-500 border-b-2 border-red-600 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Admin Portal</span>
              </button>
            )}
          </nav>
        </div>

        {/* Zone 3: 1-2 Primary Actions & Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search trigger */}
          <div className="relative">
            {showSearch ? (
              <div className="flex items-center bg-zinc-900 border border-white/20 rounded-lg px-2.5 py-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Titles, actors, genres..."
                  className="bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none w-36 sm:w-48"
                  onBlur={() => {
                    if (!searchTerm) setShowSearch(false);
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowSearch(true);
                  if (activeTab !== 'browse') onTabChange('browse');
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="Search movies"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* PWA In-App Install Prompt */}
          <PWAInstallButton variant="navbar" />

          {/* User Profile / Google OAuth Button */}
          <div className="flex items-center gap-2 pl-1 border-l border-white/10">
            {user.email ? (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2.5 p-1 pr-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 transition-all text-left group"
                title="View Google Account details & subscription"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight group-hover:text-red-400 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Google Auth
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
                title="Sign in with your Google account"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
