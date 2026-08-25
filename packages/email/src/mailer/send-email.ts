import 'server-only';

import { normalizeRecipient } from '#email/internal/normalize-recipient';
import { renderEmail } from '#email/internal/render-email';

import { createMailer } from './create-mailer';
import type { EmailSendResult, SendEmailInput } from './mailer.types';

const mailer = createMailer();

/** Sends once through the active deployment provider and propagates every delivery failure. */
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const to = normalizeRecipient(input.to);
  const rendered = await renderEmail(input.template.body);

  return await mailer.sendEmail({
    to,
    subject: input.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
