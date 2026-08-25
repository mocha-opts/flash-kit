import 'server-only';

import { sendMagicLinkEmail } from '@repo/email/server';
import { magicLink } from 'better-auth/plugins';

import { authConfig } from '#config/auth-config';
import { createSafeMagicLinkUrl, resolveAuthEmailLocale } from '#internal/magic-link-context';

/** Better Auth Magic Link plugin with hashed, single-use ten-minute tokens. */
export const magicLinkPlugin = magicLink({
  expiresIn: authConfig.magicLinkExpiresInSeconds,
  storeToken: 'hashed',
  allowedAttempts: 1,
  rateLimit: {
    window: 60,
    max: 5,
  },
  sendMagicLink: async ({ email, url }, context) => {
    const safeUrl = createSafeMagicLinkUrl(url, authConfig.baseURL);

    await sendMagicLinkEmail({
      email,
      url: safeUrl,
      expiresInMinutes: authConfig.magicLinkExpiresInSeconds / 60,
      locale: resolveAuthEmailLocale(safeUrl, context?.request),
    });
  },
});
