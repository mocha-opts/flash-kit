import 'server-only';

import { parseEnv } from '#internal/parse-env';

import { serverEnv } from '#env/server/index';

import { appConfigSchema } from './app-config.schema';

/** Server-only application configuration parsed from the validated server environment. */
export const appConfig = parseEnv(
  appConfigSchema,
  {
    name: serverEnv.NEXT_PUBLIC_APP_NAME,
    siteUrl: serverEnv.NEXT_PUBLIC_SITE_URL,
    billingProvider: serverEnv.BILLING_PROVIDER,
    mailerProvider: serverEnv.MAILER_PROVIDER,
    oauthProviders: {
      google: serverEnv.authGoogleEnabled,
      github: serverEnv.authGithubEnabled,
    },
  },
  'app config',
);
