import { z } from 'zod';

export const authConfigSchema = z.object({
  appName: z.string().min(1),
  baseURL: z.url(),
  basePath: z.literal('/api/auth'),
  sessionMaxAgeSeconds: z.number().int().positive(),
  sessionUpdateAgeSeconds: z.number().int().nonnegative(),
  magicLinkExpiresInSeconds: z.number().int().positive(),
  rateLimitEnabled: z.boolean(),
  secureCookies: z.boolean(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
