import React from 'react';
import { UserProfile } from '../types';

interface AndroidAppFrameProps {
  children: React.ReactNode;
  activeTab?: 'settings' | 'browse' | 'downloads' | 'admin';
  onTabChange?: (tab: 'settings' | 'browse' | 'downloads' | 'admin') => void;
  isOfflineMode?: boolean;
  downloadsCount?: number;
  activeDownloadsCount?: number;
  isAndroidView?: boolean;
  onToggleViewMode?: () => void;
  onOpenAuth?: () => void;
  user?: UserProfile;
}

export const AndroidAppFrame: React.FC<AndroidAppFrameProps> = ({
  children,
}) => {
  return <div className="flex-1 w-full">{children}</div>;
};

export default AndroidAppFrame;
