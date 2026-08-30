import 'server-only';

import { deleteUserForAccountDeletion } from '@repo/db/queries/users';
import { headers } from 'next/headers';

import { auth } from '#auth';
import { authConfig } from '#config/auth-config';
import { UnauthenticatedError } from '#internal/auth-errors';

/** Better Auth-compatible code consumed by the application action boundary. */
export class SessionNotFreshError extends Error {
  override readonly name = 'SessionNotFreshError';
  readonly code = 'SESSION_NOT_FRESH';
}

/**
 * Re-reads the authoritative Better Auth session, enforces its configured
 * freshness window, then delegates the deletion itself to the database package.
 */
export async function deleteCurrentUserAccount(expectedUserId: string): Promise<void> {
  const current = await auth.api.getSession({ headers: await headers() });

  if (!current || current.user.id !== expectedUserId) {
    throw new UnauthenticatedError();
  }

  const createdAt = new Date(current.session.createdAt).getTime();
  const freshAgeMilliseconds = authConfig.sessionFreshAgeSeconds * 1000;

  if (!Number.isFinite(createdAt) || Date.now() - createdAt >= freshAgeMilliseconds) {
    throw new SessionNotFreshError('A recent session is required to delete this account.');
  }

  const deleted = await deleteUserForAccountDeletion(current.user.id);

  if (!deleted) {
    throw new UnauthenticatedError();
  }
}
