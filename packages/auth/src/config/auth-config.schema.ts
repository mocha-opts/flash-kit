import { z } from 'zod';

/** OAuth providers supported by this deployment contract. */
export const authOAuthProviderSchema = z.enum(['google', 'github']);

export type AuthOAuthProvider = z.infer<typeof authOAuthProviderSchema>;

export const authConfigSchema = z.object({
  appName: z.string().min(1),
  baseURL: z.url(),
  basePath: z.literal('/api/auth'),
  sessionMaxAgeSeconds: z.number().int().positive(),
  sessionUpdateAgeSeconds: z.number().int().nonnegative(),
  magicLinkExpiresInSeconds: z.number().int().positive(),
  rateLimitEnabled: z.boolean(),
  secureCookies: z.boolean(),
  /** Providers whose credentials passed server-env validation and are enabled. */
  enabledOAuthProviders: authOAuthProviderSchema.array().readonly(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
