import type { EmailAdapter } from './types';

export function noopEmailAdapter(): EmailAdapter {
  return {
    async sendEmail() {
      // Intentionally empty until a real provider is configured.
      return { provider: 'noop' };
    },
  };
}
