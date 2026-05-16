import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmailAdapterFromEnv } from '@/server/adapters/email/config';
import { createPasswordResetEmail } from '@/server/adapters/email/auth';
import { resendEmailAdapter } from '@/server/adapters/email/resend';
import { htmlToText } from '@/server/adapters/email/utils';

vi.mock('server-only', () => ({}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('email utilities', () => {
  it('derives text from simple html email bodies', () => {
    expect(htmlToText('<p>Hello&nbsp;there</p><p>Reset &amp; continue</p>')).toBe(
      'Hello there\n\nReset & continue'
    );
  });

  it('creates password reset emails with fallback text', () => {
    const email = createPasswordResetEmail({
      user: { email: 'user@example.com', name: 'Ada' },
      url: 'https://example.com/reset',
    });

    expect(email.to).toBe('user@example.com');
    expect(email.subject).toBe('Reset your password');
    expect(email.html).toContain('https://example.com/reset');
    expect(email.text).toContain('Reset password');
  });
});

describe('email config', () => {
  it('uses noop email by default', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reforum';
    process.env.BETTER_AUTH_SECRET = 'secret';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = 'http://localhost:3000';
    delete process.env.EMAIL_PROVIDER;

    const adapter = createEmailAdapterFromEnv();

    await expect(
      adapter.sendEmail({
        to: 'user@example.com',
        subject: 'Hello',
        text: 'Hello',
      })
    ).resolves.toEqual({ provider: 'noop' });
  });

  it('selects resend from env when requested', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reforum';
    process.env.BETTER_AUTH_SECRET = 'secret';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = 'http://localhost:3000';
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Reforum <hello@example.com>';

    const adapter = createEmailAdapterFromEnv();

    expect(adapter).toHaveProperty('sendEmail');
  });
});

describe('resend email adapter', () => {
  it('maps sendEmail params to the Resend HTTP API', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      return Response.json({ id: 'email_123' });
    });

    const adapter = resendEmailAdapter({
      apiKey: 'test-key',
      defaultFrom: 'Reforum <hello@example.com>',
      fetcher,
    });

    await expect(
      adapter.sendEmail({
        to: [{ email: 'user@example.com', name: 'Ada' }],
        replyTo: 'support@example.com',
        subject: 'Welcome',
        text: 'Welcome to Reforum',
      })
    ).resolves.toEqual({ id: 'email_123', provider: 'resend' });

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-key',
          'content-type': 'application/json',
        }),
      })
    );

    const call = fetcher.mock.calls[0];
    expect(call).toBeDefined();

    const body = JSON.parse((call?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      from: 'Reforum <hello@example.com>',
      to: ['Ada <user@example.com>'],
      reply_to: ['support@example.com'],
      subject: 'Welcome',
      text: 'Welcome to Reforum',
    });
  });
});
