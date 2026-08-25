import 'server-only';

import { type AuthUser, getSession } from './get-session';

/** Returns the current Better Auth user without redirecting. */
export async function getUser(): Promise<AuthUser | null> {
  return (await getSession())?.user ?? null;
}
