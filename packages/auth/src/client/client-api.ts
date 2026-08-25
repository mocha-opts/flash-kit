'use client';

import { clientEnv } from '@repo/config/env/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { getSafeCallbackPath } from '#internal/safe-callback-path';

export const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_SITE_URL,
  basePath: '/api/auth',
  plugins: [magicLinkClient()],
});

export type SignInWithMagicLinkInput = {
  readonly email: string;
  readonly name?: string;
  readonly callbackPath?: string;
};

/** Starts the only T03 browser sign-in method with a sanitized callback path. */
export async function signInWithMagicLink(input: SignInWithMagicLinkInput) {
  return await authClient.signIn.magicLink({
    email: input.email,
    callbackURL: getSafeCallbackPath(input.callbackPath),
    ...(input.name ? { name: input.name } : {}),
  });
}
