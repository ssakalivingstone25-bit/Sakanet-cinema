import React, { useState } from 'react';
import {
  X,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  signOutUser,
} from '../services/firebase';
import { storageService, guestUser } from '../services/storageService';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserChanged: (user: UserProfile) => void;
  isMandatoryOnboarding?: boolean;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  isMandatoryOnboarding = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentDomain = window.location.hostname;
  const isSignedIn = Boolean(currentUser.email);

  // Trigger Google Account selection via Popup
  const handleSignInPopup = async () => {
    setLoading(true);
    setError(null);
    setShowDomainHelp(false);
    try {
      const profile = await signInWithGoogle();
      storageService.saveUser(profile);
      onUserChanged(profile);
      onClose();
    } catch (err: any) {
      console.warn('Google Sign-in Error details:', err);
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setError(
          `Firebase OAuth requires adding "${currentDomain}" to Authorized Domains in your Firebase Console.`
        );
        setShowDomainHelp(true);
      } else if (code === 'auth/popup-blocked') {
        setError(
          'Popup was blocked by your browser. Use the "Redirect to Google Sign-In" option below.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled. Please choose your Google account to sign in.');
      } else {
        setError(msg || 'Failed to authenticate with Google. Please retry or use redirect sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger Google Account selection via Redirect
  const handleSignInRedirect = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      console.error('Google Redirect Error:', err);
      setError(err?.message || 'Error redirecting to Google.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutUser();
      storageService.clearUser();
      onUserChanged(guestUser);
      onClose();
    } catch (err: any) {
      console.error('Sign-out Error:', err);
      setError(err?.message || 'Error signing out.');
    } finally {
      setLoading(false);
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-2xl shadow-2xl p-6 text-zinc-200 overflow-hidden space-y-4">
        {/* Dismiss button */}
        {!isMandatoryOnboarding && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with Google branding */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
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
          </div>

          <h3 className="text-xl font-bold font-display text-white">
            {isSignedIn ? 'Google Account Connected' : 'Choose Your Google Account'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {isSignedIn
              ? 'Your cinema session is authenticated and stored securely.'
              : 'Sign in to choose your Google Account. Administrators and viewers must authenticate to proceed.'}
          </p>
        </div>

        {/* Error notification & authorized domain help */}
        {error && (
          <div className="p-3 bg-red-950/70 border border-red-800/40 rounded-xl space-y-2 text-xs text-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>

            {showDomainHelp && (
              <div className="pt-2 border-t border-red-900/50 space-y-2">
                <p className="text-[11px] text-zinc-300">
                  To authorize this domain in Firebase Console:
                  <br />
                  <span className="text-zinc-400">
                    Authentication &gt; Settings &gt; Authorized domains &gt; Add domain
                  </span>
                </p>
                <div className="flex items-center gap-2 bg-black/50 p-2 rounded-lg font-mono text-[10px] text-amber-300">
                  <span className="truncate flex-1">{currentDomain}</span>
                  <button
                    onClick={copyDomain}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1"
                  >
                    {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isSignedIn ? (
          /* Profile Details Card */
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/80 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-base">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                    {currentUser.name}
                    {currentUser.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 font-mono font-bold">
                        ADMINISTRATOR
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
                        VERIFIED
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">{currentUser.email}</p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Google OAuth 2.0 Active</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-xs">
                <div className="p-2.5 bg-zinc-950/60 rounded-lg flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-medium">Access Tier</span>
                  <span className="font-bold text-amber-400">
                    {currentUser.role === 'admin' ? 'Super Admin' : currentUser.tier}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{loading ? 'Switching...' : 'Switch Account / Sign Out'}</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-700/30 transition-all cursor-pointer"
              >
                Continue to Cinema
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Options */
          <div className="space-y-3.5">
            <div className="space-y-1.5 text-xs text-zinc-400 pb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Choose your Google account to authenticate your cinema profile.</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Synchronized watchlists and offline downloads for smooth playback.</span>
              </div>
            </div>

            {/* Primary Google Sign-In (Popup with forced account chooser) */}
            <button
              onClick={handleSignInPopup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{loading ? 'Opening Google Account Chooser...' : 'Sign In with Google (Choose Account)'}</span>
            </button>

            {/* Redirect fallback if popup blocked */}
            <button
              onClick={handleSignInRedirect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Redirect to Google Account Chooser</span>
            </button>

            <p className="text-[10px] text-zinc-500 text-center pt-1">
              By connecting, you agree to Sakanet Cinema Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
