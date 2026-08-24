import 'server-only';

import type { EmailTemplateDescriptor } from '#templates/index';

/** An email recipient with an optional display name; secrets and tokens are not part of the type. */
export type EmailAddress = {
  readonly email: string;
  readonly name?: string;
};

/** Transport-neutral input shared by semantic email senders. */
export type SendEmailInput = {
  readonly to: EmailAddress;
  readonly subject: string;
  readonly template: EmailTemplateDescriptor;
};

/** Provider-neutral send result; a provider may not return a message identifier. */
export type EmailSendResult = {
  readonly providerMessageId: string | null;
};

/** Server-only mailer contract; provider clients and raw responses stay private. */
export type Mailer = {
  readonly sendEmail: (input: SendEmailInput) => Promise<EmailSendResult>;
};

/**
 * Sends an email through the configured provider boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<never> {
  void input;

  throw new Error('T01-not-configured: email provider is not configured.');
}

/**
 * Sends a magic-link message through the common mailer boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendMagicLinkEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

/**
 * Sends an email-change notice through the common mailer boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendEmailChangeNotice(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

/**
 * Sends a welcome message through the common mailer boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendWelcomeEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

/**
 * Sends a purchase receipt through the common mailer boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendPurchaseReceiptEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}

/**
 * Sends a payment-failed notice through the common mailer boundary.
 *
 * @throws {Error} Always in T01 because an email provider is not configured.
 */
export async function sendPaymentFailedEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return sendEmail(input);
}
