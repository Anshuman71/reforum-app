import { describe, expect, it, vi } from 'vitest';
import { createPasswordResetEmail } from '@/server/adapters/email/auth';
import { resendEmailAdapter } from '@/server/adapters/email/resend';
import { htmlToText } from '@/server/adapters/email/utils';

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
