import { defineConfig } from '@/server/lib/config';
import { pollingAdapter } from '@/server/adapters/realtime/polling';
import { localStorageAdapter } from '@/server/adapters/storage/local';
import { consoleAnalytics } from '@/server/adapters/analytics/console';

export default defineConfig({
  realtime: pollingAdapter(),
  storage: localStorageAdapter({ dir: './public/uploads' }),
  analytics: consoleAnalytics(),
});
