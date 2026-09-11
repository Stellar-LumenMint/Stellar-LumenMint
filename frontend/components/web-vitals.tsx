'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { telemetry } from '@/lib/telemetry';

// Web-vitals events are reported through the same sampling, debounce, and
// reliability pipeline as every other telemetry event, so they respect the
// user's opt-out and debug flags instead of firing raw console.log lines.
const WEB_VITAL_EVENT_PREFIX = 'web_vital';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Sample: reporting every metric for every page view is noisy; keep
    // only the metrics that matter for Core Web Vitals plus a small
    // sample of the rest.
    const shouldReport =
      metric.name === 'LCP' ||
      metric.name === 'INP' ||
      metric.name === 'CLS' ||
      metric.name === 'FCP' ||
      Math.random() < 0.1;

    if (!shouldReport) return;

    telemetry.track(`${WEB_VITAL_EVENT_PREFIX}_${metric.name.toLowerCase()}`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigation_type: metric.navigationType,
      id: metric.id,
    });
  });

  return null;
}
