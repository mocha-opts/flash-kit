'use client';

import { clientEnv } from '@repo/config/env/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { getSafeCallbackPath } from '#internal/safe-callback-path';

const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_SITE_URL,
  basePath: '/api/auth',
  plugins: [magicLinkClient()],
});

/** Provider ids exposed to browser UI; provider credentials stay server-only. */
export type OAuthProvider = 'google' | 'github';

export type SignInWithMagicLinkInput = {
  readonly email: string;
  readonly name?: string;
  readonly callbackPath?: string;
};

/** Starts Magic Link sign-in with a sanitized callback path. */
export async function signInWithMagicLink(input: SignInWithMagicLinkInput) {
  return await authClient.signIn.magicLink({
    email: input.email,
    callbackURL: getSafeCallbackPath(input.callbackPath),
    ...(input.name ? { name: input.name } : {}),
  });
}

export type SignInWithSocialInput = {
  readonly provider: OAuthProvider;
  readonly callbackPath?: string;
  readonly errorCallbackPath?: string;
};

/** Starts a configured social sign-in without exposing provider credentials. */
export async function signInWithSocial(input: SignInWithSocialInput) {
  return await authClient.signIn.social({
    provider: input.provider,
    callbackURL: getSafeCallbackPath(input.callbackPath),
    errorCallbackURL: getSafeCallbackPath(input.errorCallbackPath, '/auth/sign-in'),
  });
}

export type LinkSocialAccountInput = {
  readonly provider: OAuthProvider;
  readonly callbackPath?: string;
  readonly errorCallbackPath?: string;
};

/** Starts explicit account linking for a configured social provider. */
export async function linkSocialAccount(input: LinkSocialAccountInput) {
  return await authClient.linkSocial({
    provider: input.provider,
    callbackURL: getSafeCallbackPath(input.callbackPath, '/settings/security'),
    errorCallbackURL: getSafeCallbackPath(input.errorCallbackPath, '/settings/security'),
  });
}

/** Unlinks one local Better Auth account id after server-side ownership checks. */
export async function unlinkAccount(accountId: string) {
  return await authClient.unlinkAccount({ accountId });
}
