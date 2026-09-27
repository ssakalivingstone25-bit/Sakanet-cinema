import React from 'react';
import {
  Wifi,
  WifiOff,
  Signal,
  Settings,
  Compass,
  Download,
  ShieldAlert,
  Tv,
} from 'lucide-react';
import { UserProfile } from '../types';

interface AndroidAppFrameProps {
  children: React.ReactNode;
  activeTab: 'settings' | 'browse' | 'downloads' | 'admin';
  onTabChange: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
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
  const currentTime = '12:22';

  if (!isAndroidView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen py-4 px-2 flex flex-col items-center justify-center bg-black">
      {/* Device Viewport Switcher floating bar */}
      <div className="mb-3 flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-full px-4 py-1.5 shadow-xl text-xs">
        <span className="text-zinc-400 font-medium">Mobile View (Android Client)</span>
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 text-white hover:text-red-400 bg-red-600/30 border border-red-500/40 px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer"
        >
          <Tv className="w-3.5 h-3.5" /> Switch to Full Widescreen Web Mode
        </button>
      </div>

      {/* Android Device Mockup Shell */}
      <div className="relative w-full max-w-[430px] h-[900px] bg-[#0c0c0f] rounded-[44px] border-[8px] border-zinc-800 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Android Top Status Bar (Matching screenshot: 12:22, WhatsApp, Signal, WiFi, 87% Battery) */}
        <div className="relative z-30 pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-semibold text-zinc-300 bg-[#0c0c0f] select-none">
          <div className="flex items-center gap-2">
            <span className="tracking-tight">{currentTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-zinc-300" />
            {isOfflineMode ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-zinc-300" />
            )}
            <div className="flex items-center gap-1 text-[11px] bg-zinc-800/80 px-1.5 py-0.2 rounded-full border border-white/10">
              <span>87</span>
            </div>
          </div>
        </div>

        {/* Scrollable Android Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
          {children}
        </div>

        {/* Android Native Bottom Navigation Bar - Matching Screenshot Layout */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-16 bg-[#0c0c0f]/95 backdrop-blur-xl border-t border-white/10 px-4 flex items-center justify-around select-none">
          {/* Settings Tab (replaces previous Home tab) */}
          <button
            onClick={() => onTabChange('settings')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
              activeTab === 'settings'
                ? 'text-red-500 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
            {activeTab === 'settings' && (
              <span className="absolute -bottom-2 w-8 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>

          {/* Browse Tab (Default Home after login) */}
          <button
            onClick={() => onTabChange('browse')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
              activeTab === 'browse'
                ? 'text-red-500 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] mt-1 font-medium">Browse</span>
            {activeTab === 'browse' && (
              <span className="absolute -bottom-2 w-10 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>

          {/* Downloads Tab */}
          <button
            onClick={() => onTabChange('downloads')}
            className={`relative flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'downloads'
                ? 'text-red-500 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Download className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] mt-1 font-medium">Downloads</span>
            {activeDownloadsCount > 0 ? (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : downloadsCount > 0 ? (
              <span className="absolute -top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                {downloadsCount}
              </span>
            ) : null}
            {activeTab === 'downloads' && (
              <span className="absolute -bottom-2 w-10 h-0.5 bg-red-600 rounded-full" />
            )}
          </button>

          {/* Admin Tab (Shown for Livingstone or Admin users) */}
          {user?.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com' && (
            <button
              onClick={() => onTabChange('admin')}
              className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
                activeTab === 'admin'
                  ? 'text-red-500 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-5 h-5 stroke-[2]" />
              <span className="text-[10px] mt-1 font-medium">Admin</span>
              {activeTab === 'admin' && (
                <span className="absolute -bottom-2 w-8 h-0.5 bg-red-600 rounded-full" />
              )}
            </button>
          )}
        </div>

        {/* Android Bottom Gesture Bar */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-40 pointer-events-none" />
      </div>
    </div>
  );
};

export default AndroidAppFrame;
