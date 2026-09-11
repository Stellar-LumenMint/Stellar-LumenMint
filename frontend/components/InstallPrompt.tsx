'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** How long a dismissal suppresses the prompt (30 days). */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DISMISS_STORAGE_KEY = 'installPromptDismissedAt';
/** Wait before surfacing the prompt so it does not interrupt first paint. */
const PROMPT_DELAY_MS = 3000;

/**
 * Read a localStorage value without throwing.
 *
 * `carousel`-style private browsing modes can make `localStorage` throw on
 * access, and on the server it does not exist at all. Every read is guarded
 * so a storage failure degrades to "no dismissal recorded" instead of
 * crashing the render.
 */
function readDismissedAt(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  try {
    return Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) ?? '0');
  } catch {
    return 0;
  }
}

function writeDismissedAt(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage is unavailable; the prompt simply reappears next visit.
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // The event only fires in browsers that support PWA install, so this
    // component is inert on iOS Safari rather than showing an unusable
    // button — which is what the previous render-time storage check got
    // wrong.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = readDismissedAt();
    if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      setIsDismissed(true);
      return;
    }

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      clearTimer();
      timerRef.current = setTimeout(() => setShowInstallPrompt(true), PROMPT_DELAY_MS);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      clearTimer();
    };

    const handleVisibilityChange = () => {
      // Do not surface the prompt while the tab is hidden.
      if (document.hidden) {
        clearTimer();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimer();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    // A deferred prompt can only be used once; drop it either way so the
    // button cannot be clicked into a no-op.
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowInstallPrompt(false);
    setIsDismissed(true);
    writeDismissedAt();
  }, []);

  if (isInstalled || isDismissed || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div
        role="dialog"
        aria-label="Install Stellar-LumenMint"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Install Stellar-LumenMint
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get the app for a better experience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
