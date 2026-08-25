import 'server-only';

import { appConfig } from '@repo/config/app';
import { serverEnv } from '@repo/config/env/server';

import { authConfigSchema } from './auth-config.schema';

export const authConfig = authConfigSchema.parse({
  appName: serverEnv.NEXT_PUBLIC_APP_NAME,
  baseURL: serverEnv.NEXT_PUBLIC_SITE_URL,
  basePath: '/api/auth',
  sessionMaxAgeSeconds: 60 * 60 * 24 * 30,
  sessionUpdateAgeSeconds: 60 * 60 * 24,
  sessionFreshAgeSeconds: 60 * 60 * 24,
  magicLinkExpiresInSeconds: 60 * 10,
  emailChangeExpiresInSeconds: 60 * 30,
  rateLimitEnabled: !serverEnv.isCi,
  secureCookies: serverEnv.NODE_ENV === 'production',
  enabledOAuthProviders: [
    ...(appConfig.oauthProviders.google ? (['google'] as const) : []),
    ...(appConfig.oauthProviders.github ? (['github'] as const) : []),
  ],
});
