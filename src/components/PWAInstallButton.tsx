import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'card' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'card'
            ? 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[44px]'
            : 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px]'
        }
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="w-4 h-4" />
          Install App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm glass-elevated rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Install on iOS</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                  aria-label="Close install instructions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                1. Tap the <span className="font-semibold text-white">Share</span> icon in Safari.
                <br />
                2. Scroll down and select <span className="font-semibold text-white">Add to Home Screen</span>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 border border-amber-400/30 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Displaying cached workspace data.</span>
    </div>
  );
};
