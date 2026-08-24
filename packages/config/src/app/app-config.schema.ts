import { z } from 'zod';

import { siteUrlSchema } from '#urls/index';

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

export type AppConfig = z.infer<typeof appConfigSchema>;
