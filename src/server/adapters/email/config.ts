import { getEnvs, getResendEmailEnvs } from '@/server/lib/envs';
import { noopEmailAdapter } from './noop';
import { resendEmailAdapter } from './resend';
import type { EmailAdapter } from './types';

export function createEmailAdapterFromEnv(): EmailAdapter {
  const env = getEnvs();

  if (env.EMAIL_PROVIDER === 'resend') {
    const resendEnv = getResendEmailEnvs();

    return resendEmailAdapter({
      apiKey: resendEnv.RESEND_API_KEY,
      defaultFrom: resendEnv.EMAIL_FROM,
    });
  }

  return noopEmailAdapter();
}
