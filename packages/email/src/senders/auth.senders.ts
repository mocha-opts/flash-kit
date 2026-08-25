import 'server-only';

import { createElement } from 'react';
import { z } from 'zod';
import type { EmailSendResult, SendEmailInput } from '#email/mailer/mailer.types';
import { sendEmail } from '#email/mailer/send-email';
import { MagicLinkEmail } from '#email/templates/auth/magic-link-email';
import { enMagicLinkMessages } from '#email/templates/messages/en';
import { zhCnMagicLinkMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';

const magicLinkInputSchema = z.object({
  email: z.string().email(),
  url: z.url({ protocol: /^https?$/ }),
  expiresInMinutes: z.number().int().positive().max(60).default(10),
  locale: z.enum(['en', 'zh-CN']).default('en'),
});

export type SendMagicLinkEmailInput = {
  readonly email: string;
  readonly url: string;
  readonly expiresInMinutes?: number;
  readonly locale?: EmailLocale;
};

/** Sends the localized, single-use magic-link message and propagates delivery failures. */
export async function sendMagicLinkEmail(input: SendMagicLinkEmailInput): Promise<EmailSendResult> {
  const parsed = magicLinkInputSchema.parse(input);
  const messages = parsed.locale === 'zh-CN' ? zhCnMagicLinkMessages : enMagicLinkMessages;

  return await sendEmail({
    to: parsed.email,
    subject: messages.subject,
    template: {
      kind: 'magic-link',
      previewText: messages.preview,
      body: createElement(MagicLinkEmail, {
        magicUrl: parsed.url,
        expiresInMinutes: parsed.expiresInMinutes,
        locale: parsed.locale,
      }),
    },
  });
}

/** Compatibility extension point until the email-change template is implemented by its ticket. */
export async function sendEmailChangeNotice(input: SendEmailInput): Promise<EmailSendResult> {
  return await sendEmail(input);
}
