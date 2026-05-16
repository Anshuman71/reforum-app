import {
  formatEmailAddress,
  normalizeEmailAddresses,
} from '@/server/adapters/email/utils';
import type {
  EmailAttachment,
  EmailAdapter,
  SendEmailParams,
} from './types';

interface ResendEmailAdapterOptions {
  apiKey: string;
  defaultFrom: string;
  endpoint?: string;
  fetcher?: typeof fetch;
}

type ResendAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

function attachmentToResend(attachment: EmailAttachment): ResendAttachment {
  const content =
    typeof attachment.content === 'string'
      ? attachment.content
      : attachment.content.toString('base64');

  return {
    filename: attachment.filename,
    content,
    content_type: attachment.contentType,
  };
}

function buildBody(params: SendEmailParams, defaultFrom: string) {
  const body = {
    from: params.from ? formatEmailAddress(params.from) : defaultFrom,
    to: normalizeEmailAddresses(params.to) ?? [],
    subject: params.subject,
    html: params.html,
    text: params.text,
    cc: normalizeEmailAddresses(params.cc),
    bcc: normalizeEmailAddresses(params.bcc),
    reply_to: normalizeEmailAddresses(params.replyTo),
    headers: params.headers,
    tags: params.tags,
    attachments: params.attachments?.map(attachmentToResend),
  };

  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined)
  );
}

export function resendEmailAdapter(
  options: ResendEmailAdapterOptions
): EmailAdapter {
  const endpoint = options.endpoint ?? 'https://api.resend.com/emails';
  const fetcher = options.fetcher ?? fetch;

  return {
    async sendEmail(params) {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildBody(params, options.defaultFrom)),
      });

      const result = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
        name?: string;
      } | null;

      if (!response.ok) {
        const message =
          result?.message ?? `Resend email request failed with ${response.status}`;
        throw new Error(message);
      }

      return {
        id: result?.id,
        provider: 'resend',
      };
    },
  };
}
