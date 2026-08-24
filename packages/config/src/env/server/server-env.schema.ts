import { z } from 'zod';

import { productionSiteUrlSchema, siteUrlSchema } from '#urls/index';

const enabledFlagSchema = z.enum(['true', 'false']).default('false');

const baseServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required.'),
  NEXT_PUBLIC_SITE_URL: z.string().min(1, 'NEXT_PUBLIC_SITE_URL is required.'),
  DATABASE_URL: z.url({
    protocol: /^postgres(?:ql)?$/,
    error: 'DATABASE_URL must be a valid postgres:// or postgresql:// URL.',
  }),
  DATABASE_POOL_MAX: z.coerce
    .number()
    .int('DATABASE_POOL_MAX must be an integer.')
    .positive('DATABASE_POOL_MAX must be positive.')
    .default(10),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters.'),
  BILLING_PROVIDER: z.enum(['stripe', 'polar'], {
    error: 'BILLING_PROVIDER must be either stripe or polar.',
  }),
  MAILER_PROVIDER: z.enum(['resend', 'smtp'], {
    error: 'MAILER_PROVIDER must be either resend or smtp.',
  }),
  AUTH_GOOGLE_ENABLED: enabledFlagSchema,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_GITHUB_ENABLED: enabledFlagSchema,
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address.'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce
    .number()
    .int('SMTP_PORT must be an integer.')
    .positive('SMTP_PORT must be positive.')
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export const serverEnvSchema = baseServerEnvSchema
  .superRefine((value, context) => {
    const urlResult =
      value.NODE_ENV === 'production'
        ? productionSiteUrlSchema.safeParse(value.NEXT_PUBLIC_SITE_URL)
        : siteUrlSchema.safeParse(value.NEXT_PUBLIC_SITE_URL);

    if (!urlResult.success) {
      for (const issue of urlResult.error.issues) {
        context.addIssue({
          code: 'custom',
          path: ['NEXT_PUBLIC_SITE_URL'],
          message: issue.message,
        });
      }
    }

    if (value.BILLING_PROVIDER === 'stripe') {
      requireField(context, value.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY');
      requireField(context, value.STRIPE_WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET');
    }

    if (value.BILLING_PROVIDER === 'polar') {
      requireField(context, value.POLAR_ACCESS_TOKEN, 'POLAR_ACCESS_TOKEN');
      requireField(context, value.POLAR_WEBHOOK_SECRET, 'POLAR_WEBHOOK_SECRET');
    }

    if (value.MAILER_PROVIDER === 'resend') {
      requireField(context, value.RESEND_API_KEY, 'RESEND_API_KEY');
    }

    if (value.MAILER_PROVIDER === 'smtp') {
      requireField(context, value.SMTP_HOST, 'SMTP_HOST');
      requireField(context, value.SMTP_PORT, 'SMTP_PORT');

      if (hasValue(value.SMTP_USER) !== hasValue(value.SMTP_PASSWORD)) {
        requireField(context, value.SMTP_USER, 'SMTP_USER');
        requireField(context, value.SMTP_PASSWORD, 'SMTP_PASSWORD');
      }
    }

    if (value.AUTH_GOOGLE_ENABLED === 'true') {
      requireField(context, value.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID');
      requireField(context, value.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET');
    }

    if (value.AUTH_GITHUB_ENABLED === 'true') {
      requireField(context, value.GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID');
      requireField(context, value.GITHUB_CLIENT_SECRET, 'GITHUB_CLIENT_SECRET');
    }
  })
  .transform((value) => ({
    ...value,
    authGoogleEnabled: value.AUTH_GOOGLE_ENABLED === 'true',
    authGithubEnabled: value.AUTH_GITHUB_ENABLED === 'true',
  }));

function requireField(
  context: z.RefinementCtx,
  value: string | number | undefined,
  field: string,
): void {
  if (value === undefined || value === '') {
    context.addIssue({
      code: 'custom',
      path: [field],
      message: `${field} is required for the selected configuration.`,
    });
  }
}

function hasValue(value: string | undefined): boolean {
  return value !== undefined && value !== '';
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;
