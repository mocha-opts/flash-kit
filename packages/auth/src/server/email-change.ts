import 'server-only';

import { headers } from 'next/headers';

import { auth } from '#auth';

export type RequestEmailChangeInput = {
  readonly newEmail: string;
  readonly callbackURL: string;
  readonly locale: 'en' | 'zh-CN';
};

/** Invokes the Better Auth custom endpoint; it rechecks the authoritative fresh session. */
export async function requestEmailChange(input: RequestEmailChangeInput) {
  return await auth.api.requestEmailChange({
    headers: await headers(),
    body: input,
  });
}
