import 'server-only';

import { ForbiddenError } from '#internal/auth-errors';

import { requireUser } from './require-user';

/** Returns the current admin user or throws without redirecting. */
export async function requireAdmin(): ReturnType<typeof requireUser> {
  const user = await requireUser();
  const roles = user.role?.split(',').map((role) => role.trim()) ?? [];

  if (!roles.includes('admin')) {
    throw new ForbiddenError();
  }

  return user;
}
