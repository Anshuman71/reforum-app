/**
 * Realtime adapter interface.
 *
 * Server-side only: publishes events to a channel.
 * Client-side subscription uses the provider's SDK directly
 * (e.g., Supabase JS, Ably JS) via a React hook.
 */
export interface RealtimeAdapter {
  publish(channel: string, event: string, data: unknown): Promise<void>;
}
