import React from 'react';
import {
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Home,
  Compass,
  Download,
  ShieldAlert,
  Tv,
  Smartphone,
} from 'lucide-react';

import { UserProfile } from '../types';

interface AndroidAppFrameProps {
  children: React.ReactNode;
  activeTab: 'feed' | 'browse' | 'downloads' | 'admin';
  onTabChange: (tab: 'feed' | 'browse' | 'downloads' | 'admin') => void;
  isOfflineMode: boolean;
  downloadsCount: number;
  activeDownloadsCount: number;
  isAndroidView: boolean;
  onToggleViewMode: () => void;
  onOpenAuth?: () => void;
  user?: UserProfile;
}

export const AndroidAppFrame: React.FC<AndroidAppFrameProps> = ({
  children,
  activeTab,
  onTabChange,
  isOfflineMode,
  downloadsCount,
  activeDownloadsCount,
  isAndroidView,
  onToggleViewMode,
  onOpenAuth,
  user,
}) => {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!isAndroidView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen py-6 px-2 flex flex-col items-center justify-center bg-black/90">
      {/* Device Viewport Switcher floating hint */}
      <div className="mb-4 flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-full px-4 py-1.5 shadow-xl text-xs">
        <span className="text-zinc-400 font-medium">Mobile View (Android Client)</span>
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 text-white hover:text-red-400 bg-red-600/30 border border-red-500/40 px-2.5 py-1 rounded-full font-semibold transition-colors"
        >
          <Tv className="w-3.5 h-3.5" /> Switch to Full Widescreen Web Mode
        </button>
      </div>

      {/* Android Device Mockup Shell */}
      <div className="relative w-full max-w-[420px] h-[860px] bg-[#09090b] rounded-[48px] border-[10px] border-zinc-800 shadow-[0_25px_60px_-15px_rgba(229,9,20,0.25)] flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Front Camera Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800" />
        </div>

        {/* Android Status Bar */}
        <div className="relative z-30 pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-medium text-zinc-300 bg-black select-none">
          <span className="font-semibold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-2">
            <Signal className="w-3 h-3 text-zinc-300" />
            {isOfflineMode ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-zinc-300" />
            )}
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">98%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            </div>
          </div>
        </div>

        {/* Android Top App Bar */}
        <div className="relative z-20 px-4 py-2 bg-gradient-to-b from-black to-zinc-950 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-display font-black text-xl tracking-tight">
              SAKANET
            </span>
            <span className="text-[9px] font-mono text-zinc-400 border border-white/10 px-1.5 py-0.2 rounded">
              ANDROID v2.4
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOfflineMode && (
              <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded">
                OFFLINE ROOM
              </span>
            )}

            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/15 flex items-center justify-center overflow-hidden transition-all"
                title="Google Account"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : user?.email ? (
                  <span className="text-xs font-bold text-white">{user.name.charAt(0)}</span>
                ) : (
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
                )}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Android Body */}
        <div className="flex-1 overflow-y-auto cinema-scrollbar pb-16">
          {children}
        </div>

        {/* Android Native Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-16 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-white/10 px-3 flex items-center justify-around select-none">
          <button
            onClick={() => onTabChange('feed')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'feed' ? 'text-red-500 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home Feed</span>
          </button>

          <button
            onClick={() => onTabChange('browse')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'browse' ? 'text-red-500 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Browse</span>
          </button>

          <button
            onClick={() => onTabChange('downloads')}
            className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'downloads'
                ? 'text-red-500 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Downloads</span>
            {activeDownloadsCount > 0 ? (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : downloadsCount > 0 ? (
              <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                {downloadsCount}
              </span>
            ) : null}
          </button>

          {user?.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com' && (
            <button
              onClick={() => onTabChange('admin')}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                activeTab === 'admin' ? 'text-red-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Admin</span>
            </button>
          )}
        </div>

        {/* Android Bottom Home Gesture Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-40 pointer-events-none" />
      </div>
    </div>
  );
};
