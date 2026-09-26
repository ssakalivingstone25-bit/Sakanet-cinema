import React, { useState } from 'react';
import { DownloadCloud, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'mobile-badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // If not installable and not iOS (e.g. standard desktop browser without prompt), hide or show quick install instructions
  if (!isInstallable && !isIOS) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950/80 via-zinc-900 to-black border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 shadow-lg shadow-red-600/10">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                <span>Install Sakanet Cinema App</span>
                <span className="text-[10px] bg-red-500/20 text-red-400 font-mono px-2 py-0.5 rounded-full border border-red-500/30">
                  PWA Ready
                </span>
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Enjoy offline storage, full-screen playback, and instant launching from your home screen.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{isInstalling ? 'Installing...' : 'Install App on Phone'}</span>
          </button>
        </div>

        {/* iOS Guided Modal */}
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#121215] border border-white/10 p-6 shadow-2xl relative">
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                  <p className="text-xs text-zinc-400">Add to Home Screen in 2 steps</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-zinc-300 bg-zinc-900/60 border border-white/5 rounded-xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-white">Share</strong> button in Safari toolbar{' '}
                    <Share2 className="w-3.5 h-3.5 inline text-blue-400 ml-1" />.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-zinc-300 ml-1" />.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default navbar badge
  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-md shadow-red-600/20 border border-red-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Install Sakanet Cinema as an app on your device"
      >
        <DownloadCloud className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* iOS Safari Guided Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#121215] border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold">
                S
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-zinc-400">Add to Home Screen in 2 steps</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 bg-zinc-900/60 border border-white/5 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  Tap the <strong className="text-white">Share</strong> button in Safari toolbar{' '}
                  <Share2 className="w-3.5 h-3.5 inline text-blue-400 ml-1" />.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline text-zinc-300 ml-1" />.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
