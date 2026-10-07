import React, { useState } from 'react';
import {
  Film,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithGoogle, signInWithGoogleRedirect } from '../services/firebase';
import { storageService } from '../services/storageService';
import { SakanetLogo } from './SakanetLogo';

interface AuthGateScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain = window.location.hostname;

  // Sign in via Google Popup
  const handleSignInPopup = async () => {
    setLoading(true);
    setError(null);
    setShowDomainHelp(false);
    try {
      const profile = await signInWithGoogle();
      storageService.saveUser(profile);
      onAuthenticated(profile);
    } catch (err: any) {
      console.warn('Google Sign-in Error:', err?.message || String(err));
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setError(
          `Firebase OAuth requires adding "${currentDomain}" to Authorized Domains in your Firebase Console.`
        );
        setShowDomainHelp(true);
      } else if (code === 'auth/popup-blocked') {
        setError(
          'Popup was blocked by your browser. Please click the direct sign-in button below.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please choose your Google account to continue.');
      } else {
        setError(msg || 'Authentication could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign in via Redirect
  const handleSignInRedirect = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      console.error('Redirect sign in error:', err?.message || String(err));
      setError(err?.message || 'Failed to redirect to Google.');
      setLoading(false);
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Cinematic ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 w-full px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <SakanetLogo size="md" />

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span>Secure Sign-In</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-[#121319]/90 border border-white/10 rounded-2xl shadow-2xl p-7 sm:p-9 backdrop-blur-xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-3 flex flex-col items-center">
            <SakanetLogo size="lg" showText={false} />
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Sign in to Sakanet Cinema
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Access premier Ugandan VJ-translated blockbusters, cinematic archives, and synchronized streaming.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/40 rounded-xl space-y-2 text-xs text-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>

              {showDomainHelp && (
                <div className="pt-2 border-t border-red-900/50 space-y-2">
                  <p className="text-[11px] text-zinc-300">
                    Add this domain to Authorized Domains in Firebase Console:
                  </p>
                  <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg font-mono text-[10px] text-amber-300">
                    <span className="truncate flex-1">{currentDomain}</span>
                    <button
                      onClick={copyDomain}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Authentication Actions */}
          <div className="space-y-3 pt-2">
            {/* Primary Google Sign-In Button */}
            <button
              onClick={handleSignInPopup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm shadow-lg shadow-white/5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>{loading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Direct Redirect Option (fallback if popup blocked) */}
            <button
              onClick={handleSignInRedirect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Having trouble with popups? Use direct sign-in</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-2 border-t border-white/5 text-center">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              By signing in, you agree to Sakanet Cinema Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>Authentication powered by Google OAuth 2.0</span>
        </div>
        <div className="mt-2 sm:mt-0 font-mono text-[11px]">
          &copy; {new Date().getFullYear()} Sakanet Cinema. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AuthGateScreen;
