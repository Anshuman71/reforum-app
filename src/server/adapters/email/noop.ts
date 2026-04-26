import type { EmailAdapter } from './types';

export function noopEmailAdapter(): EmailAdapter {
  return {
    async send() {
      // Intentionally empty until a real provider is configured.
    },
  };
}
