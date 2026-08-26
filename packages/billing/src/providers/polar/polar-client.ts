import 'server-only';

import { Polar } from '@polar-sh/sdk';
import { serverEnv } from '@repo/config/env/server';

/**
 * Creates the only Polar SDK client used by this package.
 *
 * Polar's SDK supports a retry policy and may fall back to a retry strategy
 * when one is not supplied. Keep the policy explicit at the construction seam
 * so a future SDK default cannot introduce retries into a user action.
 */
export function createPolarClient(): Polar {
  const accessToken = serverEnv.POLAR_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is required when Polar billing is selected.');
  }

  return new Polar({
    accessToken,
    retryConfig: { strategy: 'none' },
  });
}
