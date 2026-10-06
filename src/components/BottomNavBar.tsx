import React from 'react';
import { Compass, Download, Settings, ShieldAlert, User } from 'lucide-react';
import { UserProfile } from '../types';

interface BottomNavBarProps {
  activeTab: 'settings' | 'browse' | 'downloads' | 'admin';
  onTabChange: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
  downloadsCount: number;
  activeDownloadsCount: number;
  user: UserProfile;
  onOpenAuth: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(({
  activeTab,
  onTabChange,
  downloadsCount,
  activeDownloadsCount,
  user,
  onOpenAuth,
}) => {
  const isAdmin = user?.email?.toLowerCase().trim() === 'ssakalivingstone25@gmail.com';

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 px-2 sm:px-6 safe-area-pb"
    >
      <div className="max-w-md md:max-w-lg lg:max-w-2xl mx-auto h-16 flex items-center justify-around select-none">
        {/* 1. Browse Catalog Tab */}
        <button
          onClick={() => onTabChange('browse')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative group ${
            activeTab === 'browse'
              ? 'text-[#F20D28] font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Browse Movies & TV Shows"
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'browse' ? 'stroke-[2.4] text-[#F20D28]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Browse</span>
          {activeTab === 'browse' && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-[#F20D28] rounded-full shadow-[0_0_8px_rgba(242,13,40,0.8)]" />
          )}
        </button>

        {/* 2. Downloads Tab */}
        <button
          onClick={() => onTabChange('downloads')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative group ${
            activeTab === 'downloads'
              ? 'text-[#F20D28] font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Downloaded Media"
        >
          <div className="relative">
            <Download className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'downloads' ? 'stroke-[2.4] text-[#F20D28]' : 'stroke-[1.8]'}`} />
            {activeDownloadsCount > 0 ? (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : downloadsCount > 0 ? (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono rounded-full bg-[#F20D28] text-white font-bold">
                {downloadsCount}
              </span>
            ) : null}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Downloads</span>
          {activeTab === 'downloads' && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-[#F20D28] rounded-full shadow-[0_0_8px_rgba(242,13,40,0.8)]" />
          )}
        </button>

        {/* 3. Settings Tab */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative group ${
            activeTab === 'settings'
              ? 'text-[#F20D28] font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="App & Streaming Settings"
        >
          <div className="relative">
            <Settings className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'settings' ? 'stroke-[2.4] text-[#F20D28]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Settings</span>
          {activeTab === 'settings' && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-[#F20D28] rounded-full shadow-[0_0_8px_rgba(242,13,40,0.8)]" />
          )}
        </button>

        {/* 4. Account Tab */}
        <button
          onClick={() => {
            if (isAdmin && activeTab !== 'admin') {
              onTabChange('admin');
            } else {
              onOpenAuth();
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative group ${
            activeTab === 'admin'
              ? 'text-[#F20D28] font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title={isAdmin ? 'Account & Administrator Control' : 'User Profile & Account'}
        >
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User'}
                referrerPolicy="no-referrer"
                className={`w-5 h-5 rounded-full object-cover border transition-transform group-hover:scale-110 ${
                  activeTab === 'admin' ? 'border-[#F20D28]' : 'border-white/20'
                }`}
              />
            ) : (
              <User className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'admin' ? 'stroke-[2.4] text-[#F20D28]' : 'stroke-[1.8]'}`} />
            )}
            {isAdmin && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#F20D28] animate-pulse" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Account</span>
          {activeTab === 'admin' && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-[#F20D28] rounded-full shadow-[0_0_8px_rgba(242,13,40,0.8)]" />
          )}
        </button>
      </div>
    </nav>
  );
});

export default BottomNavBar;
