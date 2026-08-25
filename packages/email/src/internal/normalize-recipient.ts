import { z } from 'zod';

import type { EmailAddress } from '#email/mailer/mailer.types';

const recipientSchema = z.object({
  email: z.string().email(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\r\n<>,]+$/)
    .optional(),
});

export function normalizeRecipient(recipient: string | EmailAddress): EmailAddress {
  const parsed = recipientSchema.parse(
    typeof recipient === 'string' ? { email: recipient } : recipient,
  );

  return parsed.name ? { email: parsed.email, name: parsed.name } : { email: parsed.email };
}

export function formatRecipient(recipient: EmailAddress): string {
  return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
}
