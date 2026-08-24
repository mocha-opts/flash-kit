import 'server-only';

import type { EmailTemplateDescriptor } from './templates/index';

export type EmailAddress = {
  readonly email: string;
  readonly name?: string;
};

export type SendEmailInput = {
  readonly to: EmailAddress;
  readonly subject: string;
  readonly template: EmailTemplateDescriptor;
};

export type EmailSendResult = {
  readonly providerMessageId: string | null;
};

export type Mailer = {
  readonly sendEmail: (input: SendEmailInput) => Promise<EmailSendResult>;
};

export async function sendEmail(input: SendEmailInput): Promise<never> {
  void input;

  throw new Error('Email providers are implemented after the T01 boundary scaffold.');
}

export async function sendMagicLinkEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

export async function sendEmailChangeNotice(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

export async function sendWelcomeEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

export async function sendPurchaseReceiptEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

export async function sendPaymentFailedEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}
