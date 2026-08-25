import 'server-only';

import { serverEnv } from '@repo/config/env/server';

import { type EmailConfig, emailConfigSchema } from './email-config.schema';

function createEmailConfig(): EmailConfig {
  if (serverEnv.MAILER_PROVIDER === 'resend') {
    return emailConfigSchema.parse({
      provider: 'resend',
      from: serverEnv.EMAIL_FROM,
      apiKey: serverEnv.RESEND_API_KEY,
    });
  }

  const auth =
    serverEnv.SMTP_USER && serverEnv.SMTP_PASSWORD
      ? { user: serverEnv.SMTP_USER, password: serverEnv.SMTP_PASSWORD }
      : undefined;

  return emailConfigSchema.parse({
    provider: 'smtp',
    from: serverEnv.EMAIL_FROM,
    host: serverEnv.SMTP_HOST,
    port: serverEnv.SMTP_PORT,
    auth,
  });
}

/** Active deployment mailer configuration derived only from validated server env. */
export const emailConfig = createEmailConfig();
