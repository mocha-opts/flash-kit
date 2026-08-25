import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { auth } from '#auth';

const getRequestSession = cache(async () => {
  return await auth.api.getSession({ headers: await headers() });
});

/** Returns the authoritative database session once per React server request. */
export async function getSession(): Promise<Awaited<ReturnType<typeof getRequestSession>>> {
  return await getRequestSession();
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type AuthUser = AuthSession['user'];
