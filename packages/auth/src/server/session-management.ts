import 'server-only';

import { headers } from 'next/headers';

import { auth } from '#auth';

/** Revokes a session token owned by the authenticated user. */
export async function revokeSession(sessionToken: string) {
  return await auth.api.revokeSession({
    headers: await headers(),
    body: { token: sessionToken },
  });
}

/** Revokes every session except the authenticated request's current session. */
export async function revokeOtherSessions() {
  return await auth.api.revokeOtherSessions({ headers: await headers() });
}
