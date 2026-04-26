import type { RealtimeAdapter } from '@/server/adapters/realtime/types';
import type { StorageAdapter } from '@/server/adapters/storage/types';
import type { AnalyticsAdapter } from '@/server/adapters/analytics/types';
import type { EmailAdapter } from '@/server/adapters/email/types';

export interface ReforumConfig {
  realtime: RealtimeAdapter;
  storage: StorageAdapter;
  analytics: AnalyticsAdapter;
  email: EmailAdapter;
}

export function defineConfig(config: ReforumConfig): ReforumConfig {
  return config;
}

// Singleton config instance, loaded once at startup
let _config: ReforumConfig | null = null;

export function setConfig(config: ReforumConfig) {
  _config = config;
}

export function getConfig(): ReforumConfig {
  if (!_config) {
    throw new Error(
      'Reforum config not initialized. Ensure reforum.config.ts is imported at startup.'
    );
  }
  return _config;
}

// Convenience accessors
export function getRealtime(): RealtimeAdapter {
  return getConfig().realtime;
}

export function getStorage(): StorageAdapter {
  return getConfig().storage;
}

export function getAnalytics(): AnalyticsAdapter {
  return getConfig().analytics;
}

export function getEmail(): EmailAdapter {
  return getConfig().email;
}
