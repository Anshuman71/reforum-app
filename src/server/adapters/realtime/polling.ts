import type { RealtimeAdapter } from './types';

/**
 * Default realtime adapter. No-op publish — clients poll the API for updates.
 * Replace with `npx reforum add realtime-supabase` or `realtime-ably` for
 * real push-based updates.
 */
export function pollingAdapter(): RealtimeAdapter {
  return {
    async publish() {
      // No-op: clients poll the API instead
    },
  };
}
