import type { Logger } from '@better-auth/core/env';

/**
 * Better Auth can attach provider errors and request values to its default logs.
 * Keep authentication logs useful as a health signal without forwarding messages,
 * errors, headers, tokens, callback URLs, or user input.
 */
export const safeAuthLogger = {
  level: 'warn',
  log(level) {
    if (level === 'error') {
      console.error('Authentication request failed.');
      return;
    }

    console.warn('Authentication request warning.');
  },
} satisfies Logger;
