import 'server-only';

import { createElement } from 'react';
import { z } from 'zod';
import type { EmailSendResult } from '#email/mailer/mailer.types';
import { sendEmail } from '#email/mailer/send-email';
import { EmailChangeNoticeEmail } from '#email/templates/auth/email-change-notice-email';
import { EmailChangeVerificationEmail } from '#email/templates/auth/email-change-verification-email';
import { MagicLinkEmail } from '#email/templates/auth/magic-link-email';
import { enEmailChangeMessages, enMagicLinkMessages } from '#email/templates/messages/en';
import { zhCnEmailChangeMessages, zhCnMagicLinkMessages } from '#email/templates/messages/zh-CN';
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

const emailChangeVerificationInputSchema = z.object({
  email: z.string().email(),
  url: z.url({ protocol: /^https?$/ }),
  expiresInMinutes: z.number().int().positive().max(60).default(30),
  locale: z.enum(['en', 'zh-CN']).default('en'),
});

const emailChangeNoticeInputSchema = z.object({
  email: z.string().email(),
  newEmail: z.string().email(),
  locale: z.enum(['en', 'zh-CN']).default('en'),
});

export type SendEmailChangeVerificationEmailInput = {
  readonly email: string;
  readonly url: string;
  readonly expiresInMinutes?: number;
  readonly locale?: EmailLocale;
};

export type SendEmailChangeNoticeInput = {
  readonly email: string;
  readonly newEmail: string;
  readonly locale?: EmailLocale;
};

/** Sends the localized verification message and propagates delivery failures. */
export async function sendEmailChangeVerificationEmail(
  input: SendEmailChangeVerificationEmailInput,
): Promise<EmailSendResult> {
  const parsed = emailChangeVerificationInputSchema.parse(input);
  const messages =
    parsed.locale === 'zh-CN'
      ? zhCnEmailChangeMessages.verification
      : enEmailChangeMessages.verification;

  return await sendEmail({
    to: parsed.email,
    subject: messages.subject,
    template: {
      kind: 'email-change-verification',
      previewText: messages.preview,
      body: createElement(EmailChangeVerificationEmail, {
        verificationUrl: parsed.url,
        expiresInMinutes: parsed.expiresInMinutes,
        locale: parsed.locale,
      }),
    },
  });
}

/** Sends the localized old-address security notification and propagates failures. */
export async function sendEmailChangeNotice(
  input: SendEmailChangeNoticeInput,
): Promise<EmailSendResult> {
  const parsed = emailChangeNoticeInputSchema.parse(input);
  const messages =
    parsed.locale === 'zh-CN' ? zhCnEmailChangeMessages.notice : enEmailChangeMessages.notice;

  return await sendEmail({
    to: parsed.email,
    subject: messages.subject,
    template: {
      kind: 'email-change-notice',
      previewText: messages.preview,
      body: createElement(EmailChangeNoticeEmail, {
        newEmail: parsed.newEmail,
        locale: parsed.locale,
      }),
    },
  });
}
