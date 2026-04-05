import type { AnalyticsAdapter } from './types';

/**
 * Default analytics adapter. Logs to console in development, no-op in production.
 * Replace with `npx reforum add analytics-posthog` etc. for real tracking.
 */
export function consoleAnalytics(): AnalyticsAdapter {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    async track(event, properties) {
      if (isDev) {
        console.log(`[analytics] track: ${event}`, properties ?? '');
      }
    },

    async identify(userId, traits) {
      if (isDev) {
        console.log(`[analytics] identify: ${userId}`, traits ?? '');
      }
    },

    async pageView(path, properties) {
      if (isDev) {
        console.log(`[analytics] pageView: ${path}`, properties ?? '');
      }
    },
  };
}
