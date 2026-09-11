// Hook for tracking scroll depth milestones
import { useEffect, useRef } from 'react';
import { trackScrollDepth } from '../lib/telemetry/ui/scroll-tracker';
import { DeviceType } from '../lib/telemetry/ui/types';

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

export function useScrollTracking(elementsPassed: string[], deviceType: DeviceType) {
  const reportedMilestones = useRef<Set<Milestone>>(new Set());
  const ticking = useRef(false);

  useEffect(() => {
    function handleScroll() {
      // rAF-throttle: coalesce multiple scroll events per frame.
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        ticking.current = false;
        const scrollPercent = Math.round(
          ((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100,
        );
        // Track the deepest milestone reached, and only report each
        // milestone once per mounted instance to avoid telemetry spam.
        let milestone: Milestone | null = null;
        for (const candidate of MILESTONES) {
          if (scrollPercent >= candidate) milestone = candidate;
        }
        if (milestone && !reportedMilestones.current.has(milestone)) {
          reportedMilestones.current.add(milestone);
          trackScrollDepth({
            milestone,
            elementsPassed,
            deviceType,
            timestamp: Date.now(),
          });
        }
      });
    }
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      reportedMilestones.current.clear();
    };
  }, [elementsPassed, deviceType]);
}
