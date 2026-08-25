import 'server-only';

import type { EmailSendResult, SendEmailInput } from '#email/mailer/mailer.types';
import { sendEmail } from '#email/mailer/send-email';

/** Compatibility extension point until the receipt template is implemented by its ticket. */
export async function sendPurchaseReceiptEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return await sendEmail(input);
}

/** Compatibility extension point until the payment-failure template is implemented by its ticket. */
export async function sendPaymentFailedEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return await sendEmail(input);
}
