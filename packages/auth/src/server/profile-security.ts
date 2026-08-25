import 'server-only';

import {
  listActiveUserSessions,
  revokeOtherUserSessions,
  revokeUserSession,
  type UserSessionRecord,
  updateUserDisplayName,
} from '@repo/db/queries/users';

import { UnauthenticatedError } from '#internal/auth-errors';

import { getSession } from './get-session';

export type CurrentProfile = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image: string | null;
};

/** Session data safe to cross a Server Component -> Client Component boundary. */
export type SessionView = {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly isCurrent: boolean;
};

/** Returns the current Better Auth user without exposing account/session secrets. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const current = await getSession();
  if (!current) return null;

  return toCurrentProfile(current.user);
}

/** Updates only the current Better Auth user's display name. */
export async function updateCurrentDisplayName(name: string): Promise<CurrentProfile> {
  const current = await requireCurrentSession();
  const normalizedName = name.trim();
  const updated = await updateUserDisplayName(current.user.id, normalizedName);
  if (!updated) throw new UnauthenticatedError();

  return {
    ...toCurrentProfile(current.user),
    name: normalizedName,
  };
}

/** Lists active current-user sessions as a serializable view model; tokens stay server-only. */
export async function listCurrentSessions(): Promise<SessionView[]> {
  const current = await requireCurrentSession();
  const sessions = await listActiveUserSessions(current.user.id);

  return sessions.map((session) => toSessionView(session, current.session.id));
}

/** Revokes a selected session after a SQL ownership check and reports current-session revocation. */
export async function revokeCurrentSession(sessionId: string): Promise<{
  readonly revoked: boolean;
  readonly currentSessionRevoked: boolean;
}> {
  const current = await requireCurrentSession();
  const revoked = await revokeUserSession(current.user.id, sessionId);
  return {
    revoked,
    currentSessionRevoked: revoked && sessionId === current.session.id,
  };
}

/** Revokes every current-user session except the trusted session handling this request. */
export async function revokeCurrentOtherSessions(): Promise<{ readonly revokedCount: number }> {
  const current = await requireCurrentSession();
  const revokedCount = await revokeOtherUserSessions(current.user.id, current.session.token);

  return { revokedCount };
}

async function requireCurrentSession() {
  const current = await getSession();
  if (!current) throw new UnauthenticatedError();
  return current;
}

function toCurrentProfile(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null | undefined;
}): CurrentProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
  };
}

function toSessionView(session: UserSessionRecord, currentSessionId: string): SessionView {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    updatedAt: (session.updatedAt ?? session.createdAt).toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isCurrent: session.id === currentSessionId,
  };
}
