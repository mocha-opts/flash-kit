import 'server-only';

import type { EmailSendResult, SendEmailInput } from '#email/mailer/mailer.types';
import { sendEmail } from '#email/mailer/send-email';

/** Compatibility extension point until the welcome template is implemented by its ticket. */
export async function sendWelcomeEmail(input: SendEmailInput): Promise<EmailSendResult> {
  return await sendEmail(input);
}
