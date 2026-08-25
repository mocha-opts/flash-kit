import 'server-only';

import { appConfig } from '@repo/config/app';
import { serverEnv } from '@repo/config/env/server';
import type { SocialProviders } from 'better-auth/social-providers';

/**
 * Better Auth social providers for this deployment.
 *
 * `serverEnv` has already completed conditional credential validation before
 * this module can be evaluated. The provider objects are therefore only
 * constructed for enabled providers and their secrets never leave this
 * server-only module.
 */
export const socialProviders = {
  ...(appConfig.oauthProviders.google
    ? {
        google: {
          clientId: getValidatedCredential(serverEnv.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
          clientSecret: getValidatedCredential(
            serverEnv.GOOGLE_CLIENT_SECRET,
            'GOOGLE_CLIENT_SECRET',
          ),
          disableDefaultScope: true,
          scope: ['openid', 'email', 'profile'],
          includeGrantedScopes: false,
          overrideUserInfoOnSignIn: false,
        },
      }
    : {}),
  ...(appConfig.oauthProviders.github
    ? {
        github: {
          clientId: getValidatedCredential(serverEnv.GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID'),
          clientSecret: getValidatedCredential(
            serverEnv.GITHUB_CLIENT_SECRET,
            'GITHUB_CLIENT_SECRET',
          ),
          disableDefaultScope: true,
          scope: ['read:user', 'user:email'],
          overrideUserInfoOnSignIn: false,
        },
      }
    : {}),
} satisfies SocialProviders;

/** Defensive type narrowing for values already required by server-env validation. */
function getValidatedCredential(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`${field} was not available after server env validation.`);
  }

  return value;
}
