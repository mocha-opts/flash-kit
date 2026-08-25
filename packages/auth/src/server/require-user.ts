import 'server-only';

import { UnauthenticatedError } from '#internal/auth-errors';
import type { AuthUser } from './get-session';
import { getUser } from './get-user';

/** Returns the current user or throws a transport-neutral authentication error. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  return user;
}
