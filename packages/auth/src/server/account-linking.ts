import 'server-only';

import { headers } from 'next/headers';

import { auth } from '#auth';
import { authConfig, type AuthOAuthProvider } from '#config/index';

import { getSession } from './get-session';

/** Safe account data needed by the Security account-linking UI. */
export type LinkedAccountSummary = {
  readonly id: string;
  readonly providerId: AuthOAuthProvider;
  readonly canUnlink: boolean;
};

/**
 * Loads only local Better Auth account identifiers and provider ids.
 *
 * Better Auth omits token material from this endpoint's public response, and
 * this mapper additionally excludes account ids, scopes, and every other
 * provider-specific field before data crosses into a Server Component prop.
 */
export async function getLinkedAccountSummaries(): Promise<LinkedAccountSummary[]> {
  if (!(await getSession())) {
    return [];
  }

  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  const canUnlink = accounts.length > 1;

  return accounts.flatMap((account) => {
    if (!isEnabledOAuthProvider(account.providerId)) {
      return [];
    }

    return [
      {
        id: account.id,
        providerId: account.providerId,
        canUnlink,
      },
    ];
  });
}

function isEnabledOAuthProvider(value: string): value is AuthOAuthProvider {
  return authConfig.enabledOAuthProviders.some((provider) => provider === value);
}
