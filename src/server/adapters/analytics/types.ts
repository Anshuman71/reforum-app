/**
 * Analytics adapter interface.
 *
 * Implementations: console (default/dev), PostHog, Plausible, Umami, Google Analytics.
 * Add via `npx reforum add analytics-posthog` etc.
 */
export interface AnalyticsAdapter {
  track(event: string, properties?: Record<string, unknown>): Promise<void>;
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
  pageView(path: string, properties?: Record<string, unknown>): Promise<void>;
}
