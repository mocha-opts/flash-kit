import 'server-only';

import { headers } from 'next/headers';

import { auth } from '#auth';

/** Bans a target user through the configured Better Auth Admin Plugin. */
export async function banAdminUser(userId: string): Promise<void> {
  // Better Auth 1.7.1 revokes every target session after setting banned=true.
  await auth.api.banUser({
    headers: await headers(),
    body: { userId },
  });
}

/** Removes the Better Auth ban from a target user. */
export async function unbanAdminUser(userId: string): Promise<void> {
  await auth.api.unbanUser({
    headers: await headers(),
    body: { userId },
  });
}

/** Revokes every Better Auth session owned by a target user. */
export async function revokeAdminUserSessions(userId: string): Promise<void> {
  await auth.api.revokeUserSessions({
    headers: await headers(),
    body: { userId },
  });
}
