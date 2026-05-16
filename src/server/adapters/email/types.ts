export type EmailAddress =
  | string
  | {
      email: string;
      name?: string;
    };

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export type EmailTag = {
  name: string;
  value: string;
};

type EmailBody =
  | {
      html: string;
      text?: string;
    }
  | {
      html?: string;
      text: string;
    };

export type SendEmailParams = EmailBody & {
  to: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  replyTo?: EmailAddress | EmailAddress[];
  subject: string;
  headers?: Record<string, string>;
  tags?: EmailTag[];
  attachments?: EmailAttachment[];
};

export interface SendEmailResult {
  id?: string;
  provider?: string;
}

export interface EmailAdapter {
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
}
