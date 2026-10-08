import React from 'react';
import {
  Shield,
  FileText,
  Info,
  Mail,
  Heart,
  Globe,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { SakanetLogo } from './SakanetLogo';
import { InfoPageTab } from './InfoPagesModal';

interface FooterProps {
  onOpenInfoTab: (tab: InfoPageTab) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenInfoTab, className = '' }) => {
  return (
    <footer
      className={`bg-neutral-950/95 border-t border-white/[0.08] text-zinc-400 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-2 space-y-3.5">
            <SakanetLogo size="md" />
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Uganda's premier cinematic streaming platform with chunk-based offline caching,
              authentic VJ translations, and bandwidth-resilient streaming engineered for Africa.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Kampala, Uganda · Built by Livingstone Ssaka</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Google AdSense Verified Publisher: pub-4740792527987743</span>
            </div>
          </div>

          {/* Col 2: Legal & Google Compliance (CRITICAL FOR ADSENSE) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              Legal &amp; Compliance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoTab('privacy')}
                  className="hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <Shield className="w-3 h-3 text-red-500" />
                  <span>Privacy Policy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoTab('terms')}
                  className="hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <FileText className="w-3 h-3 text-red-500" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  className="hover:text-red-400 transition-colors flex items-center gap-1 text-[11px] text-zinc-400"
                  title="Direct static URL for Google crawlers"
                >
                  <span>Standalone Policy Page</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  className="hover:text-red-400 transition-colors flex items-center gap-1 text-[11px] text-zinc-400"
                  title="Direct static URL for Google crawlers"
                >
                  <span>Standalone Terms Page</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Company & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              Company &amp; Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoTab('about')}
                  className="hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <Info className="w-3 h-3 text-red-500" />
                  <span>About Us</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoTab('contact')}
                  className="hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <Mail className="w-3 h-3 text-red-500" />
                  <span>Contact Us</span>
                </button>
              </li>
              <li>
                <a
                  href="mailto:ssakalivingstone25@gmail.com"
                  className="hover:text-red-400 transition-colors flex items-center gap-1 text-[11px] text-zinc-400 break-all"
                >
                  <span>ssakalivingstone25@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 Sakanet Cinema. All rights reserved.</p>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => onOpenInfoTab('privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenInfoTab('terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenInfoTab('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About Us
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenInfoTab('contact')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
