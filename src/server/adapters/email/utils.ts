import { getEmail } from '@/server/lib/config';
import type {
  EmailAddress,
  EmailAdapter,
  SendEmailParams,
  SendEmailResult,
} from './types';

export function formatEmailAddress(address: EmailAddress): string {
  if (typeof address === 'string') {
    return address;
  }

  if (!address.name) {
    return address.email;
  }

  return `${address.name} <${address.email}>`;
}

export function normalizeEmailAddresses(
  addresses?: EmailAddress | EmailAddress[]
): string[] | undefined {
  if (!addresses) {
    return undefined;
  }

  const list = Array.isArray(addresses) ? addresses : [addresses];
  return list.map(formatEmailAddress);
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderActionEmail(params: {
  title: string;
  intro: string;
  actionUrl: string;
  actionLabel: string;
  outro?: string;
}) {
  const title = escapeHtml(params.title);
  const intro = escapeHtml(params.intro);
  const actionLabel = escapeHtml(params.actionLabel);
  const actionUrl = escapeHtml(params.actionUrl);
  const outro = params.outro ? `<p>${escapeHtml(params.outro)}</p>` : '';

  const html = [
    '<!doctype html>',
    '<html>',
    '<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">',
    `<h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>`,
    `<p>${intro}</p>`,
    `<p><a href="${actionUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">${actionLabel}</a></p>`,
    `<p style="font-size: 13px; color: #4b5563;">If the button does not work, open this URL: <br><a href="${actionUrl}">${actionUrl}</a></p>`,
    outro,
    '</body>',
    '</html>',
  ].join('');

  return {
    html,
    text: htmlToText(html),
  };
}

export async function sendEmail(
  params: SendEmailParams,
  adapter: EmailAdapter = getEmail()
): Promise<SendEmailResult> {
  return adapter.sendEmail(params);
}
