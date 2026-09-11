'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/lib/stores';
import { cn } from '@/lib/utils';

/**
 * Toast notifications with an always-mounted ARIA live region.
 *
 * The region stays in the DOM even when no toast is visible; many screen
 * readers (notably Safari + VoiceOver) fail to announce a live region that
 * is inserted at the same moment its content changes, so mounting the
 * region only while a toast exists made announcements unreliable.
 */
export function Toast() {
  const { toast, hideToast } = useToast();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 5000); // Auto-hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const Icon = toast ? icons[toast.type] : null;
  const politeness = toast && toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      className="fixed top-4 right-4 z-50"
      // The live region is always present; content inside it changes.
      aria-live={politeness}
      aria-atomic="true"
      data-testid="toast-region"
    >
      {toast && Icon ? (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm max-w-sm shadow-lg animate-in slide-in-from-top-2 duration-300',
            colors[toast.type],
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn('h-5 w-5 flex-shrink-0', iconColors[toast.type])}
          />
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={hideToast}
            aria-label="Dismiss notification"
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
