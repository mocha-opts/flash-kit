import 'server-only';

import type { BetterAuthOptions } from 'better-auth';

import { authConfig } from '#config/auth-config';

/** Shared database-backed rate-limit policy; CI disables it for deterministic checks. */
export const authRateLimit = {
  enabled: authConfig.rateLimitEnabled,
  storage: 'database',
  window: 60 * 5,
  max: 200,
} satisfies BetterAuthOptions['rateLimit'];
