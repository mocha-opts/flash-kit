import { z } from 'zod';

import { siteUrlSchema } from '#urls/index';

/** Validates deployment-level application settings derived from server environment variables. */
export const appConfigSchema = z.object({
  name: z.string().min(1),
  siteUrl: siteUrlSchema,
  billingProvider: z.enum(['stripe', 'polar']),
  mailerProvider: z.enum(['resend', 'smtp']),
  oauthProviders: z.object({
    google: z.boolean(),
    github: z.boolean(),
  }),
});

/** Inferred application configuration with a trusted site URL and selected providers. */
export type AppConfig = z.infer<typeof appConfigSchema>;
