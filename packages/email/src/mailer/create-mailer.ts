import 'server-only';

import { type EmailConfig, emailConfig } from '#email/config/index';
import { ResendMailer } from '#email/providers/resend/resend-mailer';
import { SmtpMailer } from '#email/providers/smtp/smtp-mailer';

import type { Mailer } from './mailer.types';

export function createMailer(config: EmailConfig = emailConfig): Mailer {
  if (config.provider === 'resend') {
    return new ResendMailer(config);
  }

  return new SmtpMailer(config);
}
