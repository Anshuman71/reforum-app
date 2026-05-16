import { renderActionEmail, sendEmail } from './utils';

type AuthEmailUser = {
  email: string;
  name?: string | null;
};

export function createVerificationEmail(params: {
  user: AuthEmailUser;
  url: string;
}) {
  const name = params.user.name?.trim() || 'there';

  return {
    to: params.user.email,
    subject: 'Verify your email address',
    ...renderActionEmail({
      title: 'Verify your email address',
      intro: `Hi ${name}, confirm your email address to finish setting up your Reforum account.`,
      actionLabel: 'Verify email',
      actionUrl: params.url,
      outro: 'You can ignore this email if you did not create this account.',
    }),
  };
}

export function createPasswordResetEmail(params: {
  user: AuthEmailUser;
  url: string;
}) {
  const name = params.user.name?.trim() || 'there';

  return {
    to: params.user.email,
    subject: 'Reset your password',
    ...renderActionEmail({
      title: 'Reset your password',
      intro: `Hi ${name}, use this link to reset your Reforum password.`,
      actionLabel: 'Reset password',
      actionUrl: params.url,
      outro: 'You can ignore this email if you did not request a password reset.',
    }),
  };
}

export async function sendVerificationEmail(params: {
  user: AuthEmailUser;
  url: string;
}) {
  return sendEmail(createVerificationEmail(params));
}

export async function sendPasswordResetEmail(params: {
  user: AuthEmailUser;
  url: string;
}) {
  return sendEmail(createPasswordResetEmail(params));
}
