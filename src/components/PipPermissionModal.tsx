import React, { useState } from 'react';
import {
  ExternalLink,
  Shield,
  Smartphone,
  CheckCircle,
  X,
  PlaySquare,
  AlertTriangle,
  Info,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';

interface PipPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestPip?: () => Promise<boolean | void>;
}

export const PipPermissionModal: React.FC<PipPermissionModalProps> = ({
  isOpen,
  onClose,
  onTestPip,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'browser'>('android');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleTestPip = async () => {
    setTestStatus('testing');
    setFeedbackMsg('Requesting Picture-in-Picture screen pop-up...');

    try {
      if (onTestPip) {
        await onTestPip();
        setTestStatus('success');
        setFeedbackMsg('Picture-in-Picture screen pop-up launched successfully!');
      } else if (document.pictureInPictureEnabled) {
        setTestStatus('success');
        setFeedbackMsg('Picture-in-Picture is supported and active on your system!');
      } else {
        setTestStatus('failed');
        setFeedbackMsg('Picture-in-Picture was blocked. Please enable "Display over other apps" in device settings.');
      }
    } catch (err: any) {
      console.warn('PiP test error:', err);
      setTestStatus('failed');
      setFeedbackMsg(err?.message || 'Display over other apps permission required in phone settings.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in">
      <div className="bg-[#101116] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#15161d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-500 shadow-md">
              <PlaySquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
                <span>Display Over Other Apps</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Screen pop up (PiP) permission settings
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

        {/* Highlight Note Banner */}
        <div className="bg-red-950/40 border-b border-red-900/30 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-200/90 leading-relaxed font-medium">
            <span className="font-bold text-red-100">System Behavior: </span>
            The app triggers a floating <span className="underline decoration-red-400">Screen pop up (PiP)</span> when you exit or switch away while a video is playing.
            <span className="block mt-0.5 text-zinc-300 font-semibold italic">
              "Requires to go to phone settings to allow/turn on."
            </span>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex border-b border-white/10 bg-[#0c0d12] text-xs font-semibold px-4 pt-2">
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'android'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Phone</span>
          </button>
          <button
            onClick={() => setActiveTab('browser')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'browser'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Chrome / Browser</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ios'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[50vh] overflow-y-auto">
          {activeTab === 'android' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                Follow these quick steps on your Android device to allow background screen pop-ups:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-red-600/80 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-white">Open Phone Settings: </span>
                    <span className="text-zinc-300">Tap your device's Settings icon <SettingsIcon className="w-3 h-3 inline text-zinc-400" /></span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-red-600/80 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-white">Go to Apps & Permissions: </span>
                    <span className="text-zinc-300">Select <strong>Apps</strong> or <strong>Application Manager</strong>.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-red-600/80 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-white">Special App Access: </span>
                    <span className="text-zinc-300">Tap <strong>Special app access</strong> &rarr; <strong>Display over other apps</strong> (or <em>Picture-in-picture</em>).</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-red-600/80 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    4
                  </div>
                  <div>
                    <span className="font-semibold text-white">Enable Permission: </span>
                    <span className="text-zinc-300">Find <strong>Sakanet Cinema</strong> (or your browser) and toggle <strong className="text-green-400">Allow display over other apps</strong> to ON.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                Picture-in-Picture operates in real-time when switching between desktop or mobile browser tabs:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-semibold text-white">Browser Auto-Pop Up:</div>
                  <p className="text-zinc-300">
                    When you minimize the window or switch to another browser tab while a movie is playing, Chrome automatically triggers the floating PiP window.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-semibold text-white">Permissions Icon:</div>
                  <p className="text-zinc-300">
                    Click the tune/padlock icon in the URL bar &rarr; Ensure <strong>Picture-in-Picture</strong> is set to <strong>Allow</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                On iOS (iPhone / iPad), Picture-in-Picture automatically activates when swiping home:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-semibold text-white">1. Settings &rarr; General:</div>
                  <p className="text-zinc-300">Open iOS <strong>Settings</strong> &rarr; <strong>General</strong> &rarr; <strong>Picture in Picture</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-semibold text-white">2. Start PiP Automatically:</div>
                  <p className="text-zinc-300">Ensure <strong>Start PiP Automatically</strong> is enabled.</p>
                </div>
              </div>
            </div>
          )}

          {/* Test feedback status */}
          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testStatus === 'success'
                  ? 'bg-green-950/60 border-green-700/50 text-green-300'
                  : testStatus === 'failed'
                  ? 'bg-red-950/60 border-red-700/50 text-red-300'
                  : 'bg-zinc-800 border-white/10 text-zinc-200'
              }`}
            >
              {testStatus === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />}
              {testStatus === 'failed' && <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
              {testStatus === 'testing' && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="font-medium">{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#14151b] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestPip}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlaySquare className="w-3.5 h-3.5 text-red-400" />
            <span>Test Screen Pop-up</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-700/30 transition-all cursor-pointer text-center"
          >
            I've Allowed Permission / Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipPermissionModal;
